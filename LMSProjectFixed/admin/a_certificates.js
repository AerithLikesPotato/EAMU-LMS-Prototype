// ============================================================
// a_certificates.js — connected to backend
// ============================================================
const CERT_API = '../lms_backend/lms_backend/api/certificates/certificates.php';

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

let allCertificates = [];

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

window.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
});

// Load certificates from backend
async function loadCertificates() {
    try {
        const res = await fetch(`${CERT_API}?action=list`);
        const data = await res.json();

        if (!data.success) {
            console.error('Failed to load certificates');
            return;
        }

        allCertificates = data.data;
        renderCertificates(allCertificates);
    } catch (err) {
        console.error('Failed to load certificates:', err);
    }
}

function renderCertificates(certs) {
    const container = document.querySelector('.certificates-grid') || document.querySelector('.certificates-list') || document.querySelector('.cards-grid');
    if (!container) return;

    if (certs.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-certificate"></i><h3>No Certificates</h3><p>No certificates have been issued yet.</p></div>';
        return;
    }

    container.innerHTML = certs.map(c => `
        <div class="card">
            <div class="card-body">
                <h3 class="card-title"><i class="fas fa-certificate" style="color:gold;"></i> ${c.Course_Title}</h3>
                <p class="card-text"><strong>Student:</strong> ${c.Stu_Name} (${c.Stu_Email})</p>
                <div class="card-meta">
                    <span><i class="fas fa-hashtag"></i> ${c.Cert_Code || 'N/A'}</span>
                    <span><i class="fas fa-calendar"></i> ${c.Issue_Date ? new Date(c.Issue_Date).toLocaleDateString() : 'N/A'}</span>
                    <span class="badge ${c.Cert_Status === 'active' ? 'badge-success' : 'badge-danger'}">${c.Cert_Status || 'active'}</span>
                </div>
            </div>
            <div class="card-actions">
                <button class="btn btn-sm btn-info" onclick="viewCertificate(${c.Cert_ID})"><i class="fas fa-eye"></i> View</button>
                ${c.Cert_Status === 'active' ? `<button class="btn btn-sm btn-danger" onclick="revokeCertificate(${c.Cert_ID})"><i class="fas fa-ban"></i> Revoke</button>` : ''}
            </div>
        </div>
    `).join('');
}

// Filter certificates
function filterCertificates(btn, filterType) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (filterType === 'all') {
        renderCertificates(allCertificates);
    } else {
        renderCertificates(allCertificates.filter(c => (c.Cert_Status || 'active') === filterType));
    }
}

// View certificate
async function viewCertificate(id) {
    try {
        const res = await fetch(`${CERT_API}?action=get&id=${id}`);
        const data = await res.json();
        if (!data.success) { alert('Could not load certificate.'); return; }

        const c = data.data;
        const modalBody = document.querySelector('#viewCertificateModal .modal-body') || document.getElementById('certificateDetails');
        if (modalBody) {
            modalBody.innerHTML = `
                <div style="text-align:center;padding:20px;">
                    <i class="fas fa-certificate" style="font-size:5rem;color:gold;"></i>
                    <h2 style="margin-top:15px;">${c.Course_Title}</h2>
                    <p style="font-size:1.2rem;margin-top:10px;">Awarded to <strong>${c.Stu_Name}</strong></p>
                    <p style="color:#888;">Certificate Code: <strong>${c.Cert_Code}</strong></p>
                    <p style="color:#888;">Issued: ${c.Issue_Date ? new Date(c.Issue_Date).toLocaleDateString() : 'N/A'}</p>
                    <p style="color:#888;">Instructor: ${c.Lec_Name || 'N/A'}</p>
                    <p><span class="badge ${c.Cert_Status === 'active' ? 'badge-success' : 'badge-danger'}">${c.Cert_Status || 'active'}</span></p>
                </div>
            `;
        }
        openModal('viewCertificateModal');
    } catch (err) {
        alert('Server error.');
    }
}

// Revoke certificate
async function revokeCertificate(id) {
    if (!confirm('Are you sure you want to revoke this certificate?')) return;
    try {
        const res = await fetch(`${CERT_API}?action=revoke`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) loadCertificates();
    } catch (err) {
        alert('Server error.');
    }
}

// Generate certificates (bulk)
function generateBulkCertificates() {
    openModal('bulkGenerateModal');
}

async function generateCertificates() {
    const stuId = document.getElementById('bulkStudentId')?.value;
    const courseId = document.getElementById('bulkCourseId')?.value;
    if (!stuId || !courseId) { alert('Please select student and course.'); return; }

    try {
        const res = await fetch(`${CERT_API}?action=generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Stu_ID: stuId, Course_ID: courseId })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            closeModal('bulkGenerateModal');
            loadCertificates();
        }
    } catch (err) {
        alert('Server error.');
    }
}

// Download / Print / Email (client-side actions)
function downloadCertificate(id) {
    alert('Download functionality requires PDF generation on server.');
}

function emailCertificate(id) {
    alert('Email functionality requires SMTP configuration.');
}

function printCertificate(id) {
    window.print();
}

function exportCertificates() {
    alert('Export functionality coming soon.');
}

// Search certificates
document.getElementById('searchCertificates')?.addEventListener('keyup', function() {
    const query = this.value.toLowerCase();
    const filtered = allCertificates.filter(c => 
        c.Stu_Name.toLowerCase().includes(query) || 
        c.Course_Title.toLowerCase().includes(query) || 
        (c.Cert_Code || '').toLowerCase().includes(query)
    );
    renderCertificates(filtered);
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// On page load
window.addEventListener('load', loadCertificates);