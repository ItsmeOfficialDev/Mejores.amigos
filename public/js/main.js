const socket = io();

let currentUser = null;
let gameState = null;
let timerInterval = null;

// Money Formatter
function formatMoney(amount) {
    if (amount < 100) return `₹${amount} Lakh`;
    return `₹${(amount / 100).toFixed(2)} Crore`;
}

// Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Navigation Helper
function navigate(page) {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    if (currentPage !== page) {
        window.location.href = `/${page}`;
    }
}

// Socket Events
socket.on('error', (msg) => {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) errorEl.textContent = msg;
    showToast(msg, 'error');
});

socket.on('joined', ({ user, gameStatus }) => {
    currentUser = user;
    localStorage.setItem('playerToken', user.token);
    localStorage.setItem('playerName', user.name);
    if (gameStatus === 'lobby') {
        navigate('lobby.html');
    } else if (gameStatus === 'active' || gameStatus === 'paused') {
        navigate('auction.html');
    } else {
        navigate('results.html');
    }
});

socket.on('playerList', (list) => {
    const listEl = document.getElementById('playerList');
    const countEl = document.getElementById('playerCount');
    if (!listEl) return;

    listEl.innerHTML = '';
    list.forEach(p => {
        const li = document.createElement('li');
        li.textContent = `${p.isAdmin ? '👑 ' : ''}${p.name}`;
        listEl.appendChild(li);
    });
    if (countEl) countEl.textContent = list.length;

    // Admin controls
    const adminControls = document.getElementById('adminControls');
    if (currentUser && currentUser.isAdmin && adminControls) {
        adminControls.style.display = 'block';
        const startBtn = document.getElementById('startBtn');
        if (startBtn) {
            startBtn.disabled = list.length < 4;
            startBtn.title = list.length < 4 ? 'Need at least 4 players to start' : '';
        }
    }
});

socket.on('auctionStarted', () => {
    navigate('auction.html');
});

socket.on('gameState', (state) => {
    gameState = state;
    updateAuctionUI();
});

socket.on('notification', (data) => {
    showToast(data.message, data.type);
});

socket.on('adminInactivityWarning', () => {
    const modal = document.getElementById('inactivityModal');
    if (modal) modal.style.display = 'block';
});

socket.on('showDismissButton', (show) => {
    const dismissBtn = document.getElementById('dismissBtn');
    if (dismissBtn) dismissBtn.style.display = show ? 'block' : 'none';
});

socket.on('auctionEnded', () => {
    navigate('results.html');
});

socket.on('lobbyReset', (msg) => {
    alert(msg);
    window.location.href = '/';
});

function validateBid(amount) {
    if (!gameState || !currentUser) return { valid: false, reason: 'System not ready' };
    const me = gameState.users.find(u => u.name === currentUser.name);
    if (!me) return { valid: false, reason: 'User not found' };

    if (gameState.gameStatus !== 'active') return { valid: false, reason: 'Auction paused' };
    if (amount <= gameState.currentBid) return { valid: false, reason: 'Bid must be higher than current' };
    if (amount % 5 !== 0) return { valid: false, reason: 'Bid must be multiple of 5 Lakh' };
    if (me.name === gameState.currentBidder) return { valid: false, reason: 'You are already the highest bidder' };

    const pos = gameState.currentPlayer.position;
    const max = pos === 'GK' ? 3 : 5;
    if (me.positions[pos] >= max) return { valid: false, reason: `${pos} position full` };

    if (me.budget < amount) return { valid: false, reason: 'Insufficient budget' };

    const emptySlots = 18 - me.team.length;
    const reserveRequired = emptySlots * 10;
    if (me.budget - amount < reserveRequired) {
        return { valid: false, reason: `Insufficient reserve (Need ${formatMoney(reserveRequired)} for ${emptySlots} slots)` };
    }

    return { valid: true };
}

function updateAuctionUI() {
    if (window.location.pathname.includes('auction.html')) {
        const pName = document.getElementById('playerNameDisplay');
        const pPos = document.getElementById('positionBadge');
        const bAmt = document.getElementById('bidAmountDisplay');
        const bName = document.getElementById('bidderNameDisplay');
        const mainBidBtn = document.getElementById('mainBidBtn');
        const pauseBanner = document.getElementById('pauseBanner');
        const pauseBtn = document.getElementById('pauseBtn');

        if (!gameState.currentPlayer) return;

        pName.textContent = gameState.currentPlayer.name;
        pPos.textContent = gameState.currentPlayer.position;
        pPos.className = `pos-${gameState.currentPlayer.position}`;
        bAmt.textContent = formatMoney(gameState.currentBid);
        bName.textContent = gameState.currentBidder ? (gameState.currentBidder === (currentUser ? currentUser.name : '') ? 'YOU' : gameState.currentBidder) : '---';

        const nextBid = gameState.currentBid + 5;
        mainBidBtn.textContent = `BID +₹5 LAKH (${formatMoney(nextBid)})`;

        pauseBanner.style.display = gameState.gameStatus === 'paused' ? 'block' : 'none';
        if (pauseBtn) pauseBtn.textContent = gameState.gameStatus === 'paused' ? '▶️ RESUME AUCTION' : '⏸️ PAUSE AUCTION';

        // Update personal stats
        const me = gameState.users.find(u => u.name === (currentUser ? currentUser.name : ''));
        if (me) {
            document.getElementById('userBudget').textContent = formatMoney(me.budget);
            document.getElementById('gkCount').textContent = `${me.positions.GK}/3`;
            document.getElementById('defCount').textContent = `${me.positions.DEF}/5`;
            document.getElementById('midCount').textContent = `${me.positions.MID}/5`;
            document.getElementById('fwdCount').textContent = `${me.positions.FWD}/5`;

            // Button Disable Logic
            const validation = validateBid(nextBid);
            mainBidBtn.disabled = !validation.valid;
            mainBidBtn.title = validation.valid ? '' : validation.reason;
        }

        // Admin Panel
        if (currentUser && currentUser.isAdmin) {
            document.getElementById('adminPanel').style.display = 'block';
        }

        startLocalTimer();
    }

    if (window.location.pathname.includes('results.html')) {
        updateResultsUI();
    }
}

function startLocalTimer() {
    if (timerInterval) clearInterval(timerInterval);
    const timerEl = document.getElementById('timerDisplay');
    if (!timerEl) return;

    timerInterval = setInterval(() => {
        if (gameState.gameStatus === 'paused') return;

        const now = Date.now();
        const remaining = Math.max(0, Math.floor((gameState.timerEnd - now) / 1000));
        timerEl.textContent = `⏱️ ${remaining}s`;

        timerEl.classList.remove('timer-warning', 'timer-danger');
        if (remaining <= 2) timerEl.classList.add('timer-danger');
        else if (remaining <= 5) timerEl.classList.add('timer-warning');

        if (remaining <= 0) clearInterval(timerInterval);
    }, 1000);
}

// Event Listeners for Auction
document.addEventListener('click', (e) => {
    if (e.target.id === 'startBtn') socket.emit('startAuction');
    if (e.target.id === 'resetBtn') socket.emit('resetLobby');
    if (e.target.id === 'exitBtn') window.location.href = '/';
    if (e.target.id === 'mainBidBtn') {
        const amt = gameState.currentBid + 5;
        const validation = validateBid(amt);
        if (validation.valid) {
            socket.emit('placeBid', amt);
        } else {
            showToast(validation.reason, 'error');
        }
    }
    if (e.target.id === 'pauseBtn') socket.emit('pauseAuction');
    if (e.target.id === 'dismissBtn') socket.emit('dismissPlayer');
    if (e.target.id === 'emergencyEndBtn') {
        const modal = document.getElementById('emergencyModal');
        if (modal) {
            modal.style.display = 'block';
            document.getElementById('emergencyConfirmInput').value = '';
            document.getElementById('confirmEmergencyEndBtn').disabled = true;
        }
    }
    if (e.target.id === 'confirmEmergencyEndBtn') {
        const input = document.getElementById('emergencyConfirmInput');
        if (input.value === 'END') {
            socket.emit('emergencyEnd', 'END');
            document.getElementById('emergencyModal').style.display = 'none';
        }
    }
    if (e.target.id === 'cancelEmergencyBtn') {
        document.getElementById('emergencyModal').style.display = 'none';
    }
    if (e.target.id === 'stayActiveBtn') {
        socket.emit('adminStayActive');
        document.getElementById('inactivityModal').style.display = 'none';
    }
    if (e.target.id === 'startNewBtn') {
        if (confirm('Are you sure you want to start a new auction? All data will be lost.')) {
            window.location.href = '/';
            // Actually server should handle reset
        }
    }
    if (e.target.id === 'customBidBtn') {
        const area = document.getElementById('customBidInputArea');
        area.style.display = area.style.display === 'none' ? 'flex' : 'none';
    }
    if (e.target.id === 'placeCustomBidBtn') {
        const amt = parseInt(document.getElementById('customBidInput').value);
        const validation = validateBid(amt);
        if (validation.valid) {
            socket.emit('placeBid', amt);
            document.getElementById('customBidInputArea').style.display = 'none';
        } else {
            showToast(validation.reason || 'Invalid bid amount', 'error');
        }
    }
    if (e.target.id === 'myTeamBtn') {
        showModal('My Team', renderTeam(currentUser.name));
    }
    if (e.target.id === 'remainingBtn') {
        showModal('Remaining Players', renderRemaining());
    }
});

// Re-connect logic
const storedToken = localStorage.getItem('playerToken');
const storedName = localStorage.getItem('playerName');
if (storedToken && !currentUser) {
   socket.emit('join', { token: storedToken, name: storedName });
}

function showModal(title, content) {
    const modal = document.getElementById('teamModal');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('teamList').innerHTML = content;
    modal.style.display = 'block';
}

function closeEmergencyModal() {
    document.getElementById('emergencyModal').style.display = 'none';
}

// Global window click handler for modals
window.onclick = function(event) {
    const teamModal = document.getElementById('teamModal');
    const emergencyModal = document.getElementById('emergencyModal');
    if (event.target == teamModal || event.target.className === 'close') {
        if (teamModal) teamModal.style.display = 'none';
    }
    if (event.target == emergencyModal) {
        closeEmergencyModal();
    }
}

// Input listener for emergency end confirmation
document.addEventListener('input', (e) => {
    if (e.target.id === 'emergencyConfirmInput') {
        const btn = document.getElementById('confirmEmergencyEndBtn');
        btn.disabled = e.target.value !== 'END';
    }
});

function renderTeam(userName) {
    const user = gameState.users.find(u => u.name === userName);
    if (!user || !user.team || user.team.length === 0) return '<p>No players bought yet.</p>';

    let html = '<table><tr><th>Player</th><th>Pos</th><th>Price</th></tr>';
    user.team.forEach(p => {
        html += `<tr><td>${p.name}</td><td>${p.position}</td><td>${formatMoney(p.price)}</td></tr>`;
    });
    html += '</table>';
    return html;
}

function renderRemaining() {
    if (!gameState || !gameState.remainingCounts) return '<p>Loading...</p>';
    const counts = gameState.remainingCounts;
    return `
        <div class="remaining-stats">
            <p>Goalkeepers: ${counts.GK}</p>
            <p>Defenders: ${counts.DEF}</p>
            <p>Midfielders: ${counts.MID}</p>
            <p>Forwards: ${counts.FWD}</p>
        </div>
    `;
}

function updateResultsUI() {
    const select = document.getElementById('userSelect');
    if (!select || !gameState) return;

    if (select.options.length === 0) {
        gameState.users.forEach(u => {
            const opt = document.createElement('option');
            opt.value = u.name;
            opt.textContent = u.name;
            select.appendChild(opt);
        });
        select.value = currentUser ? currentUser.name : gameState.users[0].name;
        select.addEventListener('change', updateResultsUI);
    }

    const selectedName = select.value;
    const user = gameState.users.find(u => u.name === selectedName);
    if (!user) return;

    document.getElementById('viewingName').textContent = `${user.isAdmin ? '👑 ' : ''}${user.name}'s Team`;
    document.getElementById('finalBudget').textContent = formatMoney(user.budget);

    let totalSpent = 0;
    const tbody = document.getElementById('resultsBody');
    tbody.innerHTML = '';
    user.team.forEach(p => {
        totalSpent += p.price;
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${p.name}</td><td>${p.position}</td><td>${formatMoney(p.price)}</td>`;
        tbody.appendChild(tr);
    });
    document.getElementById('totalSpent').textContent = formatMoney(totalSpent);

    if (currentUser && currentUser.isAdmin) {
        document.getElementById('adminResetArea').style.display = 'block';
    }

    // Setup Export Listeners
    setupExportListeners(user);
}

function setupExportListeners(user) {
    document.getElementById('downloadPdf').onclick = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Add Logo (if possible, using text for now to avoid cross-origin issues with jsPDF/Images)
        doc.setFontSize(22);
        doc.setTextColor(245, 158, 11); // Gold
        doc.text("MEJORES AMIGOS", 105, 20, { align: "center" });

        doc.setFontSize(16);
        doc.setTextColor(0, 0, 0);
        doc.text(`Auction Results - ${user.name}`, 105, 30, { align: "center" });

        doc.setFontSize(10);
        doc.text(`Date: ${new Date().toLocaleDateString()}`, 196, 40, { align: "right" });

        doc.autoTable({
            startY: 45,
            head: [['#', 'Player Name', 'Position', 'Price']],
            body: user.team.map((p, i) => [i + 1, p.name, p.position, formatMoney(p.price)]),
            headStyles: { fillStyle: [30, 41, 59] }, // bg-card color
        });

        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(12);
        let totalSpent = user.team.reduce((sum, p) => sum + p.price, 0);
        doc.text(`Total Spent: ${formatMoney(totalSpent)}`, 14, finalY);
        doc.text(`Budget Remaining: ${formatMoney(user.budget)}`, 14, finalY + 7);

        const posSum = `GK: ${user.positions.GK}/3, DEF: ${user.positions.DEF}/5, MID: ${user.positions.MID}/5, FWD: ${user.positions.FWD}/5`;
        doc.text(`Position Summary: ${posSum}`, 14, finalY + 14);

        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // gray
        doc.text("Private fantasy auction - for fun only", 105, 285, { align: "center" });

        doc.save(`${user.name}_team.pdf`);
    };

    document.getElementById('downloadCsv').onclick = () => {
        let csv = 'Player Name,Position,Price (Lakhs)\n';
        user.team.forEach(p => {
            csv += `${p.name},${p.position},${p.price}\n`;
        });
        csv += `\nBudget Remaining,,${user.budget}\n`;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.name}_team.csv`;
        a.click();
    };

    document.getElementById('downloadJson').onclick = () => {
        const data = {
            userName: user.name,
            budgetRemaining: user.budget,
            team: user.team,
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${user.name}_team.json`;
        a.click();
    };
}
