// ============================================================
// a_courses.js — fully connected to backend
// ============================================================

// ============================================================
// INIT
// ============================================================
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
});

// Load admin name from session
const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '../login/index.html';
}
if (document.getElementById('adminName')) {
    document.getElementById('adminName').textContent = currentUser.name;
}

// ============================================================
// MODAL HELPERS
// ============================================================
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
});

// ============================================================
// LOAD LECTURERS into dropdowns
// ============================================================
async function loadLecturers() {
    try {
        const res  = await fetch('../lms_backend/lms_backend/api/lecturers/lecturers.php?action=list');
        const data = await res.json();
        if (!data.success) return;

        const lecturers = data.data;
        const addSelect  = document.querySelector('#addCourseForm select[name="instructorId"]');
        const editSelect = document.getElementById('editInstructorId');

        [addSelect, editSelect].forEach(select => {
            if (!select) return;
            // Clear old options except the first placeholder
            select.innerHTML = '<option value="">Select Instructor</option>';
            lecturers.forEach(lec => {
                const opt = document.createElement('option');
                opt.value       = lec.Lec_ID;
                opt.textContent = lec.Lec_Name + ' — ' + (lec.Lec_Subject || 'General');
                select.appendChild(opt);
            });
        });
    } catch (err) {
        console.error('Failed to load lecturers:', err);
    }
}

// ============================================================
// LOAD & RENDER COURSES
// ============================================================
async function loadCourses() {
    const grid = document.getElementById('coursesGrid');
    grid.innerHTML = '<p style="padding:20px;">Loading courses...</p>';

    try {
        const res  = await fetch('../lms_backend/lms_backend/api/courses/courses.php?action=list');
        const data = await res.json();

        if (!data.success || data.data.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-book"></i>
                    <h3>No Courses Yet</h3>
                    <p>Click the button above to create your first course.</p>
                </div>`;
            return;
        }

        grid.innerHTML = data.data.map(course => `
            <div class="course-mgmt-card">
                <div class="course-card-img">
                    <img src="${course.Course_Image || 'https://via.placeholder.com/400x160/9b4399/ffffff?text=' + encodeURIComponent(course.Course_Title)}"
                         alt="${course.Course_Title}" onerror="this.src='https://via.placeholder.com/400x160/9b4399/ffffff?text=Course'">
                    <span class="course-status-pill ${course.Course_Status === 'active' ? 'pill-active' : course.Course_Status === 'draft' ? 'pill-draft' : 'pill-inactive'}">
                        ${course.Course_Status}
                    </span>
                </div>
                <div class="course-card-body">
                    <h3 class="course-card-title">${course.Course_Title}</h3>
                    <p class="course-card-desc">${course.Course_Desc ? course.Course_Desc.substring(0, 90) + '...' : 'No description provided.'}</p>
                    <div class="course-card-stats">
                        <div class="stat-chip"><i class="fas fa-user-tie"></i> ${course.Lec_Name}</div>
                        <div class="stat-chip"><i class="fas fa-book-open"></i> ${course.Lesson_Count || 0} Lessons</div>
                        <div class="stat-chip"><i class="fas fa-users"></i> ${course.Student_Count || 0} Students</div>
                    </div>
                </div>
                <div class="course-card-actions">
                    <button class="ca-btn ca-view"    onclick="viewCourse(${course.Course_ID})"><i class="fas fa-eye"></i> View</button>
                    <button class="ca-btn ca-edit"    onclick="editCourse(${course.Course_ID})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="ca-btn ca-lessons" onclick="manageLessons(${course.Course_ID})"><i class="fas fa-video"></i> Lessons</button>
                    <button class="ca-btn ca-delete"  onclick="deleteCourse(${course.Course_ID})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

    } catch (err) {
        grid.innerHTML = '<p style="color:red;padding:20px;">Failed to load courses. Is XAMPP running?</p>';
        console.error(err);
    }
}

// ============================================================
// SEARCH
// ============================================================
document.getElementById('searchCourses').addEventListener('keyup', async function () {
    const query = this.value.toLowerCase();
    const cards = document.querySelectorAll('#coursesGrid .card');
    cards.forEach(card => {
        const title = card.querySelector('.card-title')?.textContent.toLowerCase() || '';
        const lec   = card.querySelector('.card-meta')?.textContent.toLowerCase() || '';
        card.style.display = (title.includes(query) || lec.includes(query)) ? '' : 'none';
    });
});

// ============================================================
// CREATE COURSE
// ============================================================
async function saveCourse() {
    const form = document.getElementById('addCourseForm');

    const payload = {
        Course_Title:  form.querySelector('[name="title"]').value.trim(),
        Course_Desc:   form.querySelector('[name="description"]').value.trim(),
        Lec_ID:        form.querySelector('[name="instructorId"]').value,
        Course_Image:  form.querySelector('[name="image"]').value.trim(),
        Course_Status: form.querySelector('[name="status"]').value,
    };

    if (!payload.Course_Title || !payload.Lec_ID) {
        alert('Please fill in the course title and select an instructor.');
        return;
    }

    try {
        const res  = await fetch('../lms_backend/lms_backend/api/courses/courses.php?action=create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        alert(data.message);
        if (data.success) {
            form.reset();
            closeModal('addCourseModal');
            loadCourses();
        }
    } catch (err) {
        alert('Server error. Check that XAMPP is running.');
    }
}

// ============================================================
// VIEW COURSE
// ============================================================
async function viewCourse(id) {
    document.getElementById('courseDetails').innerHTML = '<p>Loading...</p>';
    openModal('viewCourseModal');

    try {
        const res  = await fetch(`../lms_backend/lms_backend/api/courses/courses.php?action=get&id=${id}`);
        const data = await res.json();

        if (!data.success) {
            document.getElementById('courseDetails').innerHTML = '<p>Course not found.</p>';
            return;
        }

        const c = data.data;
        document.getElementById('courseDetails').innerHTML = `
            <div style="text-align:center;margin-bottom:20px;">
                <img src="${c.Course_Image || 'https://via.placeholder.com/400x150?text=No+Image'}"
                     style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;">
                <h3 style="margin-top:15px;">${c.Course_Title}</h3>
                <p><strong>Instructor:</strong> ${c.Lec_Name}</p>
            </div>
            <p><strong>Description:</strong> ${c.Course_Desc || 'N/A'}</p>
            <p><strong>Module:</strong> ${c.Course_Module || 'N/A'}</p>
            <p><strong>Due Date:</strong> ${c.Course_Due_Date || 'N/A'}</p>
            <p><strong>Status:</strong> ${c.Course_Status}</p>
            <p><strong>Total Lessons:</strong> ${c.lessons ? c.lessons.length : 0}</p>
            <hr>
            <h4>Lessons</h4>
            ${c.lessons && c.lessons.length > 0
                ? c.lessons.map((l, i) => `<p>${i + 1}. ${l.Lesson_Title}</p>`).join('')
                : '<p>No lessons yet.</p>'
            }
        `;
    } catch (err) {
        document.getElementById('courseDetails').innerHTML = '<p style="color:red;">Failed to load course.</p>';
    }
}

// ============================================================
// EDIT COURSE — populate form
// ============================================================
async function editCourse(id) {
    try {
        const res  = await fetch(`../lms_backend/lms_backend/api/courses/courses.php?action=get&id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Could not load course.'); return; }

        const c = data.data;
        document.getElementById('editCourseId').value     = c.Course_ID;
        document.getElementById('editTitle').value        = c.Course_Title;
        document.getElementById('editDescription').value  = c.Course_Desc || '';
        document.getElementById('editImage').value        = c.Course_Image || '';
        document.getElementById('editStatus').value       = c.Course_Status;

        // Set lecturer dropdown
        const editSelect = document.getElementById('editInstructorId');
        editSelect.value = c.Lec_ID;

        openModal('editCourseModal');
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// UPDATE COURSE
// ============================================================
async function updateCourse() {
    const id = document.getElementById('editCourseId').value;

    const payload = {
        id:            id,
        Course_Title:  document.getElementById('editTitle').value.trim(),
        Course_Desc:   document.getElementById('editDescription').value.trim(),
        Lec_ID:        document.getElementById('editInstructorId').value,
        Course_Image:  document.getElementById('editImage').value.trim(),
        Course_Status: document.getElementById('editStatus').value,
    };

    try {
        const res  = await fetch('../lms_backend/lms_backend/api/courses/courses.php?action=update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            closeModal('editCourseModal');
            loadCourses();
        }
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// DELETE COURSE
// ============================================================
async function deleteCourse(id) {
    if (!confirm('Are you sure you want to delete this course? This will also delete all its lessons.')) return;

    try {
        const res  = await fetch('../lms_backend/lms_backend/api/courses/courses.php?action=delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) loadCourses();
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// MANAGE LESSONS — go to lessons page
// ============================================================
function manageLessons(courseId) {
    window.location.href = 'a_lessons.html?courseId=' + courseId;
}

// ============================================================
// LOGOUT
// ============================================================
document.getElementById('logoutBtn').addEventListener('click', function (e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// ============================================================
// ON PAGE LOAD
// ============================================================
window.addEventListener('load', function () {
    loadLecturers();
    loadCourses();
});