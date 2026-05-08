<?php
// ============================================================
// AUTH HELPER
// Supports both PHP sessions AND Authorization header tokens
// ============================================================
require_once __DIR__ . '/db.php';

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// ---- Extract user from request (session OR bearer token) ----
function getCurrentUser(): ?array {
    // 1. Check PHP session
    if (!empty($_SESSION['user'])) {
        return $_SESSION['user'];
    }
    // 2. Check Authorization header (Bearer token)
    $headers = getallheaders();
    $auth = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    if (strpos($auth, 'Bearer ') === 0) {
        $token = substr($auth, 7);
        $decoded = base64_decode($token);
        if ($decoded) {
            $user = json_decode($decoded, true);
            if (is_array($user) && isset($user['id'], $user['role'])) {
                $_SESSION['user'] = $user; // cache in session
                return $user;
            }
        }
    }
    return null;
}

// ---- Require a logged-in user of any role ----
function requireAuth(): array {
    $user = getCurrentUser();
    if (!$user) {
        sendError('Unauthorized. Please log in.', 401);
    }
    return $user;
}

// ---- Require Admin role ----
function requireAdmin(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin') {
        sendError('Forbidden. Admin access required.', 403);
    }
    return $user;
}

// ---- Require Admin or Lecturer role ----
function requireAdminOrLecturer(): array {
    $user = requireAuth();
    if ($user['role'] !== 'admin' && $user['role'] !== 'lecturer') {
        sendError('Forbidden. Admin or Lecturer access required.', 403);
    }
    return $user;
}

// ---- Require Student role ----
function requireStudent(): array {
    $user = requireAuth();
    if ($user['role'] !== 'student') {
        sendError('Forbidden. Student access required.', 403);
    }
    return $user;
}

// ---- Require Lecturer role ----
function requireLecturer(): array {
    $user = requireAuth();
    if ($user['role'] !== 'lecturer') {
        sendError('Forbidden. Lecturer access required.', 403);
    }
    return $user;
}
