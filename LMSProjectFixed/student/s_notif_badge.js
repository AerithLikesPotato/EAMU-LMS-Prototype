// ============================================================
// s_notif_badge.js — real unread count on every student page
// Always shows actual number. Hides bubble when count is 0.
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
                el.textContent    = count;
                el.style.display  = count > 0 ? '' : 'none';
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
