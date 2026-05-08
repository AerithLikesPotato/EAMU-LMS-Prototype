<?php
// ============================================================
// ASSIGNMENTS (TASKS) API  —  /api/assignments/assignments.php
// GET  ?action=list&course_id=X     → assignments for a course
// GET  ?action=get&id=X             → single assignment + questions
// POST ?action=create               → create assignment with questions (admin)
// POST ?action=update&id=X          → update assignment (admin)
// POST ?action=delete&id=X          → delete assignment (admin)
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
        if (!$course_id) sendError('course_id required.');
        $stmt = $db->prepare("
            SELECT a.*, c.Course_Title,
                   (SELECT COUNT(*) FROM Question q WHERE q.Assign_ID = a.Assign_ID) AS Question_Count,
                   (SELECT COUNT(*) FROM Submission s WHERE s.Assign_ID = a.Assign_ID) AS Submission_Count
            FROM Assignment a
            JOIN Course c ON c.Course_ID = a.Course_ID
            WHERE a.Course_ID = ?
            ORDER BY a.Assign_Release_Date ASC
        ");
        $stmt->execute([$course_id]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'list_all':
        requireAdminOrLecturer();
        $stmt = $db->query("
            SELECT a.*, c.Course_Title,
                   (SELECT COUNT(*) FROM Question q WHERE q.Assign_ID = a.Assign_ID) AS Question_Count,
                   (SELECT COUNT(*) FROM Submission s WHERE s.Assign_ID = a.Assign_ID) AS Submission_Count
            FROM Assignment a
            JOIN Course c ON c.Course_ID = a.Course_ID
            ORDER BY c.Course_Title ASC, a.Assign_Release_Date ASC
        ");
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Assignment ID required.');

        $stmt = $db->prepare("SELECT * FROM Assignment WHERE Assign_ID = ?");
        $stmt->execute([$id]);
        $assign = $stmt->fetch();
        if (!$assign) sendError('Assignment not found.', 404);

        // Attach questions and options
        $qStmt = $db->prepare("SELECT * FROM Question WHERE Assign_ID = ? ORDER BY Question_ID ASC");
        $qStmt->execute([$id]);
        $questions = $qStmt->fetchAll();

        foreach ($questions as &$q) {
            $oStmt = $db->prepare("SELECT * FROM Question_Option WHERE Question_ID = ?");
            $oStmt->execute([$q['Question_ID']]);
            $q['options'] = $oStmt->fetchAll();
        }

        $assign['questions'] = $questions;
        sendSuccess($assign);
        break;

    case 'create':
        requireAdminOrLecturer();
        $title   = trim($input['Assign_Title']        ?? '');
        $desc    = $input['Assign_Desc']               ?? null;
        $release = $input['Assign_Release_Date']       ?? null;
        $due     = $input['Assign_Due_Date']           ?? null;
        $points  = $input['Assign_Points']             ?? 100;
        $course  = $input['Course_ID']                 ?? null;
        $questions = $input['questions']               ?? []; // array of question objects

        if (!$title || !$course) sendError('Title and Course ID required.');

        $db->beginTransaction();
        try {
            $stmt = $db->prepare("
                INSERT INTO Assignment (Assign_Title, Assign_Desc, Assign_Release_Date, Assign_Due_Date, Assign_Points, Course_ID)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$title, $desc, $release, $due, $points, $course]);
            $assignId = $db->lastInsertId();

            // Insert questions and options
            foreach ($questions as $q) {
                $qStmt = $db->prepare("
                    INSERT INTO Question (Question_Title, Question_Desc, Question_Points, Assign_ID)
                    VALUES (?, ?, ?, ?)
                ");
                $qStmt->execute([
                    $q['text']   ?? $q['Question_Title'] ?? '',
                    $q['desc']   ?? $q['Question_Desc']  ?? null,
                    $q['points'] ?? 1,
                    $assignId
                ]);
                $qId = $db->lastInsertId();

                $options  = $q['options']  ?? [];
                $correct  = $q['correct']  ?? 0; // index of correct option
                foreach ($options as $i => $optText) {
                    $oStmt = $db->prepare("INSERT INTO Question_Option (Option_Text, Is_Correct, Question_ID) VALUES (?, ?, ?)");
                    $oStmt->execute([$optText, ($i == $correct) ? 1 : 0, $qId]);
                }
            }

            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            sendError('Failed to create assignment: ' . $e->getMessage(), 500);
        }

        sendSuccess(['Assign_ID' => $assignId], 'Assignment created with questions.');
        break;

    case 'update':
        requireAdminOrLecturer();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Assignment ID required.');

        $fields = [];
        $values = [];
        $allowed = ['Assign_Title','Assign_Desc','Assign_Release_Date','Assign_Due_Date','Assign_Points','Course_ID'];
        foreach ($allowed as $col) {
            if (isset($input[$col])) {
                $fields[] = "$col = ?";
                $values[] = $input[$col];
            }
        }
        if (empty($fields)) sendError('No fields to update.');
        $values[] = $id;
        $db->prepare("UPDATE Assignment SET " . implode(', ', $fields) . " WHERE Assign_ID = ?")->execute($values);
        sendSuccess(null, 'Assignment updated.');
        break;

    case 'delete':
        requireAdminOrLecturer();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Assignment ID required.');
        $db->prepare("DELETE FROM Assignment WHERE Assign_ID = ?")->execute([$id]);
        sendSuccess(null, 'Assignment deleted.');
        break;

    default:
        sendError('Unknown action.', 404);
}
