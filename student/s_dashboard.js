// ====================== AUTHENTICATION ======================

// Check authentication
function checkAuth() {
    const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
    
    if (!currentUser) {
        window.location.href = '../login/index.html';
        return null;
    }
    return currentUser;
}

// Toggle user dropdown menu
function toggleUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Close dropdown when clicking outside
window.addEventListener('click', function(event) {
    const dropdown = document.getElementById('userDropdown');
    const userProfile = document.querySelector('.user-profile');
    
    if (userProfile && !userProfile.contains(event.target) && dropdown && !dropdown.contains(event.target)) {
        dropdown.classList.remove('show');
    }
});

// Logout functionality
document.getElementById('logoutBtn')?.addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// ====================== SEARCH ======================

// Search functionality
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            const query = this.value.trim();
            if (query !== '') {
                window.location.href = `search-results.html?q=${encodeURIComponent(query)}`;
            }
        }
    });
}

// ====================== SMOOTH SCROLL ======================

// Smooth scroll to section function
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        
        const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Update URL hash without jumping
        history.pushState(null, null, `#${sectionId}`);
    }
}

// Prevent default anchor click behavior for smooth scroll links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && href.startsWith('#')) {
            e.preventDefault();
            const sectionId = href.substring(1);
            scrollToSection(sectionId);
        }
    });
});

// ====================== PAGE LOAD ======================

// Main page load function
window.addEventListener('load', function() {
    // Check authentication
    const currentUser = checkAuth();
    if (!currentUser) return;
    
    // Set user name from session if elements exist
    const headerUserName = document.getElementById('headerUserName');
    if (headerUserName) {
        headerUserName.innerHTML = currentUser.name;
    }
    
    const welcomeUserName = document.getElementById('welcomeUserName');
    if (welcomeUserName) {
        welcomeUserName.innerHTML = currentUser.name.split(' ')[0];
    }

    // Update user name in header nav
    const userNameSpan = document.querySelector('.user-name');
    if (userNameSpan) {
        userNameSpan.textContent = currentUser.name;
    }

    // Update welcome section
    const welcomeSpan = document.querySelector('.welcome-text h1 span');
    if (welcomeSpan) {
        welcomeSpan.textContent = currentUser.name.split('_').join(' ');
    }
    
    // Handle hash for smooth scrolling
    const hash = window.location.hash;
    if (hash) {
        const sectionId = hash.substring(1);
        setTimeout(() => {
            scrollToSection(sectionId);
        }, 100);
    }

    // Load dynamic content from backend ONLY on dashboard page
    // (sub-pages have their own load handlers to avoid duplicate calls)
    const isDashboard = window.location.pathname.endsWith('s_dashboard.html');
    if (isDashboard) {
        renderActiveCourses();
        renderOtherPrograms();
        renderCompletedCourses();
    }
});

// Handle active nav link on scroll
window.addEventListener('scroll', function() {
    const sections = ['welcome-section', 'active-courses', 'completed-courses', 'other-programs', 'about-section'];
    const scrollPosition = window.scrollY + 150;
    
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            const sectionTop = section.offsetTop;
            const sectionBottom = sectionTop + section.offsetHeight;
            
            if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
                document.querySelectorAll('.nav-link').forEach(link => {
                    link.classList.remove('active');
                });
                
                const activeLink = document.querySelector(`.nav-link[href="#${sectionId}"]`);
                if (activeLink) {
                    activeLink.classList.add('active');
                }
            }
        }
    });
});

// ====================== API CONFIG ======================
const API_BASE = '../lms_backend/lms_backend/api';

// ====================== HELPER ======================
function formatDate(dateString) {
    if (!dateString) return 'Date TBD';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch (e) {
        return 'Date TBD';
    }
}

function emptyStateHTML(icon, title, message) {
    return `<div class="empty-state">
        <i class="fas ${icon}"></i>
        <h3>${title}</h3>
        <p>${message}</p>
    </div>`;
}

// ====================== COURSE FUNCTIONS (Backend-connected) ======================

// Render active courses (enrolled, status=active)
async function renderActiveCourses() {
    const container = document.getElementById('active-courses-container');
    if (!container) return;
    const currentUser = checkAuth();
    if (!currentUser) return;

    container.innerHTML = '<p style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

    try {
        const res = await fetch(`${API_BASE}/enrollment/enrollment.php?action=list&student_id=${currentUser.id}`);
        const data = await res.json();
        if (!data.success) { container.innerHTML = emptyStateHTML('fa-book-open', 'No Active Courses', 'You are not enrolled in any courses yet.'); return; }

        const active = data.data.filter(e => e.Enroll_Status === 'active');
        if (active.length === 0) { container.innerHTML = emptyStateHTML('fa-book-open', 'No Active Courses', 'Browse Other Programs to enroll in a course.'); return; }

        container.innerHTML = active.map(e => {
            const total = parseInt(e.Total_Lessons) || 0;
            const done  = parseInt(e.Completed_Lessons) || 0;
            const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
            return `
            <div class="course-card">
                <img src="${e.Course_Image || 'https://via.placeholder.com/500x300/9b4399/ffffff?text=' + encodeURIComponent(e.Course_Title)}" class="card-image" alt="${e.Course_Title}">
                <div class="card-content">
                    <h3>${e.Course_Title}</h3>
                    <p>${e.Course_Desc ? e.Course_Desc.substring(0, 100) + '...' : 'No description'}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-user-tie"></i> ${e.Lec_Name}</span>
                        <span><i class="fas fa-clock"></i> ${done}/${total} lessons</span>
                    </div>
                    <div class="progress-container">
                        <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
                        <div class="progress-text"><span>Overall Progress</span><span>${pct}%</span></div>
                    </div>
                    <div class="card-actions">
                        <a href="s_course_player.html?id=${e.Course_ID}" class="btn-action btn-primary"><i class="fas fa-play"></i> Continue</a>
                        <a href="s_course_detail_active.html?id=${e.Course_ID}" class="btn-action btn-secondary"><i class="fas fa-info-circle"></i> Details</a>
                    </div>
                </div>
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Failed to load active courses:', err);
        container.innerHTML = emptyStateHTML('fa-exclamation-triangle', 'Error', 'Could not load active courses. Make sure the server is running.');
    }
}

// Render other programs (all courses NOT enrolled by this student)
async function renderOtherPrograms() {
    const container = document.getElementById('other-programs-container');
    if (!container) return;
    const currentUser = checkAuth();
    if (!currentUser) return;

    container.innerHTML = '<p style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

    try {
        // Fetch all courses + student enrollments in parallel
        const [coursesRes, enrollRes] = await Promise.all([
            fetch(`${API_BASE}/courses/courses.php?action=list`),
            fetch(`${API_BASE}/enrollment/enrollment.php?action=list&student_id=${currentUser.id}`)
        ]);
        const coursesData = await coursesRes.json();
        const enrollData  = await enrollRes.json();

        const enrolledIds = new Set((enrollData.data || []).map(e => String(e.Course_ID)));
        const available = (coursesData.data || []).filter(c => !enrolledIds.has(String(c.Course_ID)));

        if (available.length === 0) { container.innerHTML = emptyStateHTML('fa-file-alt', 'No Other Programs', 'You are enrolled in all available courses!'); return; }

        container.innerHTML = available.map(c => `
            <div class="course-card">
                <img src="${c.Course_Image || 'https://via.placeholder.com/500x300/761176/ffffff?text=' + encodeURIComponent(c.Course_Title)}" class="card-image" alt="${c.Course_Title}">
                <div class="card-content">
                    <h3>${c.Course_Title}</h3>
                    <p>${c.Course_Desc ? c.Course_Desc.substring(0, 100) + '...' : 'No description'}</p>
                    <div class="card-meta">
                        <span><i class="fas fa-user-tie"></i> ${c.Lec_Name}</span>
                        <span><i class="fas fa-users"></i> ${c.Student_Count || 0} students</span>
                        <span><i class="fas fa-book-open"></i> ${c.Lesson_Count || 0} lessons</span>
                    </div>
                    <div class="card-actions">
                        <button class="btn-action btn-primary" onclick="enrollCourse(${c.Course_ID})"><i class="fas fa-plus-circle"></i> Join Now</button>
                        <a href="s_course_detail_op.html?id=${c.Course_ID}" class="btn-action btn-secondary"><i class="fas fa-info-circle"></i> Details</a>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) {
        console.error('Failed to load other programs:', err);
        container.innerHTML = emptyStateHTML('fa-exclamation-triangle', 'Error', 'Could not load courses.');
    }
}

// Render completed courses
async function renderCompletedCourses() {
    const container = document.getElementById('completed-courses-container');
    if (!container) return;
    const currentUser = checkAuth();
    if (!currentUser) return;

    container.innerHTML = '<p style="padding:20px;text-align:center;"><i class="fas fa-spinner fa-spin"></i> Loading...</p>';

    try {
        const [enrollRes, certRes] = await Promise.all([
            fetch(`${API_BASE}/enrollment/enrollment.php?action=list&student_id=${currentUser.id}`),
            fetch(`${API_BASE}/certificates/certificates.php?action=mine&stu_id=${currentUser.id}`)
        ]);
        const enrollData = await enrollRes.json();
        const certData   = await certRes.json();

        const completed = (enrollData.data || []).filter(e => e.Enroll_Status === 'completed');
        const certs = certData.data || [];

        if (completed.length === 0) { container.innerHTML = emptyStateHTML('fa-clipboard-check', 'No Completed Courses', 'Complete your active courses to earn certificates!'); return; }

        container.innerHTML = completed.map(e => {
            const cert = certs.find(c => String(c.Course_ID) === String(e.Course_ID));
            return `
            <div class="completed-item">
                <div class="completed-icon"><i class="fas fa-check-circle"></i></div>
                <div class="completed-info">
                    <h4>${e.Course_Title}</h4>
                    <p>${cert ? 'Certificate earned' : 'Completed'}</p>
                    <span class="completion-date">Enrolled: ${formatDate(e.Enroll_Date)}</span>
                </div>
                ${cert ? `<a href="s_certificate.html?id=${cert.Cert_ID}" class="btn-certificate"><i class="fas fa-certificate"></i> Certificate</a>` : ''}
            </div>`;
        }).join('');
    } catch (err) {
        console.error('Failed to load completed courses:', err);
        container.innerHTML = emptyStateHTML('fa-exclamation-triangle', 'Error', 'Could not load completed courses.');
    }
}

// Enroll in course
async function enrollCourse(courseId) {
    const currentUser = checkAuth();
    if (!currentUser) return;

    if (!confirm('Are you sure you want to enroll in this course?')) return;

    try {
        const res = await fetch(`${API_BASE}/enrollment/enrollment.php?action=enroll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Stu_ID: currentUser.id, Course_ID: courseId })
        });
        const data = await res.json();
        if (data.success) {
            alert('Enrolled successfully!');
            // Refresh all sections
            renderActiveCourses();
            renderOtherPrograms();
        } else {
            alert(data.message || 'Enrollment failed.');
        }
    } catch (err) {
        alert('Could not connect to server.');
    }
}

// Continue course
function continueCourse(courseId) {
    window.location.href = `s_course_player.html?id=${courseId}`;
}

// View course details
function viewCourseDetails(courseId) {
    window.location.href = `s_course_detail_op.html?id=${courseId}`;
}

// View program details
function viewProgramDetails(programId) {
    window.location.href = `s_course_detail_op.html?id=${programId}`;
}

// View certificate
function viewCertificate(certificateId) {
    window.location.href = `s_certificate.html?id=${certificateId}`;
}