<?php
// ============================================================
// ENROLLMENT API  —  /api/enrollment/enrollment.php
// POST ?action=enroll              → enroll student in course
// POST ?action=drop&id=X           → drop enrollment
// POST ?action=complete&id=X       → mark enrollment completed
// GET  ?action=check               → check if student is enrolled
// GET  ?action=list&student_id=X   → all enrollments for a student
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'enroll':
        requireAuth();
        $stu_id    = $input['Stu_ID']    ?? null;
        $course_id = $input['Course_ID'] ?? null;
        if (!$stu_id || !$course_id) sendError('Student ID and Course ID required.');

        try {
            $stmt = $db->prepare("INSERT INTO Enrollment (Stu_ID, Course_ID) VALUES (?, ?)");
            $stmt->execute([$stu_id, $course_id]);
            $enrollId = $db->lastInsertId();
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) sendError('Already enrolled in this course.');
            throw $e;
        }

        // Notify student
        $notif = $db->prepare("
            INSERT INTO Notification (Notif_Title, Notif_Desc, Notif_Type, Recipient_Type, Recipient_ID)
            VALUES ('Enrollment Confirmed', 'You have been enrolled in a new course.', 'success', 'student', ?)
        ");
        $notif->execute([$stu_id]);

        sendSuccess(['Enroll_ID' => $enrollId], 'Enrolled successfully.');
        break;

    case 'drop':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Enrollment ID required.');
        $db->prepare("UPDATE Enrollment SET Enroll_Status = 'dropped' WHERE Enroll_ID = ?")->execute([$id]);
        sendSuccess(null, 'Enrollment dropped.');
        break;

    case 'complete':
        requireAdmin();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Enrollment ID required.');

        // Mark completed
        $db->prepare("UPDATE Enrollment SET Enroll_Status = 'completed' WHERE Enroll_ID = ?")->execute([$id]);

        // Auto-generate certificate
        $row = $db->prepare("SELECT * FROM Enrollment WHERE Enroll_ID = ?");
        $row->execute([$id]);
        $enroll = $row->fetch();

        if ($enroll) {
            $certCode = 'CERT-' . date('Y') . '-' . strtoupper(substr(md5(uniqid()), 0, 8));
            $cert = $db->prepare("
                INSERT INTO Certificate (Cert_Code, Stu_ID, Course_ID)
                VALUES (?, ?, ?)
            ");
            $cert->execute([$certCode, $enroll['Stu_ID'], $enroll['Course_ID']]);

            $notif = $db->prepare("
                INSERT INTO Notification (Notif_Title, Notif_Desc, Notif_Type, Recipient_Type, Recipient_ID)
                VALUES ('Certificate Issued', 'Congratulations! Your certificate has been issued.', 'success', 'student', ?)
            ");
            $notif->execute([$enroll['Stu_ID']]);
        }

        sendSuccess(null, 'Marked as completed and certificate issued.');
        break;

    case 'check':
        requireAuth();
        $stu_id    = $input['Stu_ID']    ?? null;
        $course_id = $input['Course_ID'] ?? null;
        if (!$stu_id || !$course_id) sendError('Student ID and Course ID required.');
        $stmt = $db->prepare("SELECT * FROM Enrollment WHERE Stu_ID = ? AND Course_ID = ?");
        $stmt->execute([$stu_id, $course_id]);
        $row = $stmt->fetch();
        sendSuccess(['enrolled' => (bool)$row, 'enrollment' => $row]);
        break;

    case 'list':
        requireAuth();
        $stu_id = $input['student_id'] ?? null;
        if (!$stu_id) sendError('Student ID required.');
        $stmt = $db->prepare("
            SELECT e.*, c.Course_Title, c.Course_Image, l.Lec_Name,
                   (SELECT COUNT(*) FROM Lesson ls WHERE ls.Course_ID = c.Course_ID) AS Total_Lessons,
                   (SELECT COUNT(*) FROM Progress p WHERE p.Stu_ID = e.Stu_ID AND p.Course_ID = c.Course_ID AND p.Status = 'completed') AS Completed_Lessons
            FROM Enrollment e
            JOIN Course c ON c.Course_ID = e.Course_ID
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            WHERE e.Stu_ID = ?
            ORDER BY e.Enroll_Date DESC
        ");
        $stmt->execute([$stu_id]);
        sendSuccess($stmt->fetchAll());
        break;

    default:
        sendError('Unknown action.', 404);
}
