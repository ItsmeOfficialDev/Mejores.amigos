async function checkAuth() {
    try {
        const res = await fetch('/api/me');
        if (res.ok) {
            const data = await res.json();
            if (data.user) {
                // Ensure name is stored exactly
                localStorage.setItem('mejoresAmigosUser', JSON.stringify(data.user));
                return data.user;
            }
        } else if (res.status === 401) {
            // CRITICAL FIX: Explicitly clear on 401 Unauthorized
            localStorage.removeItem('mejoresAmigosUser');
        }
    } catch (e) {
        console.error("Auth check failed", e);
    }

    // Fallback: Check localStorage if session is lost (might be risky, better to rely on server)
    // But for now, if server says no, we clear.
    return null;
}

function getStoredUser() {
    try {
        const user = JSON.parse(localStorage.getItem('mejoresAmigosUser'));
        return user;
    } catch (e) {
        localStorage.removeItem('mejoresAmigosUser');
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
