async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('mejoresAmigosUser', JSON.stringify(data.user));
            return data.user;
        } else {
            // Server says no session, clear local storage to stop redirect loop
            localStorage.removeItem('mejoresAmigosUser');
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
    return null;
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('mejoresAmigosUser');
    window.location.href = '/index.html';
}

function getStoredUser() {
    return JSON.parse(localStorage.getItem('mejoresAmigosUser'));
}
