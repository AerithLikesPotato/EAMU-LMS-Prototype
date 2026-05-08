// ============================================================
// a_dashboard.js — connected to backend
// ============================================================

// Set current date
document.getElementById('currentDate').textContent = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
});

// Check auth
const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '../login/index.html';
}
if (document.getElementById('adminName')) {
    document.getElementById('adminName').textContent = currentUser ? currentUser.name : 'Admin';
}

// Load dashboard stats from backend
async function loadDashboardStats() {
    const statsGrid = document.getElementById('statsGrid');
    try {
        const res = await fetch('../lms_backend/lms_backend/api/courses/courses.php?action=dashboard');
        const data = await res.json();
        if (data.success) {
            const s = data.data;
            const cards = statsGrid.querySelectorAll('.stat-card');
            if (cards[0]) cards[0].querySelector('h3').textContent = s.total_students || 0;
            if (cards[1]) cards[1].querySelector('h3').textContent = s.total_courses || 0;
            if (cards[2]) cards[2].querySelector('h3').textContent = s.total_lessons || 0;
            if (cards[3]) {
                cards[3].querySelector('h3').textContent = s.certificates_issued || 0;
                cards[3].querySelector('p').textContent = 'Certificates';
            }

            // Render recent activity
            const activityList = document.getElementById('activityList');
            if (s.recent_enrollments && s.recent_enrollments.length > 0) {
                activityList.innerHTML = s.recent_enrollments.map(e => `
                    <div class="activity-item" style="padding:12px 15px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-user-plus" style="color:var(--primary-color);"></i>
                        <div>
                            <strong>${e.Stu_Name}</strong> enrolled in <strong>${e.Course_Title}</strong>
                            <br><small style="color:#888;">${e.Enroll_Date}</small>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (err) {
        console.error('Failed to load dashboard stats:', err);
    }
}

// Logout function
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// On page load
window.addEventListener('load', function() {
    loadDashboardStats();
});