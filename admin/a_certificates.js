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

// ── Certificate PDF download & print ──────────────────────
async function downloadCertificate(id) {
    await _certAction(id, 'download');
}

function emailCertificate(id) {
    alert('Email functionality requires SMTP configuration.');
}

async function _certAction(id, mode) {
    // Load certificate data
    let c;
    try {
        const res  = await fetch(`${CERT_API}?action=get&id=${id}`);
        const data = await res.json();
        if (!data.success || !data.data) { alert('Could not load certificate.'); return; }
        c = data.data;
    } catch(e) { alert('Server error.'); return; }

    const issueDate = c.Issue_Date
        ? new Date(c.Issue_Date).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })
        : 'N/A';

    // Build an off-screen certificate element
    const certEl = document.createElement('div');
    certEl.id = 'adminCertCanvas';
    certEl.style.cssText = [
        'position:fixed', 'left:-9999px', 'top:0',
        'width:1122px', 'height:794px',   // A4 landscape px at 96dpi
        'background:#fff', 'overflow:hidden',
        'font-family:Poppins,sans-serif',
        'box-sizing:border-box'
    ].join(';');

    certEl.innerHTML = `
        <div style="position:absolute;left:0;top:0;bottom:0;width:10px;background:linear-gradient(180deg,#9b4399,#6b1b7a,#9b4399);"></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:10px;background:linear-gradient(180deg,#9b4399,#6b1b7a,#9b4399);"></div>
        <div style="position:absolute;inset:14px;border:3px solid #9b4399;pointer-events:none;"></div>
        <div style="position:absolute;inset:20px;border:1px solid #d5a0d5;pointer-events:none;"></div>
        <div style="position:absolute;top:10px;left:10px;width:60px;height:60px;border-top:5px solid #9b4399;border-left:5px solid #9b4399;"></div>
        <div style="position:absolute;top:10px;right:10px;width:60px;height:60px;border-top:5px solid #9b4399;border-right:5px solid #9b4399;"></div>
        <div style="position:absolute;bottom:10px;left:10px;width:60px;height:60px;border-bottom:5px solid #9b4399;border-left:5px solid #9b4399;"></div>
        <div style="position:absolute;bottom:10px;right:10px;width:60px;height:60px;border-bottom:5px solid #9b4399;border-right:5px solid #9b4399;"></div>
        <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;">
            <span style="font-size:200px;font-weight:900;color:rgba(155,67,153,0.04);letter-spacing:-0.02em;">EAMU</span>
        </div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 90px;text-align:center;box-sizing:border-box;z-index:4;">
            <div style="font-size:11px;font-weight:700;letter-spacing:4px;color:#9b4399;text-transform:uppercase;margin-bottom:6px;">East Asia Management University</div>
            <div style="font-size:38px;color:#2d1b4e;font-weight:700;line-height:1.1;margin-bottom:8px;">Certificate of Completion</div>
            <div style="width:120px;height:3px;background:linear-gradient(90deg,transparent,#9b4399,transparent);margin:8px auto;"></div>
            <div style="font-size:12px;color:#888;margin-bottom:6px;letter-spacing:1px;">This certificate is proudly presented to</div>
            <div style="font-size:32px;color:#1a1a2e;font-weight:700;margin:4px 0 10px;padding-bottom:6px;border-bottom:2px dashed #c87cc8;display:inline-block;">${c.Stu_Name || '—'}</div>
            <div style="font-size:12px;color:#888;margin-bottom:6px;letter-spacing:1px;">for successfully completing the course</div>
            <div style="font-size:17px;font-weight:700;color:#6b1b7a;margin-bottom:8px;">${c.Course_Title || '—'}</div>
            <div style="font-size:11px;color:#999;margin-bottom:18px;">Issued on: ${issueDate}</div>
            <div style="display:flex;justify-content:center;gap:120px;margin-top:4px;">
                <div style="text-align:center;">
                    <div style="width:130px;height:1.5px;background:#333;margin:0 auto 4px;"></div>
                    <div style="font-size:11px;font-weight:700;color:#333;">Prof. Jame Chou</div>
                    <div style="font-size:10px;color:#999;">Vice Chancellor</div>
                </div>
                <div style="text-align:center;">
                    <div style="width:130px;height:1.5px;background:#333;margin:0 auto 4px;"></div>
                    <div style="font-size:11px;font-weight:700;color:#333;">Prof. Roland</div>
                    <div style="font-size:10px;color:#999;">Academic Department</div>
                </div>
            </div>
        </div>
        <div style="position:absolute;bottom:26px;right:36px;font-size:9px;color:#bbb;z-index:5;">Certificate ID: ${c.Cert_Code || '—'}</div>
        <div style="position:absolute;bottom:24px;left:36px;width:60px;height:60px;border-radius:50%;border:3px solid #9b4399;display:flex;align-items:center;justify-content:center;background:#fdf5ff;z-index:5;">
            <i class="fas fa-award" style="font-size:1.4rem;color:#9b4399;"></i>
        </div>
    `;
    document.body.appendChild(certEl);

    try {
        const canvas = await html2canvas(certEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 1122,
            height: 794
        });

        if (mode === 'download') {
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
            const name = (c.Stu_Name || 'Student').replace(/\s+/g, '_');
            pdf.save(`Certificate_${name}.pdf`);
}
    } catch (err) {
        console.error('Certificate generation failed:', err);
        alert('Failed to generate certificate. Please try again.');
    }

    document.body.removeChild(certEl);
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