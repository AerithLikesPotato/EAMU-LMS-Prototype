// ============================================================
// Toggle password visibility — KEEP THIS
// ============================================================
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
        btn.innerHTML = input.type === 'password' ? '<i class="fas fa-eye"></i>' : '<i class="fas fa-eye-slash"></i>';
    });
});

// ============================================================
// LOGIN — connected to backend
// ============================================================
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email      = document.getElementById('username').value.trim();
    const password   = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;

    // Hide any previous error
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.style.display = 'none';

    // Disable button to prevent double submit
    const btn = this.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Signing in...';

    try {
        // Try admin → lecturer → student login
        const authUrl = '../lms_backend/lms_backend/api/auth/auth.php?action=login';
        const roles = ['admin', 'lecturer', 'student'];
        let data = { success: false };

        for (const role of roles) {
            const res = await fetch(authUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password, role })
            });
            data = await res.json();
            if (data.success) break;
        }

        if (data.success) {
            const user = data.data;
            // Ensure token is stored with the user object
            if (!user.token) {
                user.token = btoa(JSON.stringify({ id: user.id, name: user.name, email: user.email, role: user.role }));
            }

            // Store session
            if (rememberMe) {
                localStorage.setItem('currentUser', JSON.stringify(user));
            } else {
                sessionStorage.setItem('currentUser', JSON.stringify(user));
            }

            // Redirect based on role
            if (user.role === 'admin' || user.role === 'lecturer') {
                window.location.href = '../admin/a_dashboard.html';
            } else {
                window.location.href = '../student/s_dashboard.html';
            }

        } else {
            errorDiv.style.display = 'block';
            errorDiv.textContent = 'Invalid email or password.';
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
        }

    } catch (err) {
        errorDiv.style.display = 'block';
        errorDiv.textContent = 'Could not connect to server. Make sure XAMPP is running.';
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Sign In';
    }
});