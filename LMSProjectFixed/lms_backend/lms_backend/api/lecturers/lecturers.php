<?php
// ============================================================
// LECTURERS API  —  /api/lecturers/lecturers.php
// GET  ?action=list
// GET  ?action=get&id=X
// POST ?action=create
// POST ?action=update&id=X
// POST ?action=delete&id=X
// GET  ?action=courses&id=X   → courses by this lecturer
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'list':
        requireAuth();
        $stmt = $db->query("SELECT Lec_ID, Lec_Name, Lec_Gender, Lec_Subject, Lec_Phone, Lec_Email, Lec_Status, Created_At FROM Lecturer ORDER BY Lec_Name");
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id   = $input['id'] ?? null;
        if (!$id) sendError('Lecturer ID required.');
        $stmt = $db->prepare("SELECT Lec_ID, Lec_Name, Lec_Gender, Lec_Subject, Lec_Phone, Lec_Email, Lec_Status, Created_At FROM Lecturer WHERE Lec_ID = ?");
        $stmt->execute([$id]);
        $row  = $stmt->fetch();
        if (!$row) sendError('Lecturer not found.', 404);
        sendSuccess($row);
        break;

    case 'create':
        requireAdmin();
        $name     = trim($input['Lec_Name']    ?? '');
        $email    = trim($input['Lec_Email']   ?? '');
        $password = $input['password']          ?? 'changeme123';
        $gender   = $input['Lec_Gender']        ?? null;
        $subject  = $input['Lec_Subject']       ?? null;
        $phone    = $input['Lec_Phone']         ?? null;
        $status   = $input['Lec_Status']        ?? 'active';

        if (!$name || !$email) sendError('Name and email are required.');

        $hash = password_hash($password, PASSWORD_BCRYPT);
        try {
            $stmt = $db->prepare("
                INSERT INTO Lecturer (Lec_Name, Lec_Email, Lec_Password, Lec_Gender, Lec_Subject, Lec_Phone, Lec_Status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$name, $email, $hash, $gender, $subject, $phone, $status]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) sendError('Email already exists.');
            throw $e;
        }
        sendSuccess(['Lec_ID' => $db->lastInsertId()], 'Lecturer created.');
        break;

    case 'update':
        requireAdmin();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Lecturer ID required.');

        $fields = [];
        $values = [];
        foreach (['Lec_Name','Lec_Gender','Lec_Subject','Lec_Phone','Lec_Email','Lec_Status'] as $col) {
            if (isset($input[$col])) {
                $fields[] = "$col = ?";
                $values[] = $input[$col];
            }
        }
        if (isset($input['password'])) {
            $fields[] = "Lec_Password = ?";
            $values[] = password_hash($input['password'], PASSWORD_BCRYPT);
        }
        if (empty($fields)) sendError('No fields to update.');

        $values[] = $id;
        $db->prepare("UPDATE Lecturer SET " . implode(', ', $fields) . " WHERE Lec_ID = ?")->execute($values);
        sendSuccess(null, 'Lecturer updated.');
        break;

    case 'delete':
        requireAdmin();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Lecturer ID required.');
        $db->prepare("DELETE FROM Lecturer WHERE Lec_ID = ?")->execute([$id]);
        sendSuccess(null, 'Lecturer deleted.');
        break;

    case 'courses':
        requireAuth();
        $id   = $input['id'] ?? null;
        if (!$id) sendError('Lecturer ID required.');
        $stmt = $db->prepare("
            SELECT c.*, 
                   (SELECT COUNT(*) FROM Enrollment e WHERE e.Course_ID = c.Course_ID) AS Enrolled_Count
            FROM Course c
            WHERE c.Lec_ID = ?
            ORDER BY c.Created_At DESC
        ");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetchAll());
        break;

    default:
        sendError('Unknown action.', 404);
}
