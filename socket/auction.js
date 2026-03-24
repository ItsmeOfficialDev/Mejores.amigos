const PLAYER_LIST = require('../players');
const fs = require('fs');
const path = require('path');

const MAX_POS = { GK: 3, DEF: 5, MID: 5, FWD: 5 };
const START_BUDGET = 1500;
const START_BID = 5;
const BID_INCREMENT = 5;
const TIMER_DURATION = 10000;

module.exports = (io) => {
    const ns = io.of('/auction');

    let players = [];
    let auctionQueue = [];
    let gameStatus = 'lobby';
    let currentIdx = -1;
    let currentBid = START_BID;
    let currentBidder = null;
    let timerEnd = 0;
    let isPaused = false;
    let timeLeftOnPause = 0;

    let adminDisconnectTimeout = null;
    let adminInactivityTimeout = null;
    const INACTIVITY_LIMIT = 5 * 60 * 1000;
    const DISCONNECT_GRACE = 60 * 1000;

    function shuffle(a) {
        const array = [...a];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function broadcast(type = 'stateUpdate') {
        const state = {
            gameStatus,
            currentBid,
            currentBidder,
            timerEnd,
            isPaused,
            currentPlayer: auctionQueue[currentIdx] || null,
            players: players.map(p => ({
                name: p.name,
                isAdmin: p.isAdmin,
                connected: !!p.socketId,
                budget: p.budget,
                teamSize: p.team.length,
                positions: p.positions,
                team: gameStatus === "finished" ? p.team : []
            }))
        };
        ns.emit(type, state);
    }

    function saveResults() {
        const results = {
            date: new Date().toISOString(),
            players: players.map(p => ({
                name: p.name,
                budget: p.budget,
                team: p.team,
                positions: p.positions,
                isAdmin: p.isAdmin
            }))
        };
        fs.writeFileSync(path.join(__dirname, '../last_auction_stats.json'), JSON.stringify(results, null, 2));
    }

    function resetAdminInactivity() {
        if (adminInactivityTimeout) clearTimeout(adminInactivityTimeout);
        adminInactivityTimeout = setTimeout(() => {
            const admin = players.find(p => p.isAdmin && p.socketId);
            if (admin) {
                ns.to(admin.socketId).emit('notification', { message: '⚠️ Inactivity Warning: Action required or admin will be transferred.', type: 'error' });
                setTimeout(() => {
                   const stillAdmin = players.find(p => p.isAdmin && p.socketId === admin.socketId);
                   if (stillAdmin) promoteNextAdmin();
                }, 60000);
            }
        }, INACTIVITY_LIMIT);
    }

    function promoteNextAdmin() {
        const currentAdmin = players.find(p => p.isAdmin);
        if (currentAdmin) currentAdmin.isAdmin = false;
        const nextAdmin = players.find(p => p.socketId && !p.isAdmin);
        if (nextAdmin) {
            nextAdmin.isAdmin = true;
            ns.emit('notification', { message: `👑 ${nextAdmin.name} is now the Admin.`, type: 'info' });
        }
        broadcast();
    }

    function triggerEmergencyEnd() {
        const unsold = auctionQueue.slice(Math.max(0, currentIdx));
        for (const player of unsold) {
            const eligible = players.filter(x =>
                x.team.length < 18 &&
                x.budget >= 10 &&
                x.positions[player.position] < MAX_POS[player.position]
            );
            if (eligible.length > 0) {
                const winner = eligible[Math.floor(Math.random() * eligible.length)];
                winner.budget -= 10;
                winner.team.push({ ...player, price: 10, random: true });
                winner.positions[player.position]++;
            }
        }
        gameStatus = 'finished';
        saveResults();
        broadcast();
    }

    ns.on('connection', (socket) => {
        socket.on('joinAuction', ({ name, isAdmin }) => {
            let p = players.find(x => x.name === name);
            if (!p && players.length >= 8) {
                socket.emit('error', 'Auction room is full (max 8 players).');
                return;
            }
            if (isAdmin && players.find(x => x.isAdmin && x.socketId && x.name !== name)) {
                socket.emit('error', 'Admin already exists.');
                return;
            }

            if (!p) {
                p = {
                    socketId: socket.id,
                    name,
                    isAdmin,
                    budget: START_BUDGET,
                    team: [],
                    positions: { GK: 0, DEF: 0, MID: 0, FWD: 0 }
                };
                players.push(p);
            } else {
                p.socketId = socket.id;
                if (isAdmin) p.isAdmin = true;
            }

            if (p.isAdmin) resetAdminInactivity();
            broadcast();
        });

        socket.on('removeUser', (targetName) => {
            const admin = players.find(x => x.socketId === socket.id);
            if (admin && admin.isAdmin) {
                const target = players.find(x => x.name === targetName);
                if (target) {
                    if (target.socketId) {
                        ns.to(target.socketId).emit('error', 'You have been removed by admin.');
                        io.of('/auction').sockets.get(target.socketId)?.disconnect();
                    }
                    players = players.filter(x => x.name !== targetName);
                    broadcast();
                }
            }
        });

        socket.on('startAuction', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'lobby') {
                if (players.length < 4) {
                    socket.emit('notification', { message: 'Min 4 players required!', type: 'error' });
                    return;
                }
                auctionQueue = [
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'GK')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'DEF')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'MID')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'FWD'))
                ];
                gameStatus = 'active';
                currentIdx = 0;
                currentBid = START_BID;
                currentBidder = null;
                timerEnd = Date.now() + TIMER_DURATION;
                resetAdminInactivity();
                broadcast();
            }
        });

        socket.on('bid', (amount) => {
            const p = players.find(x => x.socketId === socket.id);
            if (!p || gameStatus !== 'active' || isPaused) return;
            if (amount <= currentBid || amount % BID_INCREMENT !== 0) return;
            if (p.name === currentBidder) return;

            const player = auctionQueue[currentIdx];
            if (!player) return;
            if (p.positions[player.position] >= MAX_POS[player.position]) {
                socket.emit('notification', { message: 'Position full!', type: 'error' });
                return;
            }

            const emptySlots = 18 - p.team.length;
            if (p.budget - amount < (emptySlots - 1) * 10) {
                 socket.emit('notification', { message: 'Reserve 10L/slot required!', type: 'error' });
                 return;
            }
            if (p.budget < amount) return;

            currentBid = amount;
            currentBidder = p.name;
            timerEnd = Date.now() + TIMER_DURATION;
            if (p.isAdmin) resetAdminInactivity();
            broadcast();
        });

        socket.on('pause', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && !isPaused) {
                isPaused = true;
                timeLeftOnPause = Math.max(0, timerEnd - Date.now());
                resetAdminInactivity();
                broadcast();
            }
        });

        socket.on('resume', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && isPaused) {
                isPaused = false;
                timerEnd = Date.now() + timeLeftOnPause;
                resetAdminInactivity();
                broadcast();
            }
        });

        socket.on('dismiss', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && !currentBidder) {
                const rem = Math.floor((timerEnd - Date.now()) / 1000);
                if (rem <= 5) {
                    currentIdx++;
                    if (currentIdx >= auctionQueue.length) {
                        gameStatus = 'finished';
                        saveResults();
                    } else {
                        currentBid = START_BID;
                        currentBidder = null;
                        timerEnd = Date.now() + TIMER_DURATION;
                    }
                    resetAdminInactivity();
                    broadcast();
                }
            }
        });

        socket.on('emergencyEnd', (confirm) => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && confirm === 'END') {
                triggerEmergencyEnd();
            }
        });

        socket.on('resetLobby', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'lobby') {
                players = [];
                ns.emit('lobbyReset');
                broadcast();
            }
        });
    });

    setInterval(() => {
        if (gameStatus === 'active' && !isPaused && Date.now() > timerEnd) {
            if (currentBidder) {
                const winner = players.find(x => x.name === currentBidder);
                const player = auctionQueue[currentIdx];
                winner.budget -= currentBid;
                winner.team.push({ ...player, price: currentBid });
                winner.positions[player.position]++;
                ns.emit('notification', { message: '✅ ' + player.name + ' SOLD!', type: 'success' });
            }

            currentIdx++;
            if (currentIdx >= auctionQueue.length) {
                gameStatus = 'finished';
                saveResults();
            } else {
                currentBid = START_BID;
                currentBidder = null;
                timerEnd = Date.now() + TIMER_DURATION;
            }
            broadcast();
        }
    }, 1000);
};
