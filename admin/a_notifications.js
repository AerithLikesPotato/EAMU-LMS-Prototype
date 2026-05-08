// ============================================================
// a_notifications.js — shows real system activity for admin
// ============================================================
(function() {
const NOTIF_API = '../lms_backend/lms_backend/api/notifications/notifications.php';

// Date display
const dateEl = document.getElementById('currentDate');
if (dateEl && !dateEl.textContent.trim()) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
}

// Auth
const currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) { window.location.href = '../login/index.html'; }
const adminNameEl = document.getElementById('adminName');
if (adminNameEl && !adminNameEl.textContent.trim()) {
    adminNameEl.textContent = currentUser ? currentUser.name : 'Admin';
}

// ─── helpers ───────────────────────────────────────────────
function getTimeAgo(dateStr) {
    if (!dateStr) return '—';
    var diff    = Date.now() - new Date(dateStr).getTime();
    var minutes = Math.floor(diff / 60000);
    if (minutes < 1)  return 'Just now';
    if (minutes < 60) return minutes + ' min ago';
    var hours = Math.floor(minutes / 60);
    if (hours < 24)   return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
    var days = Math.floor(hours / 24);
    return days + ' day' + (days > 1 ? 's' : '') + ' ago';
}

var iconMap  = { enrollment: 'fa-user-plus',   submission: 'fa-file-alt',
                 completion: 'fa-graduation-cap', registration: 'fa-user-check' };
var colorMap = { enrollment: '#4a90d9',         submission:  '#f59e0b',
                 completion: '#10b981',          registration: '#8b5cf6' };
var labelMap = { enrollment: 'Enrollment',       submission:  'Submission',
                 completion: 'Completion',        registration: 'Registration' };

var allActivities = [];
var currentFilter = 'all';

// ─── load activity feed ────────────────────────────────────
async function loadNotifications() {
    const list = document.querySelector('.notifications-list');
    if (!list) return;
    list.innerHTML = '<div style="text-align:center;padding:40px;"><i class="fas fa-spinner fa-spin fa-2x" style="color:#9b4399;"></i><p style="margin-top:12px;color:#888;">Loading activity...</p></div>';

    try {
        const res  = await fetch(NOTIF_API + '?action=admin_activity');
        const data = await res.json();

        if (!data.success || !data.data || data.data.length === 0) {
            list.innerHTML = '<div style="text-align:center;padding:60px;color:#888;"><i class="fas fa-inbox fa-3x" style="opacity:0.3;"></i><p style="margin-top:16px;font-size:1.1rem;">No activity yet.</p></div>';
            allActivities = [];
            loadRealUnreadCount();
            return;
        }

        allActivities = data.data;
        renderList(allActivities);
        loadRealUnreadCount();
    } catch (err) {
        console.error('Failed to load admin activity:', err);
        list.innerHTML = '<div style="text-align:center;padding:40px;color:#e53e3e;"><i class="fas fa-exclamation-triangle"></i> Failed to load activity.</div>';
    }
}

function renderList(items) {
    const list = document.querySelector('.notifications-list');
    if (!list) return;

    var filtered = currentFilter === 'all' ? items
        : items.filter(function(a){ return a.act_type === currentFilter; });

    if (filtered.length === 0) {
        list.innerHTML = '<div style="text-align:center;padding:40px;color:#888;"><i class="fas fa-filter fa-2x" style="opacity:0.3;"></i><p style="margin-top:12px;">No ' + currentFilter + ' activity.</p></div>';
        return;
    }

    list.innerHTML = filtered.map(function(a) {
        var icon  = iconMap[a.act_type]  || 'fa-bell';
        var color = colorMap[a.act_type] || '#9b4399';
        var label = labelMap[a.act_type] || a.act_type;
        return '<div class="notification-item" style="display:flex;align-items:flex-start;gap:15px;padding:16px 20px;border-bottom:1px solid #f0f0f0;transition:background 0.15s;" onmouseover="this.style.background=\'#fafafa\'" onmouseout="this.style.background=\'\'">'+
            '<div style="min-width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:' + color + '18;">'+
                '<i class="fas ' + icon + '" style="color:' + color + ';font-size:1.1rem;"></i>'+
            '</div>'+
            '<div style="flex:1;min-width:0;">'+
                '<div style="font-size:0.92rem;color:#2d3748;line-height:1.5;margin-bottom:4px;">' + (a.act_text || '') + '</div>'+
                '<div style="display:flex;align-items:center;gap:10px;">'+
                    '<span style="font-size:0.75rem;font-weight:600;padding:2px 10px;border-radius:20px;background:' + color + '18;color:' + color + ';">' + label + '</span>'+
                    '<span style="font-size:0.75rem;color:#a0aec0;"><i class="fas fa-clock" style="margin-right:3px;"></i>' + getTimeAgo(a.act_time) + '</span>'+
                '</div>'+
            '</div>'+
        '</div>';
    }).join('');
}

function updateBadge(count) {
    // Update all badge elements on the page
    var selectors = ['#notifBadge', '.notification-icon .badge', '#notificationBadge'];
    selectors.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(badge) {
            if (count <= 0) {
                badge.style.display = 'none';
                badge.textContent   = '';
            } else if (count >= 10) {
                badge.style.display = '';
                badge.textContent   = '9+';
            } else {
                badge.style.display = '';
                badge.textContent   = String(count);
            }
        });
    });
}

// ─── fetch real unread count from DB ───────────────────────
async function loadRealUnreadCount() {
    var stored = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
    var user   = stored ? JSON.parse(stored) : null;
    if (!user) return;
    var rid = user.id || user.admin_id || user.user_id;
    try {
        var res  = await fetch(NOTIF_API + '?action=unread_count&recipient_id=' + rid + '&role=admin');
        var data = await res.json();
        var count = (data.success && data.data) ? (parseInt(data.data.count) || 0) : 0;
        updateBadge(count);
    } catch(e) { /* ignore */ }
}

// ─── filter buttons ────────────────────────────────────────
function filterNotifications(btn, filterType) {
    document.querySelectorAll('.filter-btn').forEach(function(b){ b.classList.remove('active'); });
    btn.classList.add('active');
    currentFilter = filterType;
    renderList(allActivities);
}

// ─── mark all read (for sent notifications, not activity) ──
async function markAllAsRead() {
    // Activity feed is read-only, just reload
    await loadNotifications();
}

// ─── logout ────────────────────────────────────────────────
const logoutEl = document.getElementById('logoutBtn');
if (logoutEl && !logoutEl._notifBound) {
    logoutEl._notifBound = true;
    logoutEl.addEventListener('click', function(e) {
        e.preventDefault();
        sessionStorage.clear();
        localStorage.removeItem('currentUser');
        window.location.href = '../login/index.html';
    });
}

window.loadNotifications   = loadNotifications;
window.filterNotifications = filterNotifications;
window.markAllAsRead       = markAllAsRead;

window.addEventListener('load', function() { loadNotifications(); loadRealUnreadCount(); });
})();
