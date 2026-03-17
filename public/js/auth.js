async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('mejoresAmigosUser', JSON.stringify(data.user));
            return data.user;
        }
    } catch (e) {}
    return null;
}

async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    localStorage.removeItem('mejoresAmigosUser');
    window.location.href = '/index.html';
}

function getStoredUser() {
    return JSON.parse(localStorage.getItem('mejoresAmigosUser'));
}
