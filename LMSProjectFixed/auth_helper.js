// ============================================================
// auth_helper.js — shared auth utility
// Include this BEFORE any page-specific JS
// ============================================================

(function () {
    // ---- Retrieve stored user from session or local storage ----
    function getStoredUser() {
        try {
            return JSON.parse(sessionStorage.getItem('currentUser')) ||
                   JSON.parse(localStorage.getItem('currentUser')) ||
                   null;
        } catch (e) {
            return null;
        }
    }

    // ---- Patch fetch to always include Authorization header ----
    const _originalFetch = window.fetch.bind(window);
    window.fetch = function (url, options) {
        options = options || {};
        options.headers = options.headers || {};
        // Convert headers to plain object if it's a Headers instance
        if (options.headers instanceof Headers) {
            const plain = {};
            options.headers.forEach((v, k) => { plain[k] = v; });
            options.headers = plain;
        }
        const user = getStoredUser();
        if (user && user.token && !options.headers['Authorization']) {
            options.headers['Authorization'] = 'Bearer ' + user.token;
        }
        // Always send credentials for same-origin requests
        if (!options.credentials) {
            options.credentials = 'include';
        }
        return _originalFetch(url, options);
    };
})();
