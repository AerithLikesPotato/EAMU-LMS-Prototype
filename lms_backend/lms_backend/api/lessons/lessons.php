<?php
// ============================================================
// LESSONS API  —  /api/lessons/lessons.php
// GET  ?action=list&course_id=X   → lessons for a course
// GET  ?action=get&id=X           → single lesson
// POST ?action=create             → create lesson (admin)
// POST ?action=update&id=X        → update lesson (admin)
// POST ?action=delete&id=X        → delete lesson (admin)
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'list':
        requireAuth();
        $course_id = $input['course_id'] ?? null;
        if (!$course_id) sendError('Course ID required.');
        $stmt = $db->prepare("SELECT * FROM Lesson WHERE Course_ID = ? ORDER BY Lesson_Order ASC");
        $stmt->execute([$course_id]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'list_all':
        requireAdminOrLecturer();
        $stmt = $db->query("
            SELECT l.*, c.Course_Title
            FROM Lesson l
            JOIN Course c ON c.Course_ID = l.Course_ID
            ORDER BY c.Course_Title ASC, l.Lesson_Order ASC
        ");
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Lesson ID required.');
        $stmt = $db->prepare("SELECT * FROM Lesson WHERE Lesson_ID = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if (!$row) sendError('Lesson not found.', 404);
        sendSuccess($row);
        break;

    case 'create':
        requireAdminOrLecturer();
        $title    = trim($input['Lesson_Title']       ?? '');
        $desc     = $input['Lesson_Desc']              ?? null;
        $video    = $input['Lesson_Video_URL']         ?? null;
        $duration = $input['Lesson_Duration']          ?? null;
        $order    = $input['Lesson_Order']             ?? 1;
        $release  = $input['Lesson_Release_Date']      ?? null;
        $course   = $input['Course_ID']                ?? null;

        if (!$title || !$course) sendError('Title and Course ID are required.');

        $stmt = $db->prepare("
            INSERT INTO Lesson (Lesson_Title, Lesson_Desc, Lesson_Video_URL, Lesson_Duration, Lesson_Order, Lesson_Release_Date, Course_ID)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$title, $desc, $video, $duration, $order, $release, $course]);
        sendSuccess(['Lesson_ID' => $db->lastInsertId()], 'Lesson created.');
        break;

    case 'update':
        requireAdminOrLecturer();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Lesson ID required.');

        $fields = [];
        $values = [];
        $allowed = ['Lesson_Title','Lesson_Desc','Lesson_Video_URL','Lesson_Duration','Lesson_Order','Lesson_Release_Date','Course_ID'];
        foreach ($allowed as $col) {
            if (isset($input[$col])) {
                $fields[] = "$col = ?";
                $values[] = $input[$col];
            }
        }
        if (empty($fields)) sendError('No fields to update.');
        $values[] = $id;
        $db->prepare("UPDATE Lesson SET " . implode(', ', $fields) . " WHERE Lesson_ID = ?")->execute($values);
        sendSuccess(null, 'Lesson updated.');
        break;

    case 'delete':
        requireAdminOrLecturer();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Lesson ID required.');
        $db->prepare("DELETE FROM Lesson WHERE Lesson_ID = ?")->execute([$id]);
        sendSuccess(null, 'Lesson deleted.');
        break;

    default:
        sendError('Unknown action.', 404);
}
