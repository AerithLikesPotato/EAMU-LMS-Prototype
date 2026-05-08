// ============================================================
// a_lessons.js — connected to backend
// ============================================================

const API_BASE = '../lms_backend/lms_backend/api';

// Set current date
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
});

// Check auth
const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '../login/index.html';
}
if (document.getElementById('adminName')) {
    document.getElementById('adminName').textContent = currentUser ? currentUser.name : 'Admin';
}

// Get courseId from URL
const urlParams = new URLSearchParams(window.location.search);
const courseIdParam = urlParams.get('courseId');

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
    if (modalId === 'addLessonModal') {
        const selectedCourse = document.getElementById('courseSelect').value;
        if (selectedCourse) {
            document.getElementById('lessonCourseId').value = selectedCourse;
        }
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
});

// ============================================================
// LOAD COURSES into dropdowns
// ============================================================
async function loadCourseDropdowns() {
    try {
        const res = await fetch(`${API_BASE}/courses/courses.php?action=list`);
        const data = await res.json();
        if (!data.success) return;

        const courses = data.data;
        const selects = [
            document.getElementById('courseSelect'),
            document.getElementById('lessonCourseId')
        ];

        selects.forEach(select => {
            if (!select) return;
            const firstOpt = select.querySelector('option');
            select.innerHTML = '';
            select.appendChild(firstOpt);
            courses.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.Course_ID;
                opt.textContent = c.Course_Title;
                select.appendChild(opt);
            });
        });

        // Auto-select if courseId from URL
        if (courseIdParam) {
            document.getElementById('courseSelect').value = courseIdParam;
            loadLessons();
        }
    } catch (err) {
        console.error('Failed to load courses:', err);
    }
}

// ============================================================
// LOAD & RENDER LESSONS
// ============================================================
async function loadLessons() {
    const courseId = document.getElementById('courseSelect').value;
    const grid = document.getElementById('lessonsGrid');
    grid.innerHTML = '<p style="padding:20px;">Loading lessons...</p>';

    try {
        const url = courseId
            ? `${API_BASE}/lessons/lessons.php?action=list&course_id=${courseId}`
            : `${API_BASE}/lessons/lessons.php?action=list_all`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.success || data.data.length === 0) {
            grid.innerHTML = '<div class="empty-state"><i class="fas fa-video"></i><h3>No Lessons Yet</h3><p>Click the button above to add lessons.</p></div>';
            return;
        }

grid.innerHTML = data.data.map((lesson, idx) => {
            const title = lesson.Lesson_Title || 'Untitled';
            const desc  = lesson.Lesson_Desc  || 'No description provided.';
            return `
            <div class="lesson-mgmt-card">
                <div class="lesson-order-badge">#${lesson.Lesson_Order || idx+1}</div>
                <div class="lesson-card-icon">
                    ${lesson.Lesson_Video_URL ? '<i class="fas fa-play-circle"></i>' : '<i class="fas fa-file-alt"></i>'}
                </div>
                <div class="lesson-card-body">
                    <h3 class="lesson-card-title" title="${title}">${title}</h3>
                    <p class="lesson-card-desc" title="${desc}">${desc}</p>
                    <div class="lesson-card-meta">
                        ${lesson.Course_Title ? `<span class="lm-chip"><i class="fas fa-book"></i> ${lesson.Course_Title}</span>` : ''}
                        <span class="lm-chip"><i class="fas fa-clock"></i> ${lesson.Lesson_Duration || 'N/A'}</span>
                        ${lesson.Lesson_Video_URL
                            ? `<a href="${lesson.Lesson_Video_URL}" target="_blank" class="lm-chip lm-chip-link"><i class="fas fa-external-link-alt"></i> Watch</a>`
                            : '<span class="lm-chip lm-chip-nolink"><i class="fas fa-ban"></i> No Video</span>'}
                    </div>
                </div>
                <div class="lesson-card-actions">
                    <button class="la-btn la-edit"   onclick="editLesson(${lesson.Lesson_ID})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="la-btn la-delete" onclick="deleteLesson(${lesson.Lesson_ID})"><i class="fas fa-trash"></i> Delete</button>
                </div>
            </div>
        `}).join('');
    } catch (err) {
        grid.innerHTML = '<p style="color:red;padding:20px;">Failed to load lessons.</p>';
        console.error(err);
    }
}

// ============================================================
// SAVE LESSON
// ============================================================
async function saveLesson() {
    const form = document.getElementById('addLessonForm');
    const payload = {
        Course_ID: form.querySelector('[name="courseId"]').value,
        Lesson_Title: form.querySelector('[name="title"]').value.trim(),
        Lesson_Video_URL: form.querySelector('[name="videoUrl"]').value.trim(),
        Lesson_Duration: form.querySelector('[name="duration"]').value.trim(),
        Lesson_Order: form.querySelector('[name="order"]').value || 1
    };

    if (!payload.Course_ID || !payload.Lesson_Title) {
        alert('Please select a course and enter a lesson title.');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/lessons/lessons.php?action=create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            form.reset();
            closeModal('addLessonModal');
            document.getElementById('courseSelect').value = payload.Course_ID;
            loadLessons();
        }
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// EDIT LESSON
// ============================================================
async function editLesson(id) {
    try {
        const res = await fetch(`${API_BASE}/lessons/lessons.php?action=get&id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Could not load lesson.'); return; }

        const l = data.data;
        document.getElementById('editLessonId').value = l.Lesson_ID;
        document.getElementById('editTitle').value = l.Lesson_Title;
        document.getElementById('editVideoUrl').value = l.Lesson_Video_URL || '';
        document.getElementById('editDuration').value = l.Lesson_Duration || '';
        document.getElementById('editOrder').value = l.Lesson_Order || 1;
        openModal('editLessonModal');
    } catch (err) {
        alert('Server error.');
    }
}

async function updateLesson() {
    const id = document.getElementById('editLessonId').value;
    const payload = {
        id: id,
        Lesson_Title: document.getElementById('editTitle').value.trim(),
        Lesson_Video_URL: document.getElementById('editVideoUrl').value.trim(),
        Lesson_Duration: document.getElementById('editDuration').value.trim(),
        Lesson_Order: document.getElementById('editOrder').value || 1
    };

    try {
        const res = await fetch(`${API_BASE}/lessons/lessons.php?action=update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            closeModal('editLessonModal');
            loadLessons();
        }
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// DELETE LESSON
// ============================================================
async function deleteLesson(id) {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
        const res = await fetch(`${API_BASE}/lessons/lessons.php?action=delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) loadLessons();
    } catch (err) {
        alert('Server error.');
    }
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// On page load
window.addEventListener('load', function() {
    loadCourseDropdowns().then(() => loadLessons());
});