<?php
// ============================================================
// STUDENTS API  —  /api/students/students.php
// GET    ?action=list               → all students (admin)
// GET    ?action=get&id=X           → single student
// POST   ?action=create             → create student (admin)
// POST   ?action=update&id=X        → update student
// POST   ?action=delete&id=X        → delete student (admin)
// GET    ?action=courses&id=X       → enrolled courses for student
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'list':
        requireAdmin();
        $stmt = $db->query("SELECT Stu_ID, Stu_Name, Stu_Gender, Stu_Major, Stu_Year, Stu_DOB, Stu_Phone, Stu_Email, Stu_Status, Created_At FROM Student ORDER BY Stu_Name");
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id   = $input['id'] ?? null;
        if (!$id) sendError('Student ID required.');
        $stmt = $db->prepare("SELECT Stu_ID, Stu_Name, Stu_Gender, Stu_Major, Stu_Year, Stu_DOB, Stu_Phone, Stu_Email, Stu_Status, Created_At FROM Student WHERE Stu_ID = ?");
        $stmt->execute([$id]);
        $row  = $stmt->fetch();
        if (!$row) sendError('Student not found.', 404);
        sendSuccess($row);
        break;

    case 'create':
        requireAdmin();
        $id       = $input['Stu_ID']     ?? null;
        $name     = trim($input['Stu_Name']   ?? '');
        $email    = trim($input['Stu_Email']  ?? '');
        $password = $input['password']        ?? 'changeme123';
        $gender   = $input['Stu_Gender']      ?? null;
        $major    = $input['Stu_Major']       ?? null;
        $year     = $input['Stu_Year']        ?? null;
        $dob      = $input['Stu_DOB']         ?? null;
        $phone    = $input['Stu_Phone']       ?? null;
        $status   = $input['Stu_Status']      ?? 'active';

        if (!$id || !$name || !$email) sendError('ID, name and email are required.');

        $hash = password_hash($password, PASSWORD_BCRYPT);
        try {
            $stmt = $db->prepare("
                INSERT INTO Student (Stu_ID, Stu_Name, Stu_Email, Stu_Password, Stu_Gender, Stu_Major, Stu_Year, Stu_DOB, Stu_Phone, Stu_Status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$id, $name, $email, $hash, $gender, $major, $year, $dob, $phone, $status]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) sendError('Student ID or email already exists.');
            throw $e;
        }
        sendSuccess(['Stu_ID' => $id], 'Student created.');
        break;

    case 'update':
        requireAuth();
        $id     = $input['id'] ?? null;
        if (!$id) sendError('Student ID required.');

        $fields = [];
        $values = [];

        foreach (['Stu_Name','Stu_Gender','Stu_Major','Stu_Year','Stu_DOB','Stu_Phone','Stu_Email','Stu_Status'] as $col) {
            if (isset($input[$col])) {
                $fields[] = "$col = ?";
                $values[] = $input[$col];
            }
        }
        if (isset($input['password'])) {
            $fields[] = "Stu_Password = ?";
            $values[] = password_hash($input['password'], PASSWORD_BCRYPT);
        }
        if (empty($fields)) sendError('No fields to update.');

        $values[] = $id;
        $db->prepare("UPDATE Student SET " . implode(', ', $fields) . " WHERE Stu_ID = ?")->execute($values);
        sendSuccess(null, 'Student updated.');
        break;

    case 'delete':
        requireAdmin();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Student ID required.');
        $db->prepare("DELETE FROM Student WHERE Stu_ID = ?")->execute([$id]);
        sendSuccess(null, 'Student deleted.');
        break;

    case 'courses':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Student ID required.');
        $stmt = $db->prepare("
            SELECT c.*, l.Lec_Name, e.Enroll_Date, e.Enroll_Status
            FROM Enrollment e
            JOIN Course c ON c.Course_ID = e.Course_ID
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            WHERE e.Stu_ID = ?
            ORDER BY e.Enroll_Date DESC
        ");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetchAll());
        break;

    default:
        sendError('Unknown action.', 404);
}
