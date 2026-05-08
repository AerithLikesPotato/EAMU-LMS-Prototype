<?php
// ============================================================
// COURSES API  —  /api/courses/courses.php
// GET  ?action=list                 → all courses
// GET  ?action=get&id=X             → single course + lessons
// POST ?action=create               → create course (admin)
// POST ?action=update&id=X          → update course (admin)
// POST ?action=delete&id=X          → delete course (admin)
// GET  ?action=students&id=X        → enrolled students for a course
// GET  ?action=dashboard            → admin dashboard stats
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'list':
        $user = requireAuth();
        // Admin and lecturer see all courses; students only see active
        $whereClause = ($user['role'] === 'admin' || $user['role'] === 'lecturer') ? '' : "WHERE c.Course_Status = 'active'";
        $stmt = $db->query("
            SELECT c.*, l.Lec_Name,
                   (SELECT COUNT(*) FROM Lesson ls WHERE ls.Course_ID = c.Course_ID) AS Lesson_Count,
                   (SELECT COUNT(*) FROM Enrollment e WHERE e.Course_ID = c.Course_ID) AS Student_Count
            FROM Course c
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            $whereClause
            ORDER BY c.Created_At DESC
        ");
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Course ID required.');

        $stmt = $db->prepare("
            SELECT c.*, l.Lec_Name, l.Lec_Email, l.Lec_Subject
            FROM Course c
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            WHERE c.Course_ID = ?
        ");
        $stmt->execute([$id]);
        $course = $stmt->fetch();
        if (!$course) sendError('Course not found.', 404);

        // Attach lessons
        $lStmt = $db->prepare("SELECT * FROM Lesson WHERE Course_ID = ? ORDER BY Lesson_Order ASC");
        $lStmt->execute([$id]);
        $course['lessons'] = $lStmt->fetchAll();

        sendSuccess($course);
        break;

    case 'create':
        requireAdminOrLecturer();
        $title       = trim($input['Course_Title'] ?? '');
        $desc        = $input['Course_Desc']        ?? null;
        $module      = $input['Course_Module']      ?? null;
        $assigned    = $input['Course_Assigned_Date'] ?? null;
        $accessed    = $input['Course_Accessed_Date'] ?? null;
        $due         = $input['Course_Due_Date']    ?? null;
        $image       = $input['Course_Image']       ?? null;
        $lec_id      = $input['Lec_ID']             ?? null;
        $status      = $input['Course_Status']      ?? 'active';

        if (!$title || !$lec_id) sendError('Title and Lecturer ID are required.');

        $stmt = $db->prepare("
            INSERT INTO Course (Course_Title, Course_Desc, Course_Module, Course_Assigned_Date, Course_Accessed_Date, Course_Due_Date, Course_Image, Course_Status, Lec_ID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $desc, $module, $assigned, $accessed, $due, $image, $status, $lec_id]);
        sendSuccess(['Course_ID' => $db->lastInsertId()], 'Course created.');
        break;

    case 'update':
        requireAdminOrLecturer();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Course ID required.');

        $fields = [];
        $values = [];
        $allowed = ['Course_Title','Course_Desc','Course_Module','Course_Assigned_Date','Course_Accessed_Date','Course_Due_Date','Course_Image','Course_Status','Lec_ID'];
        foreach ($allowed as $col) {
            if (isset($input[$col])) {
                $fields[] = "$col = ?";
                $values[] = $input[$col];
            }
        }
        if (empty($fields)) sendError('No fields to update.');
        $values[] = $id;
        $db->prepare("UPDATE Course SET " . implode(', ', $fields) . " WHERE Course_ID = ?")->execute($values);
        sendSuccess(null, 'Course updated.');
        break;

    case 'delete':
        requireAdminOrLecturer();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Course ID required.');
        $db->prepare("DELETE FROM Course WHERE Course_ID = ?")->execute([$id]);
        sendSuccess(null, 'Course deleted.');
        break;

    case 'students':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Course ID required.');
        $stmt = $db->prepare("
            SELECT s.Stu_ID, s.Stu_Name, s.Stu_Email, s.Stu_Major, e.Enroll_Date, e.Enroll_Status
            FROM Enrollment e
            JOIN Student s ON s.Stu_ID = e.Stu_ID
            WHERE e.Course_ID = ?
            ORDER BY s.Stu_Name
        ");
        $stmt->execute([$id]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'dashboard':
        requireAdminOrLecturer();
        $stats = [];
        $stats['total_students']  = $db->query("SELECT COUNT(*) FROM Student")->fetchColumn();
        $stats['total_lecturers'] = $db->query("SELECT COUNT(*) FROM Lecturer")->fetchColumn();
        $stats['total_courses']   = $db->query("SELECT COUNT(*) FROM Course")->fetchColumn();
        $stats['total_lessons']   = $db->query("SELECT COUNT(*) FROM Lesson")->fetchColumn();
        $stats['total_enrollments'] = $db->query("SELECT COUNT(*) FROM Enrollment")->fetchColumn();
        $stats['completed_courses'] = $db->query("SELECT COUNT(*) FROM Enrollment WHERE Enroll_Status = 'completed'")->fetchColumn();
        $stats['certificates_issued'] = $db->query("SELECT COUNT(*) FROM Certificate")->fetchColumn();

        // Recent enrollments
        $stmt = $db->query("
            SELECT s.Stu_Name, c.Course_Title, e.Enroll_Date
            FROM Enrollment e
            JOIN Student s ON s.Stu_ID = e.Stu_ID
            JOIN Course c ON c.Course_ID = e.Course_ID
            ORDER BY e.Enroll_Date DESC LIMIT 5
        ");
        $stats['recent_enrollments'] = $stmt->fetchAll();

        sendSuccess($stats);
        break;

    default:
        sendError('Unknown action.', 404);
}
