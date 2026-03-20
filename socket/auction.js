const PLAYER_LIST = require('../players');
const MAX_POS = { GK: 3, DEF: 5, MID: 5, FWD: 5 };

module.exports = (io) => {
    const ns = io.of('/auction');

    let players = [];
    let auctionQueue = [];
    let gameStatus = 'lobby'; // lobby, active, finished
    let currentIdx = -1;
    let currentBid = 5;
    let currentBidder = null;
    let timerEnd = 0;
    let isPaused = false;
    let timeLeftOnPause = 0;
    let endReason = null; // 'emergency' or null

    // Admin Management
    let adminDisconnectTimeout = null;
    let adminInactivityTimeout = null;
    let inactivityGraceTimeout = null;
    const INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 mins
    const DISCONNECT_GRACE = 60 * 1000; // 60s
    const RECONNECT_GRACE = 3 * 60 * 1000; // 3 mins for regular players

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
            reason: endReason,
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

    function resetAdminInactivity() {
        if (adminInactivityTimeout) clearTimeout(adminInactivityTimeout);
        if (inactivityGraceTimeout) clearTimeout(inactivityGraceTimeout);

        adminInactivityTimeout = setTimeout(() => {
            const admin = players.find(p => p.isAdmin && p.socketId);
            if (admin) {
                // Send specific warning to the admin socket
                ns.to(admin.socketId).emit('notification', {
                    message: "⚠️ You have been inactive. Action required in 1 minute or admin will be transferred.",
                    type: "error"
                });

                inactivityGraceTimeout = setTimeout(() => {
                    promoteNextAdmin();
                }, 60000); // 1 minute grace
            }
        }, INACTIVITY_LIMIT);
    }

    function promoteNextAdmin() {
        const currentAdmin = players.find(p => p.isAdmin);
        if (currentAdmin) currentAdmin.isAdmin = false;

        // Find next eligible player (longest in game)
        const nextAdmin = players.find(p => p.socketId && !p.isAdmin);
        if (nextAdmin) {
            nextAdmin.isAdmin = true;
            ns.emit('notification', {
                message: `👑 ${nextAdmin.name} is now Admin due to previous admin inactivity.`,
                type: 'info'
            });
            resetAdminInactivity();
        }
        broadcast();
    }

    function triggerEmergencyEnd(reason = 'emergency') {
        endReason = reason;
        const unsold = auctionQueue.slice(Math.max(0, currentIdx));
        for (const player of unsold) {
            // Find eligible players
            const eligible = players.filter(x =>
                x.team.length < 18 &&
                x.budget >= 10 &&
                x.positions[player.position] < MAX_POS[player.position]
            );
            if (eligible.length > 0) {
                // Fair random distribution
                const winner = eligible[Math.floor(Math.random() * eligible.length)];
                winner.budget -= 10;
                winner.team.push({ ...player, price: 10, random: true });
                winner.positions[player.position]++;
            }
        }
        gameStatus = 'finished';
        broadcast();
    }

    ns.on('connection', (socket) => {
        socket.on('joinAuction', ({ name, isAdmin }) => {
            let p = players.find(x => x.name === name);

            // Multiple Admin Check
            if (isAdmin && players.find(x => x.isAdmin && x.socketId && x.name !== name)) {
                socket.emit('error', 'Admin already exists.');
                return;
            }

            if (!p) {
                p = {
                    socketId: socket.id,
                    name,
                    isAdmin: !!isAdmin,
                    budget: 1500,
                    team: [],
                    positions: { GK: 0, DEF: 0, MID: 0, FWD: 0 }
                };
                players.push(p);
            } else {
                p.socketId = socket.id;
                if (isAdmin) {
                    p.isAdmin = true;
                    if (adminDisconnectTimeout) {
                        clearTimeout(adminDisconnectTimeout);
                        adminDisconnectTimeout = null;
                        ns.emit('notification', { message: '✅ Admin has returned.', type: 'success' });
                    }
                }
            }

            if (p.isAdmin) resetAdminInactivity();
            broadcast();
        });

        socket.on('disconnect', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p) {
                p.socketId = null;
                if (gameStatus === 'lobby') {
                    players = players.filter(x => x.name !== p.name);
                } else if (p.isAdmin) {
                    // Admin Disconnect Countdown (60s)
                    adminDisconnectTimeout = setTimeout(() => {
                        ns.emit('notification', { message: '⚠️ Admin failed to return. Emergency allocation starting.', type: 'error' });
                        triggerEmergencyEnd();
                    }, DISCONNECT_GRACE);
                    ns.emit('notification', { message: '⚠️ Admin disconnected. Auto-end in 60s if no admin returns.', type: 'error' });
                }
                broadcast();
            }
        });

        // SECTION 8: Keep admin status active
        socket.on('adminStayActive', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin) resetAdminInactivity();
        });

        socket.on('resetLobby', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'lobby') {
                players = [];
                ns.emit('lobbyReset');
                broadcast();
            }
        });

        socket.on('startAuction', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && gameStatus === 'lobby' && players.length >= 4) {
                auctionQueue = [
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'GK')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'DEF')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'MID')),
                    ...shuffle(PLAYER_LIST.filter(x => x.position === 'FWD'))
                ];
                gameStatus = 'active';
                currentIdx = 0;
                currentBid = 5;
                currentBidder = null;
                timerEnd = Date.now() + 10000;
                resetAdminInactivity();
                broadcast();
            }
        });

        socket.on('bid', (amount) => {
            const p = players.find(x => x.socketId === socket.id);
            if (!p || gameStatus !== 'active' || isPaused || amount <= currentBid || amount % 5 !== 0) return;
            if (p.name === currentBidder) return;

            const player = auctionQueue[currentIdx];
            if (!player) return;
            if (p.positions[player.position] >= MAX_POS[player.position]) return;

            // Reserve Check (₹10L per empty slot)
            const slotsLeft = 18 - p.team.length;
            if (p.budget - amount < (slotsLeft - 1) * 10) {
                socket.emit('notification', { message: 'Insufficient reserve remaining!', type: 'error' });
                return;
            }
            if (p.budget < amount) return;

            currentBid = amount;
            currentBidder = p.name;
            timerEnd = Date.now() + 10000;
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
                    ns.emit('notification', { message: `Admin dismissed ${auctionQueue[currentIdx].name}`, type: 'info' });
                    currentIdx++;
                    if (currentIdx >= auctionQueue.length) gameStatus = 'finished';
                    else {
                        currentBid = 5;
                        currentBidder = null;
                        timerEnd = Date.now() + 10000;
                    }
                    resetAdminInactivity();
                    broadcast();
                }
            }
        });

        socket.on('emergencyEnd', (confirm) => {
            const p = players.find(x => x.socketId === socket.id);
            if (p && p.isAdmin && confirm === 'END') {
                triggerEmergencyEnd('emergency');
            }
        });

        socket.on('getMyTeam', () => {
            const p = players.find(x => x.socketId === socket.id);
            if (p) socket.emit('myTeamData', p.team);
        });
    });

    // Auction Loop (Timer Expiry)
    setInterval(() => {
        if (gameStatus === 'active' && !isPaused && Date.now() > timerEnd) {
            if (currentBidder) {
                const winner = players.find(x => x.name === currentBidder);
                const player = auctionQueue[currentIdx];
                winner.budget -= currentBid;
                winner.team.push({ ...player, price: currentBid });
                winner.positions[player.position]++;
                ns.emit('notification', { message: `✅ ${player.name} SOLD to ${winner.name} for ${currentBid} Lakh!`, type: 'success' });
            } else {
                ns.emit('notification', { message: `❌ ${auctionQueue[currentIdx].name} UNSOLD.`, type: 'info' });
            }

            currentIdx++;
            if (currentIdx >= auctionQueue.length) {
                gameStatus = 'finished';
            } else {
                currentBid = 5;
                currentBidder = null;
                timerEnd = Date.now() + 10000;
            }
            broadcast();
        }
    }, 1000);
};
