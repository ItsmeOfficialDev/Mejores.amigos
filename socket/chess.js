const { Chess } = require('chess.js');

module.exports = (io) => {
    const ns = io.of('/chess');
    const activeGames = new Map();

    ns.on('connection', (socket) => {
        socket.on('joinGame', ({ gameId, player }) => {
            socket.join(gameId);
            socket.playerName = player;
            let g = activeGames.get(gameId);

            if (!g) {
                g = {
                    chess: new Chess(),
                    white: player,
                    black: null,
                    timers: { w: 600, b: 600 },
                    lastMove: Date.now(),
                    gameActive: true
                };
                activeGames.set(gameId, g);
            } else if (!g.black && g.white !== player) {
                g.black = player;
                g.lastMove = Date.now();
            }

            ns.to(gameId).emit('gameState', {
                fen: g.chess.fen(),
                white: g.white,
                black: g.black,
                turn: g.chess.turn(),
                timers: g.timers
            });
        });

        socket.on('move', ({ gameId, move }) => {
            const g = activeGames.get(gameId);
            if (!g || !g.gameActive) return;

            // Verify turn
            const turnColor = g.chess.turn();
            const turnPlayer = turnColor === 'w' ? g.white : g.black;
            if (socket.playerName !== turnPlayer) return;

            try {
                const result = g.chess.move(move);
                if (result) {
                    const now = Date.now();
                    const diff = Math.floor((now - g.lastMove) / 1000);
                    g.timers[turnColor] = Math.max(0, g.timers[turnColor] - diff);
                    g.lastMove = now;

                    ns.to(gameId).emit('moveMade', {
                        move: result,
                        fen: g.chess.fen(),
                        turn: g.chess.turn(),
                        timers: g.timers
                    });

                    if (g.chess.game_over()) {
                        g.gameActive = false;
                        let res = 'Draw';
                        if (g.chess.in_checkmate()) {
                            res = `Checkmate! Winner: ${socket.playerName}`;
                        }
                        ns.to(gameId).emit('gameOver', { result: res });
                    }
                }
            } catch (e) {
                socket.emit('error', 'Invalid move');
            }
        });

        socket.on('offerDraw', ({ gameId }) => {
            socket.to(gameId).emit('drawOffered');
        });

        socket.on('acceptDraw', ({ gameId }) => {
            const g = activeGames.get(gameId);
            if (g) {
                g.gameActive = false;
                ns.to(gameId).emit('gameOver', { result: 'Draw by agreement' });
            }
        });

        socket.on('resign', ({ gameId }) => {
            const g = activeGames.get(gameId);
            if (g) {
                g.gameActive = false;
                const winner = socket.playerName === g.white ? g.black : g.white;
                ns.to(gameId).emit('gameOver', { result: `Game over. Winner: ${winner}` });
            }
        });
    });
};
