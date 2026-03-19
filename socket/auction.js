const PLAYER_LIST = require('../players');

const MAX_POS = { GK: 3, DEF: 5, MID: 5, FWD: 5 };

module.exports = (io) => {
    const ns = io.of('/auction');

    let players = [];
    let auctionQueue = [];
    let gameStatus = 'lobby';
    let currentIdx = -1;
    let currentBid = 5;
    let currentBidder = null;
    let timerEnd = 0; let isPaused = false; let timeLeftOnPause = 0;

    function shuffle(a) {
        const array = [...a];
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function broadcast() {
        ns.emit('stateUpdate', {
            gameStatus,
            currentBid,
            currentBidder,
            timerEnd, isPaused,
            currentPlayer: auctionQueue[currentIdx] || null,
            players: players.map(p => ({
                name: p.name,
                isAdmin: p.isAdmin,
                budget: p.budget,
                teamSize: p.team.length,
                positions: p.positions,
                team: gameStatus === "finished" ? p.team : []
            }))
        });
    }

    ns.on('connection', (socket) => {
        socket.on('getUpcoming', () => {
            const next10 = auctionQueue.slice(currentIdx + 1, currentIdx + 11);
            socket.emit('upcomingPlayers', next10);
        });

        socket.on('getMyTeam', () => {
            const p = players.find(x => x.id === socket.id);
            if(p) socket.emit('myTeamData', p.team);
        });

        socket.on('joinAuction', ({ name, isAdmin }) => {
            let p = players.find(x => x.name === name);
            if (!p) {
                p = { id: socket.id, name, isAdmin, budget: 1500, team: [], positions: { GK: 0, DEF: 0, MID: 0, FWD: 0 } };
                players.push(p);
            } else {
                p.id = socket.id;
            }
            broadcast();
        });

        socket.on('resetLobby', () => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && gameStatus === 'lobby') {
                players = [];
                ns.emit('lobbyReset');
                broadcast();
            }
        });

        socket.on('startAuction', () => {
            const p = players.find(x => x.id === socket.id);
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
                broadcast();
            }
        });

        socket.on('bid', (amount) => {
            const p = players.find(x => x.id === socket.id);
            if (!p || gameStatus !== 'active' || isPaused || amount <= currentBid || amount % 5 !== 0) return;
            if (p.name === currentBidder) return;
            const player = auctionQueue[currentIdx];
            if (!player) return;
            if (p.positions[player.position] >= MAX_POS[player.position]) return;

            // Reserve money check: 10 Lakh per empty slot
            const slotsLeft = 18 - p.team.length;
            if (p.budget - amount < (slotsLeft - 1) * 10) return;
            if (p.budget < amount) return;

            currentBid = amount;
            currentBidder = p.name;
            timerEnd = Date.now() + 10000;
            broadcast();
        });

        socket.on('pause', () => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && !isPaused) {
                isPaused = true;
                timeLeftOnPause = Math.max(0, timerEnd - Date.now());
                broadcast();
            }
        });

        socket.on('resume', () => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && isPaused) {
                isPaused = false;
                timerEnd = Date.now() + timeLeftOnPause;
                broadcast();
            }
        });

        socket.on('dismiss', () => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && gameStatus === 'active' && !currentBidder) {
                const rem = Math.floor((timerEnd - Date.now()) / 1000);
                if (rem <= 5) {
                    currentIdx++;
                    if (currentIdx >= auctionQueue.length) gameStatus = 'finished';
                    else {
                        currentBid = 5;
                        currentBidder = null;
                        timerEnd = Date.now() + 10000;
                    }
                    broadcast();
                }
            }
        });

        socket.on('emergencyEnd', (confirm) => {
            const p = players.find(x => x.id === socket.id);
            if (p && p.isAdmin && confirm === 'END') {
                const unsold = auctionQueue.slice(currentIdx);
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
            }
            currentIdx++;
            if (currentIdx >= auctionQueue.length) gameStatus = 'finished';
            else {
                currentBid = 5;
                currentBidder = null;
                timerEnd = Date.now() + 10000;
            }
            broadcast();
        }
    }, 1000);
};
