<?php
// ============================================================
// AUTH API  —  /api/auth/auth.php
// POST /api/auth/auth.php?action=login
// POST /api/auth/auth.php?action=register
// POST /api/auth/auth.php?action=logout
// GET  /api/auth/auth.php?action=me
// ============================================================
require_once __DIR__ . '/../../config/db.php';
require_once __DIR__ . '/../../config/auth.php';

$input  = getInput();
$action = $input['action'] ?? $_GET['action'] ?? '';

switch ($action) {

    // ----------------------------------------------------------
    // LOGIN
    // ----------------------------------------------------------
    case 'login':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('Method not allowed', 405);

        $email    = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';
        $role     = $input['role'] ?? 'student'; // student | admin | lecturer

        if (!$email || !$password) sendError('Email and password are required.');

        $db = getDB();

        // Try each role table
        $user = null;
        if ($role === 'admin') {
            $stmt = $db->prepare("SELECT Admin_ID AS id, Admin_Name AS name, Admin_Email AS email, Admin_Password AS hash FROM Admin WHERE Admin_Email = ?");
            $stmt->execute([$email]);
            $row = $stmt->fetch();
            if ($row && password_verify($password, $row['hash'])) {
                $user = ['id' => $row['id'], 'name' => $row['name'], 'email' => $row['email'], 'role' => 'admin'];
            }
        } elseif ($role === 'lecturer') {
            $stmt = $db->prepare("SELECT Lec_ID AS id, Lec_Name AS name, Lec_Email AS email, Lec_Password AS hash FROM Lecturer WHERE Lec_Email = ? AND Lec_Status = 'active'");
            $stmt->execute([$email]);
            $row = $stmt->fetch();
            if ($row && password_verify($password, $row['hash'])) {
                $user = ['id' => $row['id'], 'name' => $row['name'], 'email' => $row['email'], 'role' => 'lecturer'];
            }
        } else {
            $stmt = $db->prepare("SELECT Stu_ID AS id, Stu_Name AS name, Stu_Email AS email, Stu_Password AS hash FROM Student WHERE Stu_Email = ? AND Stu_Status = 'active'");
            $stmt->execute([$email]);
            $row = $stmt->fetch();
            if ($row && password_verify($password, $row['hash'])) {
                $user = ['id' => $row['id'], 'name' => $row['name'], 'email' => $row['email'], 'role' => 'student'];
            }
        }

        if (!$user) sendError('Invalid email or password.', 401);

        $_SESSION['user'] = $user;
        // Generate a simple bearer token for stateless auth
        $token = base64_encode(json_encode($user));
        $user['token'] = $token;
        sendSuccess($user, 'Login successful.');
        break;

    // ----------------------------------------------------------
    // REGISTER STUDENT
    // ----------------------------------------------------------
    case 'register':
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') sendError('Method not allowed', 405);

        $id       = $input['Stu_ID']     ?? null;
        $name     = trim($input['Stu_Name']   ?? '');
        $email    = trim($input['Stu_Email']  ?? '');
        $password = $input['password']        ?? '';
        $gender   = $input['Stu_Gender']      ?? null;
        $major    = $input['Stu_Major']       ?? null;
        $year     = $input['Stu_Year']        ?? null;
        $dob      = $input['Stu_DOB']         ?? null;
        $phone    = $input['Stu_Phone']       ?? null;

        if (!$id || !$name || !$email || !$password) sendError('ID, name, email and password are required.');
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) sendError('Invalid email format.');

        $db   = getDB();
        $hash = password_hash($password, PASSWORD_BCRYPT);

        try {
            $stmt = $db->prepare("
                INSERT INTO Student (Stu_ID, Stu_Name, Stu_Email, Stu_Password, Stu_Gender, Stu_Major, Stu_Year, Stu_DOB, Stu_Phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([$id, $name, $email, $hash, $gender, $major, $year, $dob, $phone]);
        } catch (PDOException $e) {
            if ($e->getCode() == 23000) sendError('Student ID or email already exists.');
            throw $e;
        }

        sendSuccess(['Stu_ID' => $id], 'Registration successful.');
        break;

    // ----------------------------------------------------------
    // LOGOUT
    // ----------------------------------------------------------
    case 'logout':
        session_destroy();
        sendSuccess(null, 'Logged out successfully.');
        break;

    // ----------------------------------------------------------
    // GET CURRENT USER
    // ----------------------------------------------------------
    case 'me':
        $user = requireAuth();
        sendSuccess($user);
        break;

    default:
        sendError('Unknown action.', 404);
}
