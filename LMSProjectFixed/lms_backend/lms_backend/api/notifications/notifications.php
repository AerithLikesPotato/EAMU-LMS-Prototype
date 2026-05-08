<?php
// ============================================================
// NOTIFICATIONS API
// GET  ?action=list&recipient_id=X&role=Y    → user notifications
// GET  ?action=unread_count&recipient_id=X&role=Y
// GET  ?action=admin_activity                → recent system activity for admin
// POST ?action=mark_read&id=X
// POST ?action=mark_all_read
// POST ?action=delete
// POST ?action=clear_all
// POST ?action=create  (admin)
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'list':
        requireAuth();
        $rid  = $input['recipient_id'] ?? null;
        $role = $input['role']         ?? 'student';
        if (!$rid) sendError('recipient_id required.');

        $stmt = $db->prepare("
            SELECT * FROM Notification
            WHERE (Recipient_Type = 'all') OR (Recipient_Type = ? AND Recipient_ID = ?)
            ORDER BY Created_At DESC
            LIMIT 50
        ");
        $stmt->execute([$role, $rid]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'admin_activity':
        requireAuth();
        // Build a unified activity feed from real DB data
        $activities = [];

        // Recent enrollments
        $stmt = $db->query("
            SELECT e.Enroll_Date AS act_time, s.Stu_Name, c.Course_Title,
                   'enrollment' AS act_type,
                   CONCAT(s.Stu_Name, ' enrolled in ', c.Course_Title) AS act_text
            FROM Enrollment e
            JOIN Student s ON s.Stu_ID = e.Stu_ID
            JOIN Course  c ON c.Course_ID = e.Course_ID
            ORDER BY e.Enroll_Date DESC LIMIT 15
        ");
        foreach ($stmt->fetchAll() as $r) $activities[] = $r;

        // Recent submissions
        $stmt = $db->query("
            SELECT sb.Subm_Date AS act_time, s.Stu_Name, a.Assign_Title,
                   'submission' AS act_type,
                   CONCAT(s.Stu_Name, ' submitted ', a.Assign_Title,
                          IF(sb.Subm_Score IS NOT NULL, CONCAT(' — Score: ', sb.Subm_Score, '%'), '')) AS act_text
            FROM Submission sb
            JOIN Student    s  ON s.Stu_ID    = sb.Stu_ID
            JOIN Assignment a  ON a.Assign_ID = sb.Assign_ID
            ORDER BY sb.Subm_Date DESC LIMIT 15
        ");
        foreach ($stmt->fetchAll() as $r) $activities[] = $r;

        // Course completions / certificates
        $stmt = $db->query("
            SELECT ct.Issued_Date AS act_time, s.Stu_Name, c.Course_Title,
                   'completion' AS act_type,
                   CONCAT(s.Stu_Name, ' completed ', c.Course_Title) AS act_text
            FROM Certificate ct
            JOIN Student s ON s.Stu_ID    = ct.Stu_ID
            JOIN Course  c ON c.Course_ID = ct.Course_ID
            ORDER BY ct.Issued_Date DESC LIMIT 15
        ");
        foreach ($stmt->fetchAll() as $r) $activities[] = $r;

        // New student registrations
        $stmt = $db->query("
            SELECT s.Created_At AS act_time, s.Stu_Name, '' AS Course_Title,
                   'registration' AS act_type,
                   CONCAT(s.Stu_Name, ' registered as a new student') AS act_text
            FROM Student s
            ORDER BY s.Created_At DESC LIMIT 10
        ");
        foreach ($stmt->fetchAll() as $r) $activities[] = $r;

        // Sort all by time desc
        usort($activities, function($a, $b) {
            return strtotime($b['act_time']) - strtotime($a['act_time']);
        });

        sendSuccess(array_slice($activities, 0, 40));
        break;

    case 'unread_count':
        requireAuth();
        $rid  = $input['recipient_id'] ?? null;
        $role = $input['role']         ?? 'student';
        if (!$rid) sendError('recipient_id required.');

        $stmt = $db->prepare("
            SELECT COUNT(*) FROM Notification
            WHERE Is_Read = 0
              AND ((Recipient_Type = 'all') OR (Recipient_Type = ? AND Recipient_ID = ?))
        ");
        $stmt->execute([$role, $rid]);
        sendSuccess(['count' => (int)$stmt->fetchColumn()]);
        break;

    case 'mark_read':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Notification ID required.');
        $db->prepare("UPDATE Notification SET Is_Read = 1 WHERE Notif_ID = ?")->execute([$id]);
        sendSuccess(null, 'Marked as read.');
        break;

    case 'mark_all_read':
        requireAuth();
        $rid  = $input['recipient_id'] ?? null;
        $role = $input['role']         ?? 'student';
        if (!$rid) sendError('recipient_id required.');
        $db->prepare("UPDATE Notification SET Is_Read = 1 WHERE Recipient_Type = ? AND Recipient_ID = ?")->execute([$role, $rid]);
        sendSuccess(null, 'All notifications marked as read.');
        break;

    case 'delete':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Notification ID required.');
        $db->prepare("DELETE FROM Notification WHERE Notif_ID = ?")->execute([$id]);
        sendSuccess(null, 'Notification deleted.');
        break;

    case 'clear_all':
        requireAuth();
        $rid  = $input['recipient_id'] ?? null;
        $role = $input['role']         ?? 'student';
        if (!$rid) sendError('recipient_id required.');
        $db->prepare("DELETE FROM Notification WHERE Recipient_Type = ? AND Recipient_ID = ?")->execute([$role, $rid]);
        sendSuccess(null, 'All notifications cleared.');
        break;

    case 'create':
        requireAdmin();
        $title  = trim($input['Notif_Title']     ?? '');
        $desc   = $input['Notif_Desc']            ?? null;
        $type   = $input['Notif_Type']            ?? 'info';
        $rtype  = $input['Recipient_Type']        ?? 'all';
        $rid    = $input['Recipient_ID']          ?? null;

        if (!$title) sendError('Notification title required.');

        $stmt = $db->prepare("
            INSERT INTO Notification (Notif_Title, Notif_Desc, Notif_Type, Recipient_Type, Recipient_ID)
            VALUES (?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $desc, $type, $rtype, $rid]);
        sendSuccess(['Notif_ID' => $db->lastInsertId()], 'Notification sent.');
        break;

    default:
        sendError('Unknown action.', 404);
}
