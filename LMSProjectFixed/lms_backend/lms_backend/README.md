# LMS Backend — Setup & Integration Guide

## 📁 File Structure

```
lms_backend/
├── database/
│   └── lms_schema.sql          ← Run this first in phpMyAdmin
├── config/
│   ├── db.php                  ← DB credentials + helper functions
│   └── auth.php                ← Session auth helpers
├── api/
│   ├── auth/
│   │   └── auth.php            ← Login, logout, register, me
│   ├── students/
│   │   └── students.php        ← CRUD + enrolled courses
│   ├── lecturers/
│   │   └── lecturers.php       ← CRUD + courses by lecturer
│   ├── courses/
│   │   └── courses.php         ← CRUD + students + dashboard stats
│   ├── lessons/
│   │   └── lessons.php         ← CRUD per course
│   ├── enrollment/
│   │   └── enrollment.php      ← Enroll, drop, complete, check
│   ├── progress/
│   │   └── progress.php        ← Track lesson completion per student
│   ├── assignments/
│   │   └── assignments.php     ← CRUD + questions + options (tasks)
│   ├── submissions/
│   │   └── submissions.php     ← Submit quiz, auto-grade, view results
│   ├── certificates/
│   │   └── certificates.php    ← Generate, revoke, verify
│   └── notifications/
│       └── notifications.php   ← Send, read, mark read
└── uploads/                    ← File uploads go here (create this folder)
```

---

## ⚙️ Setup Steps

### 1. Import the Database
Open **phpMyAdmin** → Import → select `database/lms_schema.sql` → Go.

### 2. Configure Database Credentials
Open `config/db.php` and edit:
```php
define('DB_HOST', 'localhost');
define('DB_USER', 'root');      // your MySQL username
define('DB_PASS', '');          // your MySQL password
define('DB_NAME', 'lms_db');
```

### 3. Place Files on Server
Put the entire `lms_backend/` folder inside your `htdocs/` or `www/` directory.

### 4. Create Uploads Folder
Create a writable folder: `lms_backend/uploads/`

---

## 🔌 API Reference

All APIs accept `GET` or `POST` requests. All responses return JSON:
```json
{ "success": true, "message": "...", "data": {...} }
```

### AUTH  `/api/auth/auth.php`
| Action | Method | Params | Description |
|--------|--------|--------|-------------|
| `login` | POST | `email`, `password`, `role` (student/admin/lecturer) | Login |
| `register` | POST | `Stu_ID`, `Stu_Name`, `Stu_Email`, `password`, ... | Register student |
| `logout` | POST | — | Logout |
| `me` | GET | — | Get current session user |

### STUDENTS  `/api/students/students.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Admin | — |
| `get` | Any | `id` |
| `create` | Admin | All Stu_ fields + `password` |
| `update` | Any | `id` + fields to change |
| `delete` | Admin | `id` |
| `courses` | Any | `id` (student ID) |

### LECTURERS  `/api/lecturers/lecturers.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Any | — |
| `get` | Any | `id` |
| `create` | Admin | All Lec_ fields + `password` |
| `update` | Admin | `id` + fields |
| `delete` | Admin | `id` |
| `courses` | Any | `id` (lecturer ID) |

### COURSES  `/api/courses/courses.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Any | — |
| `get` | Any | `id` |
| `create` | Admin | `Course_Title`, `Lec_ID`, optional fields |
| `update` | Admin | `id` + fields |
| `delete` | Admin | `id` |
| `students` | Any | `id` (course ID) |
| `dashboard` | Admin | — (returns all stats) |

### LESSONS  `/api/lessons/lessons.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Any | `course_id` |
| `get` | Any | `id` |
| `create` | Admin | `Lesson_Title`, `Course_ID`, optional fields |
| `update` | Admin | `id` + fields |
| `delete` | Admin | `id` |

### ENROLLMENT  `/api/enrollment/enrollment.php`
| Action | Auth | Params |
|--------|------|--------|
| `enroll` | Any | `Stu_ID`, `Course_ID` |
| `drop` | Any | `id` (Enroll_ID) |
| `complete` | Admin | `id` (auto-issues certificate) |
| `check` | Any | `Stu_ID`, `Course_ID` |
| `list` | Any | `student_id` |

### PROGRESS  `/api/progress/progress.php`
| Action | Auth | Params |
|--------|------|--------|
| `update` | Any | `Stu_ID`, `Lesson_ID`, `Course_ID`, `Status` (in_progress/completed) |
| `get` | Any | `stu_id`, `course_id` |
| `summary` | Any | `stu_id` |

### ASSIGNMENTS (Tasks)  `/api/assignments/assignments.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Any | `course_id` |
| `get` | Any | `id` (returns questions + options) |
| `create` | Admin | `Assign_Title`, `Course_ID`, `questions[]` array |
| `update` | Admin | `id` + fields |
| `delete` | Admin | `id` |

**Questions array format for `create`:**
```json
{
  "Assign_Title": "Week 1 Quiz",
  "Course_ID": 1,
  "questions": [
    {
      "text": "What is PHP?",
      "options": ["A language", "A framework", "A database", "An OS"],
      "correct": 0
    }
  ]
}
```

### SUBMISSIONS  `/api/submissions/submissions.php`
| Action | Auth | Params |
|--------|------|--------|
| `submit` | Student | `Stu_ID`, `Assign_ID`, `answers[]` array (auto-grades MCQ) |
| `list` | Admin | `assign_id` |
| `get` | Any | `id` |
| `mine` | Student | `stu_id` |
| `grade` | Admin | `id`, `score` |

**Answers array format for `submit`:**
```json
{
  "Stu_ID": 1001,
  "Assign_ID": 1,
  "answers": [
    { "question_id": 1, "option_id": 3 },
    { "question_id": 2, "option_id": 7 }
  ]
}
```

### CERTIFICATES  `/api/certificates/certificates.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Admin | — |
| `mine` | Any | `stu_id` |
| `get` | Any | `id` |
| `generate` | Admin | `Stu_ID`, `Course_ID` |
| `revoke` | Admin | `id` |
| `verify` | Public | `code` (CERT-YYYY-XXXXXXXX) |

### NOTIFICATIONS  `/api/notifications/notifications.php`
| Action | Auth | Params |
|--------|------|--------|
| `list` | Any | `recipient_id`, `role` |
| `unread_count` | Any | `recipient_id`, `role` |
| `mark_read` | Any | `id` |
| `mark_all_read` | Any | `recipient_id`, `role` |
| `create` | Admin | `Notif_Title`, `Recipient_Type`, optional `Recipient_ID` |

---

## 🔗 Connecting Frontend (JavaScript)

Replace all `localStorage` and `alert(...)` calls in your JS files with `fetch()` calls:

```javascript
// Example: Login
async function login(email, password, role) {
  const res = await fetch('../lms_backend/api/auth/auth.php?action=login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, role })
  });
  const data = await res.json();
  if (data.success) {
    sessionStorage.setItem('currentUser', JSON.stringify(data.data));
    window.location.href = data.data.role === 'admin' ? '../admin/a_dashboard.html' : '../student/s_dashboard.html';
  } else {
    alert(data.message);
  }
}

// Example: Load courses
async function loadCourses() {
  const res = await fetch('../lms_backend/api/courses/courses.php?action=list');
  const data = await res.json();
  return data.success ? data.data : [];
}

// Example: Enroll student
async function enrollCourse(courseId) {
  const user = JSON.parse(sessionStorage.getItem('currentUser'));
  const res = await fetch('../lms_backend/api/enrollment/enrollment.php?action=enroll', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ Stu_ID: user.id, Course_ID: courseId })
  });
  const data = await res.json();
  alert(data.message);
}
```

---

## 🗄️ Updated Database Schema Summary

| Table | Purpose |
|-------|---------|
| `Student` | Student accounts |
| `Lecturer` | Lecturer accounts |
| `Admin` | Admin accounts |
| `Course` | Courses (linked to Lecturer) |
| `Lesson` | Lessons per course |
| `Enrollment` | Student ↔ Course link |
| `Progress` | Lesson completion tracking |
| `Assignment` | Quizzes/tasks per course |
| `Question` | Questions per assignment |
| `Question_Option` | MCQ options (with correct flag) |
| `Submission` | Student's quiz attempt |
| `Answer` | Student's answer per question |
| `Certificate` | Issued certificates |
| `Notification` | System notifications |
