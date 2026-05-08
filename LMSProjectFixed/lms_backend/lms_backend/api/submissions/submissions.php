<?php
// ============================================================
// SUBMISSIONS API  —  /api/submissions/submissions.php
// POST ?action=submit              → student submits quiz answers
// GET  ?action=list&assign_id=X   → all submissions for an assignment (admin)
// GET  ?action=get&id=X            → single submission + answers
// GET  ?action=mine&stu_id=X       → student's own submissions
// POST ?action=grade&id=X          → admin grades/scores a submission
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'submit':
        requireAuth();
        $stu_id    = $input['Stu_ID']    ?? null;
        $assign_id = $input['Assign_ID'] ?? null;
        $answers   = $input['answers']   ?? []; // [{question_id, option_id}]
        $title     = $input['Subm_Title'] ?? 'Quiz Submission';

        if (!$stu_id || !$assign_id) sendError('Stu_ID and Assign_ID required.');
        if (empty($answers)) sendError('No answers provided.');

        $db->beginTransaction();
        try {
            // Create submission record
            $stmt = $db->prepare("
                INSERT INTO Submission (Subm_Title, Stu_ID, Assign_ID)
                VALUES (?, ?, ?)
            ");
            $stmt->execute([$title, $stu_id, $assign_id]);
            $subm_id = $db->lastInsertId();

            $score   = 0;
            $total   = 0;

            // Save each answer and auto-grade MCQ
            foreach ($answers as $ans) {
                $q_id  = $ans['Question_ID'] ?? $ans['question_id'] ?? null;
                $o_id  = $ans['Option_ID'] ?? $ans['option_id'] ?? null;
                if (!$q_id) continue;

                // Check if correct
                $isCorrect = 0;
                if ($o_id) {
                    $check = $db->prepare("SELECT Is_Correct FROM Question_Option WHERE Option_ID = ? AND Question_ID = ?");
                    $check->execute([$o_id, $q_id]);
                    $isCorrect = (int)$check->fetchColumn();
                }

                // Get question points
                $pts = $db->prepare("SELECT Question_Points FROM Question WHERE Question_ID = ?");
                $pts->execute([$q_id]);
                $qPoints = (int)$pts->fetchColumn();

                $total += $qPoints;
                if ($isCorrect) $score += $qPoints;

                $aStmt = $db->prepare("
                    INSERT INTO Answer (Subm_ID, Question_ID, Option_ID, Is_Correct)
                    VALUES (?, ?, ?, ?)
                ");
                $aStmt->execute([$subm_id, $q_id, $o_id, $isCorrect]);
            }

            // Save score as percentage
            $finalScore = $total > 0 ? round(($score / $total) * 100, 2) : 0;
            $db->prepare("UPDATE Submission SET Subm_Score = ?, Subm_Status = 'graded' WHERE Subm_ID = ?")->execute([$finalScore, $subm_id]);

            $db->commit();
        } catch (\Exception $e) {
            $db->rollBack();
            sendError('Submission failed: ' . $e->getMessage(), 500);
        }

        sendSuccess([
            'Subm_ID' => $subm_id,
            'score'   => $finalScore,
            'correct' => $score,
            'total'   => $total,
        ], 'Submission recorded and graded.');
        break;

    case 'list':
        requireAdmin();
        $assign_id = $input['assign_id'] ?? null;
        if (!$assign_id) sendError('assign_id required.');
        $stmt = $db->prepare("
            SELECT sb.*, s.Stu_Name, s.Stu_Email
            FROM Submission sb
            JOIN Student s ON s.Stu_ID = sb.Stu_ID
            WHERE sb.Assign_ID = ?
            ORDER BY sb.Subm_Date DESC
        ");
        $stmt->execute([$assign_id]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'get':
        requireAuth();
        $id = $input['id'] ?? null;
        if (!$id) sendError('Submission ID required.');

        $stmt = $db->prepare("
            SELECT sb.*, s.Stu_Name, a.Assign_Title
            FROM Submission sb
            JOIN Student s ON s.Stu_ID = sb.Stu_ID
            JOIN Assignment a ON a.Assign_ID = sb.Assign_ID
            WHERE sb.Subm_ID = ?
        ");
        $stmt->execute([$id]);
        $subm = $stmt->fetch();
        if (!$subm) sendError('Submission not found.', 404);

        // Attach answers with question/option text
        $aStmt = $db->prepare("
            SELECT an.*, q.Question_Title, o.Option_Text AS Selected_Option, an.Is_Correct
            FROM Answer an
            JOIN Question q ON q.Question_ID = an.Question_ID
            LEFT JOIN Question_Option o ON o.Option_ID = an.Option_ID
            WHERE an.Subm_ID = ?
        ");
        $aStmt->execute([$id]);
        $subm['answers'] = $aStmt->fetchAll();

        sendSuccess($subm);
        break;

    case 'mine':
        requireAuth();
        $stu_id = $input['stu_id'] ?? null;
        if (!$stu_id) sendError('stu_id required.');
        $stmt = $db->prepare("
            SELECT sb.*, a.Assign_Title, c.Course_Title
            FROM Submission sb
            JOIN Assignment a ON a.Assign_ID = sb.Assign_ID
            JOIN Course c ON c.Course_ID = a.Course_ID
            WHERE sb.Stu_ID = ?
            ORDER BY sb.Subm_Date DESC
        ");
        $stmt->execute([$stu_id]);
        sendSuccess($stmt->fetchAll());
        break;

    case 'grade':
        requireAdmin();
        $id    = $input['id']    ?? null;
        $score = $input['score'] ?? null;
        if (!$id || $score === null) sendError('Submission ID and score required.');
        $db->prepare("UPDATE Submission SET Subm_Score = ?, Subm_Status = 'graded' WHERE Subm_ID = ?")->execute([$score, $id]);
        sendSuccess(null, 'Submission graded.');
        break;

    default:
        sendError('Unknown action.', 404);
}
