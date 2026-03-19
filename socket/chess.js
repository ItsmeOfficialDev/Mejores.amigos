const { Chess } = require('chess.js');
const Game = require('../models/Game');

module.exports = (io) => {
    const ns = io.of('/chess');
    const activeGames = new Map(); // gameId -> { chess, white, black, timers }

    ns.on('connection', (socket) => {
        socket.on('joinGame', async ({ gameId, player }) => {
            socket.join(gameId);
            let g = activeGames.get(gameId);

            if (!g) {
                // Try load from DB or create new
                g = {
                    chess: new Chess(),
                    white: player,
                    black: null,
                    timers: { w: 600, b: 600 },
                    lastMove: Date.now()
                };
                activeGames.set(gameId, g);
            } else if (!g.black && g.white !== player) {
                g.black = player;
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
            if (!g) return;

            try {
                const result = g.chess.move(move);
                if (result) {
                    const now = Date.now();
                    const diff = Math.floor((now - g.lastMove) / 1000);
                    const turn = g.chess.turn() === 'w' ? 'b' : 'w'; // turn that just moved
                    g.timers[turn] = Math.max(0, g.timers[turn] - diff);
                    g.lastMove = now;

                    ns.to(gameId).emit('moveMade', {
                        move: result,
                        fen: g.chess.fen(),
                        turn: g.chess.turn(),
                        timers: g.timers
                    });

                    if (g.chess.game_over()) {
                        let res = 'Draw';
                        if (g.chess.in_checkmate()) res = `Winner: ${g.chess.turn() === 'w' ? g.black : g.white}`;
                        ns.to(gameId).emit('gameOver', { result: res });
                    }
                }
            } catch (e) {
                socket.emit('error', 'Invalid move');
            }
        });
    });
};
