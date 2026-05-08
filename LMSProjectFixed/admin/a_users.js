// ============================================================
// a_users.js — connected to backend
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

// ============================================================
// LOAD USERS (students + lecturers)
// ============================================================
let allUsers = [];

async function loadUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:20px;">Loading...</td></tr>';

    try {
        const [stuRes, lecRes] = await Promise.all([
            fetch(`${API_BASE}/students/students.php?action=list`),
            fetch(`${API_BASE}/lecturers/lecturers.php?action=list`)
        ]);
        const stuData = await stuRes.json();
        const lecData = await lecRes.json();

        allUsers = [];
        if (stuData.success) {
            stuData.data.forEach(s => allUsers.push({
                id: s.Stu_ID, name: s.Stu_Name, username: s.Stu_Email.split('@')[0],
                email: s.Stu_Email, role: 'student', status: s.Stu_Status, type: 'student'
            }));
        }
        if (lecData.success) {
            lecData.data.forEach(l => allUsers.push({
                id: l.Lec_ID, name: l.Lec_Name, username: l.Lec_Email.split('@')[0],
                email: l.Lec_Email, role: 'lecturer', status: l.Lec_Status, type: 'lecturer'
            }));
        }

        renderUsers(allUsers);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="7" style="color:red;text-align:center;padding:20px;">Failed to load users. Is XAMPP running?</td></tr>';
        console.error(err);
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><i class="fas fa-users"></i><p>No users found</p></td></tr>';
        return;
    }
    tbody.innerHTML = users.map(u => `
        <tr>
            <td>${u.id}</td>
            <td>${u.name}</td>
            <td>${u.username}</td>
            <td>${u.email}</td>
            <td><span class="badge badge-${u.role === 'student' ? 'info' : 'warning'}">${u.role}</span></td>
            <td><span class="badge badge-${u.status === 'active' ? 'success' : 'danger'}">${u.status}</span></td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewUser('${u.type}', ${u.id})"><i class="fas fa-eye"></i></button>
                <button class="btn btn-sm btn-warning" onclick="editUser('${u.type}', ${u.id})"><i class="fas fa-edit"></i></button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser('${u.type}', ${u.id})"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

// ============================================================
// SAVE NEW USER
// ============================================================
async function saveUser() {
    const form = document.getElementById('addUserForm');
    const name     = form.querySelector('[name="name"]').value.trim();
    const email    = form.querySelector('[name="email"]').value.trim();
    const password = form.querySelector('[name="password"]').value;
    const role     = form.querySelector('[name="role"]').value;
    const status   = form.querySelector('[name="status"]').value;

    if (!name || !email || !password || !role) {
        alert('Please fill in all required fields.');
        return;
    }

    let url, payload;
    if (role === 'student') {
        url = `${API_BASE}/students/students.php?action=create`;
        payload = { Stu_ID: Math.floor(Math.random() * 90000) + 10000, Stu_Name: name, Stu_Email: email, password: password, Stu_Status: status };
    } else {
        url = `${API_BASE}/lecturers/lecturers.php?action=create`;
        payload = { Lec_Name: name, Lec_Email: email, password: password, Lec_Status: status };
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            form.reset();
            closeModal('addUserModal');
            loadUsers();
        }
    } catch (err) {
        alert('Server error. Check that XAMPP is running.');
    }
}

// ============================================================
// VIEW USER
// ============================================================
async function viewUser(type, id) {
    const detailsDiv = document.getElementById('userDetails');
    detailsDiv.innerHTML = '<p>Loading...</p>';
    openModal('viewUserModal');

    try {
        const endpoint = type === 'student'
            ? `${API_BASE}/students/students.php?action=get&id=${id}`
            : `${API_BASE}/lecturers/lecturers.php?action=get&id=${id}`;
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data.success) {
            const u = data.data;
            if (type === 'student') {
                detailsDiv.innerHTML = `
                    <p><strong>ID:</strong> ${u.Stu_ID}</p>
                    <p><strong>Name:</strong> ${u.Stu_Name}</p>
                    <p><strong>Email:</strong> ${u.Stu_Email}</p>
                    <p><strong>Gender:</strong> ${u.Stu_Gender || 'N/A'}</p>
                    <p><strong>Major:</strong> ${u.Stu_Major || 'N/A'}</p>
                    <p><strong>Year:</strong> ${u.Stu_Year || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${u.Stu_Phone || 'N/A'}</p>
                    <p><strong>Status:</strong> ${u.Stu_Status}</p>
                    <p><strong>Joined:</strong> ${u.Created_At}</p>
                `;
            } else {
                detailsDiv.innerHTML = `
                    <p><strong>ID:</strong> ${u.Lec_ID}</p>
                    <p><strong>Name:</strong> ${u.Lec_Name}</p>
                    <p><strong>Email:</strong> ${u.Lec_Email}</p>
                    <p><strong>Gender:</strong> ${u.Lec_Gender || 'N/A'}</p>
                    <p><strong>Subject:</strong> ${u.Lec_Subject || 'N/A'}</p>
                    <p><strong>Phone:</strong> ${u.Lec_Phone || 'N/A'}</p>
                    <p><strong>Status:</strong> ${u.Lec_Status}</p>
                    <p><strong>Joined:</strong> ${u.Created_At}</p>
                `;
            }
        } else {
            detailsDiv.innerHTML = '<p>User not found.</p>';
        }
    } catch (err) {
        detailsDiv.innerHTML = '<p style="color:red;">Failed to load user.</p>';
    }
}

// ============================================================
// EDIT USER
// ============================================================
let editingUserType = '';

async function editUser(type, id) {
    editingUserType = type;
    try {
        const endpoint = type === 'student'
            ? `${API_BASE}/students/students.php?action=get&id=${id}`
            : `${API_BASE}/lecturers/lecturers.php?action=get&id=${id}`;
        const res = await fetch(endpoint);
        const data = await res.json();

        if (data.success) {
            const u = data.data;
            document.getElementById('editUserId').value = type === 'student' ? u.Stu_ID : u.Lec_ID;
            document.getElementById('editName').value = type === 'student' ? u.Stu_Name : u.Lec_Name;
            document.getElementById('editUsername').value = (type === 'student' ? u.Stu_Email : u.Lec_Email).split('@')[0];
            document.getElementById('editEmail').value = type === 'student' ? u.Stu_Email : u.Lec_Email;
            document.getElementById('editRole').value = type;
            document.getElementById('editStatus').value = type === 'student' ? u.Stu_Status : u.Lec_Status;
            openModal('editUserModal');
        } else {
            alert('Could not load user.');
        }
    } catch (err) {
        alert('Server error.');
    }
}

async function updateUser() {
    const id = document.getElementById('editUserId').value;
    const name   = document.getElementById('editName').value.trim();
    const email  = document.getElementById('editEmail').value.trim();
    const status = document.getElementById('editStatus').value;
    const password = document.getElementById('editUserForm').querySelector('[name="password"]').value;

    let url, payload;
    if (editingUserType === 'student') {
        url = `${API_BASE}/students/students.php?action=update`;
        payload = { id: id, Stu_Name: name, Stu_Email: email, Stu_Status: status };
        if (password) payload.password = password;
    } else {
        url = `${API_BASE}/lecturers/lecturers.php?action=update`;
        payload = { id: id, Lec_Name: name, Lec_Email: email, Lec_Status: status };
        if (password) payload.password = password;
    }

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) {
            closeModal('editUserModal');
            loadUsers();
        }
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// DELETE USER
// ============================================================
async function deleteUser(type, id) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    const url = type === 'student'
        ? `${API_BASE}/students/students.php?action=delete`
        : `${API_BASE}/lecturers/lecturers.php?action=delete`;

    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: id })
        });
        const data = await res.json();
        alert(data.message);
        if (data.success) loadUsers();
    } catch (err) {
        alert('Server error.');
    }
}

// ============================================================
// SEARCH
// ============================================================
document.getElementById('searchUsers').addEventListener('keyup', function() {
    const query = this.value.toLowerCase();
    const filtered = allUsers.filter(u =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.username.toLowerCase().includes(query)
    );
    renderUsers(filtered);
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', function(e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = '../login/index.html';
});

// On page load
window.addEventListener('load', function() {
    loadUsers();
});