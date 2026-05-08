<?php
// ============================================================
// DATABASE CONFIGURATION
// ============================================================
// Edit these values to match your server environment.

define('DB_HOST', 'localhost');
define('DB_USER', 'root');          // your MySQL username
define('DB_PASS', '');              // your MySQL password
define('DB_NAME', 'lms_db');
define('DB_CHARSET', 'utf8mb4');

// Base URL of your project (no trailing slash)
define('BASE_URL', 'http://localhost/lms_backend');

// File upload directory (relative to project root)
define('UPLOAD_DIR', __DIR__ . '/../uploads/');

// ============================================================
// DATABASE CONNECTION (PDO)
// ============================================================
function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}

// ============================================================
// RESPONSE HELPERS
// ============================================================
function sendJSON(array $data, int $statusCode = 200): void {
    http_response_code($statusCode);
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    echo json_encode($data);
    exit;
}

function sendSuccess($data = null, string $message = 'Success'): void {
    sendJSON(['success' => true, 'message' => $message, 'data' => $data]);
}

function sendError(string $message = 'Error', int $code = 400): void {
    sendJSON(['success' => false, 'message' => $message], $code);
}

// ============================================================
// REQUEST HELPER
// ============================================================
function getInput(): array {
    $body = json_decode(file_get_contents('php://input'), true) ?? [];
    return array_merge($_GET, $_POST, $body);
}

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(200);
    exit;
}
