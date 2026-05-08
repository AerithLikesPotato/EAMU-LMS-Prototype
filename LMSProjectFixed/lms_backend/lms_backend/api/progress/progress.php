<?php
// ============================================================
// PROGRESS API  —  /api/progress/progress.php
// POST ?action=update              → mark lesson started/completed
// GET  ?action=get&stu_id=X&course_id=Y   → progress for a course
// GET  ?action=summary&stu_id=X          → all courses progress
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';
$db     = getDB();

switch ($action) {

    case 'update':
        requireAuth();
        $stu_id    = $input['Stu_ID']    ?? null;
        $lesson_id = $input['Lesson_ID'] ?? null;
        $course_id = $input['Course_ID'] ?? null;
        $status    = $input['Status']    ?? 'in_progress'; // in_progress | completed

        if (!$stu_id || !$lesson_id || !$course_id) sendError('Stu_ID, Lesson_ID and Course_ID required.');

        $completed_date = ($status === 'completed') ? date('Y-m-d H:i:s') : null;

        // Upsert
        $stmt = $db->prepare("
            INSERT INTO Progress (Stu_ID, Lesson_ID, Course_ID, Status, Completed_Date)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE Status = VALUES(Status), Completed_Date = VALUES(Completed_Date)
        ");
        $stmt->execute([$stu_id, $lesson_id, $course_id, $status, $completed_date]);

        // Check if all lessons in the course are done → auto-complete enrollment
        $total = $db->prepare("SELECT COUNT(*) FROM Lesson WHERE Course_ID = ?");
        $total->execute([$course_id]);
        $totalLessons = (int)$total->fetchColumn();

        $done = $db->prepare("SELECT COUNT(*) FROM Progress WHERE Stu_ID = ? AND Course_ID = ? AND Status = 'completed'");
        $done->execute([$stu_id, $course_id]);
        $doneLessons = (int)$done->fetchColumn();

        // Also check if all assignments (tasks) for this course are submitted
        $totalAssign = $db->prepare("SELECT COUNT(*) FROM Assignment WHERE Course_ID = ?");
        $totalAssign->execute([$course_id]);
        $totalTasks = (int)$totalAssign->fetchColumn();

        $doneAssign = $db->prepare("SELECT COUNT(DISTINCT s.Assign_ID) FROM Submission s JOIN Assignment a ON a.Assign_ID = s.Assign_ID WHERE s.Stu_ID = ? AND a.Course_ID = ?");
        $doneAssign->execute([$stu_id, $course_id]);
        $doneTasks = (int)$doneAssign->fetchColumn();

        $allLessonsDone = ($totalLessons > 0 && $doneLessons >= $totalLessons);
        $allTasksDone   = ($totalTasks === 0 || $doneTasks >= $totalTasks);
        $allDone = $allLessonsDone && $allTasksDone;
        if ($allDone) {
            $db->prepare("UPDATE Enrollment SET Enroll_Status = 'completed' WHERE Stu_ID = ? AND Course_ID = ?")->execute([$stu_id, $course_id]);
        }

        sendSuccess([
            'all_completed'   => $allDone,
            'lessons_done'    => $allLessonsDone,
            'tasks_done'      => $allTasksDone,
            'completed'       => $doneLessons,
            'total'           => $totalLessons,
            'tasks_submitted' => $doneTasks,
            'tasks_total'     => $totalTasks,
        ], 'Progress updated.');
        break;

    case 'get':
        requireAuth();
        $stu_id    = $input['stu_id']    ?? null;
        $course_id = $input['course_id'] ?? null;
        if (!$stu_id || !$course_id) sendError('stu_id and course_id required.');

        $stmt = $db->prepare("
            SELECT l.Lesson_ID, l.Lesson_Title, l.Lesson_Order,
                   COALESCE(p.Status, 'not_started') AS Status,
                   p.Completed_Date
            FROM Lesson l
            LEFT JOIN Progress p ON p.Lesson_ID = l.Lesson_ID AND p.Stu_ID = ?
            WHERE l.Course_ID = ?
            ORDER BY l.Lesson_Order ASC
        ");
        $stmt->execute([$stu_id, $course_id]);
        $lessons = $stmt->fetchAll();

        $total     = count($lessons);
        $completed = count(array_filter($lessons, fn($l) => $l['Status'] === 'completed'));
        $pct       = $total > 0 ? round(($completed / $total) * 100) : 0;

        sendSuccess([
            'lessons'    => $lessons,
            'total'      => $total,
            'completed'  => $completed,
            'percentage' => $pct,
        ]);
        break;

    case 'summary':
        requireAuth();
        $stu_id = $input['stu_id'] ?? null;
        if (!$stu_id) sendError('stu_id required.');

        $stmt = $db->prepare("
            SELECT c.Course_ID, c.Course_Title, c.Course_Image, l.Lec_Name, e.Enroll_Status,
                   (SELECT COUNT(*) FROM Lesson ls WHERE ls.Course_ID = c.Course_ID) AS Total_Lessons,
                   (SELECT COUNT(*) FROM Progress p WHERE p.Stu_ID = ? AND p.Course_ID = c.Course_ID AND p.Status = 'completed') AS Completed_Lessons
            FROM Enrollment e
            JOIN Course c ON c.Course_ID = e.Course_ID
            JOIN Lecturer l ON l.Lec_ID = c.Lec_ID
            WHERE e.Stu_ID = ?
        ");
        $stmt->execute([$stu_id, $stu_id]);
        $courses = $stmt->fetchAll();

        foreach ($courses as &$c) {
            $c['Percentage'] = $c['Total_Lessons'] > 0
                ? round(($c['Completed_Lessons'] / $c['Total_Lessons']) * 100)
                : 0;
        }

        sendSuccess($courses);
        break;

    default:
        sendError('Unknown action.', 404);
}
