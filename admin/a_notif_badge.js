// ============================================================
// a_notif_badge.js — real unread count on every admin page
// 0  → hide badge
// 1–9 → show exact number
// 10+ → show "9+"
// ============================================================
(function () {
    var NOTIF_API = '../lms_backend/lms_backend/api/notifications/notifications.php';

    async function loadAdminNotifBadge() {
        var stored = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        var user   = stored ? JSON.parse(stored) : null;
        if (!user) return;

        // Use admin role; fall back to user.id
        var recipientId = user.id || user.admin_id || user.user_id;
        var role = 'admin';

        try {
            var res  = await fetch(NOTIF_API + '?action=unread_count&recipient_id=' + recipientId + '&role=' + role);
            var data = await res.json();
            var count = (data.success && data.data) ? (parseInt(data.data.count) || 0) : 0;

            // Also count unread 'all' type notifications via list endpoint
            // (unread_count already includes Recipient_Type='all' per the backend query)

            // Target both .badge inside .notification-icon AND #notificationBadge
            var selectors = ['.notification-icon .badge', '#notificationBadge', '.notification-icon .notification-badge'];
            selectors.forEach(function(sel) {
                document.querySelectorAll(sel).forEach(function(el) {
                    if (count <= 0) {
                        el.style.display = 'none';
                        el.textContent   = '';
                    } else if (count >= 10) {
                        el.style.display = '';
                        el.textContent   = '9+';
                    } else {
                        el.style.display = '';
                        el.textContent   = String(count);
                    }
                });
            });
        } catch (e) {
            var selectors = ['.notification-icon .badge', '#notificationBadge', '.notification-icon .notification-badge'];
            selectors.forEach(function(sel) {
                document.querySelectorAll(sel).forEach(function(el) {
                    el.style.display = 'none';
                });
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadAdminNotifBadge);
    } else {
        loadAdminNotifBadge();
    }

    setInterval(loadAdminNotifBadge, 60000);
    window.refreshAdminNotifBadge = loadAdminNotifBadge;
})();
