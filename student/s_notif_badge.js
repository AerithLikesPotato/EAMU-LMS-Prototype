// ============================================================
// s_notif_badge.js — real unread count on every student page
// 0  → hide badge
// 1–9 → show exact number
// 10+ → show "9+"
// ============================================================
(function () {
    var NOTIF_API = '../lms_backend/lms_backend/api/notifications/notifications.php';

    async function loadNotifBadge() {
        var stored = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
        var user   = stored ? JSON.parse(stored) : null;
        if (!user) return;

        try {
            var res  = await fetch(NOTIF_API + '?action=unread_count&recipient_id=' + user.id + '&role=student');
            var data = await res.json();
            var count = (data.success && data.data) ? (parseInt(data.data.count) || 0) : 0;

            document.querySelectorAll('.notification-badge').forEach(function(el) {
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
        } catch (e) {
            document.querySelectorAll('.notification-badge').forEach(function(el) {
                el.style.display = 'none';
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', loadNotifBadge);
    } else {
        loadNotifBadge();
    }

    setInterval(loadNotifBadge, 60000);
    window.refreshNotifBadge = loadNotifBadge;
})();
