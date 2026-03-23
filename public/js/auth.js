async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                localStorage.setItem('mejoresAmigosUser', JSON.stringify(data.user));
                return data.user;
            }
        } else if (res.status === 401) {
            // FIX: Clear local storage on 401 Unauthorized
            localStorage.removeItem('mejoresAmigosUser');
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
    return null;
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('mejoresAmigosUser'));
    } catch (e) {
        return null;
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('mejoresAmigosUser');
    window.location.href = '/index.html';
}
