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
            localStorage.removeItem('mejoresAmigosUser');
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }
    return null;
}

function getStoredUser() {
    try {
        return JSON.parse(localStorage.getItem('mejoresAmigosUser')) ||
               JSON.parse(localStorage.getItem('auctionUser')) ||
               { name: 'Unknown User' };
    } catch (e) {
        return { name: 'Unknown User' };
    }
}

async function handleLogout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (e) {}
    localStorage.removeItem('mejoresAmigosUser');
    localStorage.removeItem('auctionUser');
    window.location.href = '/index.html';
}
