const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const allPlayers = require('./players');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));

// Game State
let players = []; // { id, token, name, isAdmin, connected, lastSeen, team, budget, positions }
let auctionPlayers = [];
let currentPlayerIndex = -1;
let gameStatus = 'lobby'; // 'lobby', 'active', 'paused', 'ended'
let currentBid = 5;
let currentBidder = null;
let timerEnd = null;
let timerInterval = null;
let adminDisconnectTimer = null;
let hasReceivedBid = false;
let lastAdminAction = Date.now();
let adminInactivityWarningSent = false;
let lastPauseTime = 0;
let pauseRemaining = 0;

const MAX_POSITIONS = { GK: 3, DEF: 5, MID: 5, FWD: 5 };
const TOTAL_SLOTS = 18;
const STARTING_BUDGET = 1500; // 15 Crore in Lakhs
const MIN_PLAYERS_TO_START = 4;
const ADMIN_PASSWORD = '123456';

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function initializeAuction() {
    console.log('Initializing Auction...');
    const playersByPosition = {
        GK: shuffleArray(allPlayers.filter(p => p.position === 'GK')),
        DEF: shuffleArray(allPlayers.filter(p => p.position === 'DEF')),
        MID: shuffleArray(allPlayers.filter(p => p.position === 'MID')),
        FWD: shuffleArray(allPlayers.filter(p => p.position === 'FWD'))
    };

    auctionPlayers = [
        ...playersByPosition.GK,
        ...playersByPosition.DEF,
        ...playersByPosition.MID,
        ...playersByPosition.FWD
    ].map((p, index) => ({
        ...p,
        id: index,
        sold: false,
        winner: null,
        price: 0
    }));

    currentPlayerIndex = 0;
}

function nextPlayer() {
    currentPlayerIndex++;
    if (currentPlayerIndex >= auctionPlayers.length) {
        endAuction();
        return;
    }
    resetAuctionTimer();
}

function resetAuctionTimer() {
    currentBid = 5;
    currentBidder = null;
    hasReceivedBid = false;
    timerEnd = Date.now() + 10000;
    pauseRemaining = 10000;
    broadcastState();
}

function broadcastState() {
    const remaining = auctionPlayers.slice(currentPlayerIndex).filter(p => !p.sold);
    const upcoming = remaining.slice(1, 11); // Show next 10 players
    const counts = {
        GK: remaining.filter(p => p.position === 'GK').length,
        DEF: remaining.filter(p => p.position === 'DEF').length,
        MID: remaining.filter(p => p.position === 'MID').length,
        FWD: remaining.filter(p => p.position === 'FWD').length
    };

    io.emit('gameState', {
        gameStatus,
        currentPlayer: auctionPlayers[currentPlayerIndex],
        currentBid,
        currentBidder,
        timerEnd,
        hasReceivedBid,
        remainingCounts: counts,
        upcomingPlayers: upcoming.map(p => ({ name: p.name, position: p.position })),
        users: players.map(p => ({
            name: p.name,
            isAdmin: p.isAdmin,
            connected: p.connected,
            budget: p.budget,
            teamCount: p.team.length,
            positions: p.positions,
            team: p.team
        }))
    });
}

function endAuction(reason = 'completed') {
    console.log(`Ending auction: ${reason}`);
    gameStatus = 'ended';
    if (reason === 'emergency') {
        runRandomAllocation();
    }
    io.emit('auctionEnded', { reason });
    if (timerInterval) clearInterval(timerInterval);
}

function runRandomAllocation() {
    console.log('Running random allocation...');
    const unsoldPlayers = auctionPlayers.filter(p => !p.sold);
    const activeUsers = players.filter(u => u.connected && u.team.length < TOTAL_SLOTS && u.budget >= 10);

    unsoldPlayers.forEach(player => {
        shuffleArray(activeUsers);
        for (let user of activeUsers) {
            if (user.budget >= 10 && user.positions[player.position] < MAX_POSITIONS[player.position]) {
                user.budget -= 10;
                user.team.push({ name: player.name, position: player.position, price: 10 });
                user.positions[player.position]++;
                player.sold = true;
                player.winner = user.name;
                player.price = 10;
                break;
            }
        }
    });
}

// Timer loop
timerInterval = setInterval(() => {
    const now = Date.now();
    if (gameStatus === 'active') {
        if (now >= timerEnd) {
            const player = auctionPlayers[currentPlayerIndex];
            if (currentBidder) {
                const winner = players.find(p => p.name === currentBidder);
                winner.budget -= currentBid;
                winner.team.push({ name: player.name, position: player.position, price: currentBid });
                winner.positions[player.position]++;
                player.sold = true;
                player.winner = currentBidder;
                player.price = currentBid;
                io.emit('notification', { type: 'success', message: `${player.name} SOLD to ${currentBidder} for ${formatMoney(currentBid)}!` });
                nextPlayer();
            } else {
                player.sold = false;
                io.emit('notification', { type: 'info', message: `${player.name} unsold.` });
                nextPlayer();
            }
        }

        // Dismissal logic for admin
        const admin = players.find(p => p.isAdmin && p.connected);
        if (admin) {
            const showDismiss = !hasReceivedBid && (timerEnd - now) <= 5000 && (timerEnd - now) > 0;
            io.to(admin.id).emit('showDismissButton', showDismiss);
        }
    }

    // Admin inactivity check
    const admin = players.find(p => p.isAdmin && p.connected);
    if (admin && gameStatus === 'active') {
        const inactiveTime = now - lastAdminAction;
        if (inactiveTime > 360000) { // 6 mins (5m + 1m grace)
            const nextAdmin = players
                .filter(p => !p.isAdmin && p.connected)
                .sort((a, b) => a.joinedAt - b.joinedAt)[0];

            if (nextAdmin) {
                admin.isAdmin = false;
                nextAdmin.isAdmin = true;
                lastAdminAction = Date.now();
                adminInactivityWarningSent = false;
                io.emit('notification', { type: 'warning', message: `👑 ${nextAdmin.name} is now admin due to previous admin inactivity` });
                io.emit('playerList', players.filter(p => p.connected).map(p => ({ name: p.name, isAdmin: p.isAdmin })));
                broadcastState();
            }
        } else if (inactiveTime > 300000 && !adminInactivityWarningSent) { // 5 mins
            adminInactivityWarningSent = true;
            io.to(admin.id).emit('adminInactivityWarning');
        }
    } else {
        adminInactivityWarningSent = false;
    }
}, 1000);

// Cleanup task for abandoned players (5 min)
setInterval(() => {
    const now = Date.now();
    if (gameStatus === 'lobby') {
        players = players.filter(p => p.connected || (now - p.lastSeen) < 30000); // 30s grace for lobby transitions
    }
}, 30000);

function formatMoney(amount) {
    if (amount < 100) return `₹${amount} Lakh`;
    return `₹${(amount / 100).toFixed(2)} Crore`;
}

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);
    socket.on('join', ({ name, password, token }) => {
        console.log('Join request:', name, token, socket.id);

        let user;
        if (token) {
            user = players.find(p => p.token === token);
        }

        let cleanName = '';
        if (name) {
            cleanName = name.trim();
            if (cleanName.toLowerCase().endsWith('admin')) {
                cleanName = cleanName.slice(0, -5).trim();
            }
            cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        }

        if (!user && cleanName) {
            // Allow re-joining by name if not connected
            user = players.find(p => p.name === cleanName && !p.connected);
        }

        if (user) {
            // Reconnecting existing user
            user.id = socket.id;
            user.connected = true;
            user.lastSeen = Date.now();
            if (user.isAdmin && adminDisconnectTimer) {
                clearTimeout(adminDisconnectTimer);
                adminDisconnectTimer = null;
                io.emit('notification', { type: 'success', message: 'Admin has returned. Auction continuing normally.' });
            }
            console.log(`User ${user.name} reconnected. Admin: ${user.isAdmin}`);
        } else {
            // New join
            if (!name || name.trim().length < 2 || name.trim().length > 20 || !/^[a-zA-Z\s]+$/.test(name)) {
                return socket.emit('error', 'Invalid name. 2-20 characters, letters and spaces only.');
            }

            let isAdmin = false;
            let actualCleanName = name.trim();

            if (actualCleanName.toLowerCase().endsWith('admin')) {
                if (password !== ADMIN_PASSWORD) {
                    return socket.emit('error', 'Invalid admin password');
                }
                if (players.some(p => p.isAdmin && p.connected)) {
                    return socket.emit('error', 'Admin already exists');
                }
                actualCleanName = actualCleanName.slice(0, -5).trim();
                actualCleanName = actualCleanName.charAt(0).toUpperCase() + actualCleanName.slice(1);
                isAdmin = true;
            } else {
                actualCleanName = actualCleanName.charAt(0).toUpperCase() + actualCleanName.slice(1);
            }

            if (players.some(p => p.name === actualCleanName && p.connected)) {
                return socket.emit('error', 'Name already taken');
            }

            const newToken = Math.random().toString(36).substr(2, 9);
            user = {
                id: socket.id,
                token: newToken,
                name: actualCleanName,
                isAdmin,
                connected: true,
                lastSeen: Date.now(),
                joinedAt: Date.now(),
                team: [],
                budget: STARTING_BUDGET,
                positions: { GK: 0, DEF: 0, MID: 0, FWD: 0 }
            };
            players.push(user);
            console.log(`User ${actualCleanName} joined. Admin: ${isAdmin}`);
        }

        socket.emit('joined', { user, gameStatus });

        // Broadcast updated player list to everyone
        const connectedPlayers = players.filter(p => p.connected).map(p => ({
            name: p.name,
            isAdmin: p.isAdmin
        }));
        io.emit('playerList', connectedPlayers);

        if (gameStatus !== 'lobby') {
            broadcastState();
        }
    });

    socket.on('startAuction', () => {
        const user = players.find(p => p.id === socket.id);
        if (user && user.isAdmin && players.filter(p => p.connected).length >= MIN_PLAYERS_TO_START && gameStatus === 'lobby') {
            initializeAuction();
            gameStatus = 'active';
            resetAuctionTimer();
            lastAdminAction = Date.now();
            io.emit('auctionStarted');
        }
    });

    socket.on('resetLobby', () => {
        const user = players.find(p => p.id === socket.id);
        if (user && user.isAdmin && gameStatus === 'lobby') {
            players = [];
            lastAdminAction = Date.now();
            io.emit('lobbyReset', 'Lobby reset by admin. Please rejoin.');
        }
    });

    socket.on('placeBid', (amount) => {
        const user = players.find(p => p.id === socket.id);
        if (!user || gameStatus !== 'active' || amount % 5 !== 0 || amount <= currentBid) return;
        if (user.name === currentBidder) return;
        if (user.positions[auctionPlayers[currentPlayerIndex].position] >= MAX_POSITIONS[auctionPlayers[currentPlayerIndex].position]) return;

        const emptySlots = TOTAL_SLOTS - user.team.length;
        if (user.budget - amount < emptySlots * 10) return;

        currentBid = amount;
        currentBidder = user.name;
        hasReceivedBid = true;
        timerEnd = Date.now() + 10000;
        pauseRemaining = 10000;
        broadcastState();
        io.emit('notification', { type: 'bid', message: `${user.name} bid ${formatMoney(amount)}!` });
    });

    socket.on('pauseAuction', () => {
        const user = players.find(p => p.id === socket.id);
        if (user && user.isAdmin) {
            if (gameStatus === 'active') {
                gameStatus = 'paused';
                pauseRemaining = Math.max(0, timerEnd - Date.now());
            } else if (gameStatus === 'paused') {
                gameStatus = 'active';
                timerEnd = Date.now() + pauseRemaining;
            }
            lastAdminAction = Date.now();
            broadcastState();
        }
    });

    socket.on('dismissPlayer', () => {
        const user = players.find(p => p.id === socket.id);
        if (user && user.isAdmin && !hasReceivedBid && (timerEnd - Date.now()) <= 5000) {
            auctionPlayers[currentPlayerIndex].sold = false;
            nextPlayer();
            lastAdminAction = Date.now();
        }
    });

    socket.on('emergencyEnd', (confirm) => {
        const user = players.find(p => p.id === socket.id);
        if (user && user.isAdmin && confirm === 'END') {
            endAuction('emergency');
            lastAdminAction = Date.now();
        }
    });

    socket.on('adminStayActive', () => {
        const user = players.find(p => p.id === socket.id);
        if (user && user.isAdmin) {
            lastAdminAction = Date.now();
            adminInactivityWarningSent = false;
        }
    });

    socket.on('disconnect', () => {
        const user = players.find(p => p.id === socket.id);
        if (user) {
            console.log('User disconnected:', user.name);
            user.connected = false;
            user.lastSeen = Date.now();

            if (user.isAdmin && gameStatus === 'active') {
                io.emit('notification', { type: 'warning', message: 'Admin disconnected! Auto-end in 60s if not returned.' });
                adminDisconnectTimer = setTimeout(() => {
                    if (!user.connected) endAuction('emergency');
                }, 60000);
            }

            io.emit('playerList', players.filter(p => p.connected).map(p => ({ name: p.name, isAdmin: p.isAdmin })));
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
