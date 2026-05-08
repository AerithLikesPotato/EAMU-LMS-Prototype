// ============================================================
// a_settings.js — with auth check and admin display
// ============================================================

// Set current date
document.getElementById("currentDate").textContent =
    new Date().toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

// Check auth
const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
    window.location.href = '../login/index.html';
}
if (document.getElementById('adminName')) {
    document.getElementById('adminName').textContent = currentUser ? currentUser.name : 'Admin';
}
// Pre-fill profile fields
if (currentUser) {
    const nameField = document.getElementById('adminFullName');
    const emailField = document.getElementById('adminEmail');
    if (nameField) nameField.value = currentUser.name || '';
    if (emailField) emailField.value = currentUser.email || '';
}

// Settings functions
function updateProfile() {
    alert("Profile updated successfully!");
}

function changePassword() {
    const current = document.getElementById("currentPassword").value;
    const newPass = document.getElementById("newPassword").value;
    const confirmPass = document.getElementById("confirmPassword").value;

    if (!current || !newPass || !confirmPass) {
        alert("Please fill in all password fields.");
        return;
    }
    if (newPass !== confirmPass) {
        alert("New passwords do not match!");
        return;
    }
    if (newPass.length < 6) {
        alert("Password must be at least 6 characters.");
        return;
    }

    alert("Password has been changed successfully!");
}

function saveSystemSettings() {
    alert("System settings have been saved successfully!");
}

function createBackup() {
    alert("Backup created successfully!");
}

function restoreBackup() {
    alert("Restore completed successfully!");
}

function clearAllData() {
    if (confirm("WARNING: This will delete ALL data. This action cannot be undone. Are you absolutely sure?")) {
        alert("All data has been cleared!");
    }
}

// Logout
document.getElementById("logoutBtn").addEventListener("click", function (e) {
    e.preventDefault();
    sessionStorage.clear();
    localStorage.removeItem('currentUser');
    window.location.href = "../login/index.html";
});