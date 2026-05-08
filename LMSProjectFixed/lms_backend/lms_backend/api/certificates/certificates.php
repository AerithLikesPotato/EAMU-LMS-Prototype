<?php
// ============================================================
// CERTIFICATES API  —  /api/certificates/certificates.php
// GET  ?action=list                    → all certificates (admin)
// GET  ?action=mine&stu_id=X           → student's certificates
// GET  ?action=get&id=X                → single certificate detail
// POST ?action=generate                → manually generate certificate (admin)
// POST ?action=revoke&id=X             → revoke certificate (admin)
// GET  ?action=verify&code=CERT-XXX    → verify certificate by code (public)
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'list':
        requireAdmin();
        $stmt = $db->query("
            SELECT ct.*, s.Stu_Name, s.Stu_Email, c.Course_Title
            FROM Certificate ct
            JOIN Student s ON s.Stu_ID = ct.Stu_ID
            JOIN Course c ON c.Course_ID = ct.Course_ID
            ORDER BY ct.Issue_Date DESC
        ");
        sendSuccess($stmt->fetchAll());
        break;

    case 'mine':
        requireAuth();
        $stu_id = $input['stu_id'] ?? null;
        if (!$stu_id) sendError('stu_id required.');
        $stmt = $db->prepare("
            SELECT ct.*, c.Course_Title, l.Lec_Name
            FROM Certificate ct
            JOIN Course c ON c.Course_ID = ct.Course_ID
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            WHERE ct.Stu_ID = ?
            ORDER BY ct.Issue_Date DESC
        ");
        $stmt->execute([$stu_id]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Certificate ID required.');
        $stmt = $db->prepare("
            SELECT ct.*, s.Stu_Name, c.Course_Title, l.Lec_Name
            FROM Certificate ct
            JOIN Student s ON s.Stu_ID = ct.Stu_ID
            JOIN Course c ON c.Course_ID = ct.Course_ID
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            WHERE ct.Cert_ID = ?
        ");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) sendError('Certificate not found.', 404);
        sendSuccess($row);
        break;

    case 'auto_generate':
        // Called automatically when student completes all lessons + tasks
        requireAuth();
        $stu_id    = $input['Stu_ID']    ?? null;
        $course_id = $input['Course_ID'] ?? null;
        if (!$stu_id || !$course_id) sendError('Stu_ID and Course_ID required.');

        // Verify student actually completed all lessons
        $total = $db->prepare("SELECT COUNT(*) FROM Lesson WHERE Course_ID = ?");
        $total->execute([$course_id]);
        $totalLessons = (int)$total->fetchColumn();

        $done = $db->prepare("SELECT COUNT(*) FROM Progress WHERE Stu_ID = ? AND Course_ID = ? AND Status = 'completed'");
        $done->execute([$stu_id, $course_id]);
        $doneLessons = (int)$done->fetchColumn();

        if ($totalLessons > 0 && $doneLessons < $totalLessons) {
            sendError('Course not fully completed yet.');
        }

        // Check if certificate already exists
        $existing = $db->prepare("SELECT Cert_ID, Cert_Code FROM Certificate WHERE Stu_ID = ? AND Course_ID = ? AND Cert_Status = 'active'");
        $existing->execute([$stu_id, $course_id]);
        $existingCert = $existing->fetch();
        if ($existingCert) {
            sendSuccess(['Cert_Code' => $existingCert['Cert_Code'], 'Cert_ID' => $existingCert['Cert_ID']], 'Certificate already issued.');
        }

        $certCode = 'CERT-' . date('Y') . '-' . strtoupper(substr(md5(uniqid()), 0, 8));

        try {
            $stmt = $db->prepare("INSERT INTO Certificate (Cert_Code, Stu_ID, Course_ID) VALUES (?, ?, ?)");
            $stmt->execute([$certCode, $stu_id, $course_id]);
            $certId = $db->lastInsertId();
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) {
                // Race condition: cert was just created, fetch and return it
                $existing->execute([$stu_id, $course_id]);
                $existingCert = $existing->fetch();
                sendSuccess(['Cert_Code' => $existingCert['Cert_Code'], 'Cert_ID' => $existingCert['Cert_ID']], 'Certificate already issued.');
            }
            throw $e;
        }

        // Mark enrollment as completed
        $db->prepare("UPDATE Enrollment SET Enroll_Status = 'completed' WHERE Stu_ID = ? AND Course_ID = ?")->execute([$stu_id, $course_id]);

        // Notify student
        $db->prepare("INSERT INTO Notification (Notif_Title, Notif_Desc, Notif_Type, Recipient_Type, Recipient_ID)
            VALUES ('Certificate Issued', ?, 'success', 'student', ?)")
            ->execute(['Congratulations! Your certificate has been issued. Code: ' . $certCode, $stu_id]);

        sendSuccess(['Cert_Code' => $certCode, 'Cert_ID' => $certId], 'Certificate generated.');
        break;

    case 'generate':
        requireAdmin();
        $stu_id    = $input['Stu_ID']    ?? null;
        $course_id = $input['Course_ID'] ?? null;
        if (!$stu_id || !$course_id) sendError('Stu_ID and Course_ID required.');

        $certCode = 'CERT-' . date('Y') . '-' . strtoupper(substr(md5(uniqid()), 0, 8));

        try {
            $stmt = $db->prepare("INSERT INTO Certificate (Cert_Code, Stu_ID, Course_ID) VALUES (?, ?, ?)");
            $stmt->execute([$certCode, $stu_id, $course_id]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) sendError('Certificate already issued.');
            throw $e;
        }

        // Notify student
        $notif = $db->prepare("
            INSERT INTO Notification (Notif_Title, Notif_Desc, Notif_Type, Recipient_Type, Recipient_ID)
            VALUES ('Certificate Issued', 'Your certificate has been issued. Code: $certCode', 'success', 'student', ?)
        ");
        $notif->execute([$stu_id]);

        sendSuccess(['Cert_Code' => $certCode, 'Cert_ID' => $db->lastInsertId()], 'Certificate generated.');
        break;

    case 'revoke':
        requireAdmin();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Certificate ID required.');
        $db->prepare("UPDATE Certificate SET Cert_Status = 'revoked' WHERE Cert_ID = ?")->execute([$id]);
        sendSuccess(null, 'Certificate revoked.');
        break;

    case 'verify':
        // Public endpoint — no auth needed
        $code = $input['code'] ?? null;
        if (!$code) sendError('Certificate code required.');
        $stmt = $db->prepare("
            SELECT ct.*, s.Stu_Name, c.Course_Title
            FROM Certificate ct
            JOIN Student s ON s.Stu_ID = ct.Stu_ID
            JOIN Course c ON c.Course_ID = ct.Course_ID
            WHERE ct.Cert_Code = ?
        ");
        $stmt->execute([$code]);
        $row = $stmt->fetch();
        if (!$row) sendError('Certificate not found or invalid.', 404);
        sendSuccess([
            'valid'        => $row['Cert_Status'] === 'active',
            'student_name' => $row['Stu_Name'],
            'course_title' => $row['Course_Title'],
            'issue_date'   => $row['Issue_Date'],
            'status'       => $row['Cert_Status'],
        ]);
        break;

    default:
        sendError('Unknown action.', 404);
}
