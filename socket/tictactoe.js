module.exports = (io) => {
    const ns = io.of('/tictactoe');
    const games = new Map();

    ns.on('connection', (socket) => {
        socket.on('joinGame', ({ gameId, player }) => {
            socket.join(gameId);
            let g = games.get(gameId);
            if (!g) {
                g = { board: Array(9).fill(''), X: player, O: null, turn: 'X', active: true };
                games.set(gameId, g);
            } else if (!g.O && g.X !== player) {
                g.O = player;
            }
            ns.to(gameId).emit('gameState', g);
        });

        socket.on('move', ({ gameId, index, symbol }) => {
            const g = games.get(gameId);
            if (g && g.active && g.board[index] === '' && g.turn === symbol) {
                g.board[index] = symbol;
                g.turn = symbol === 'X' ? 'O' : 'X';

                // Check win
                const winPatterns = [
                    [0,1,2],[3,4,5],[6,7,8],
                    [0,3,6],[1,4,7],[2,5,8],
                    [0,4,8],[2,4,6]
                ];

                let winner = null;
                for (const p of winPatterns) {
                    if (g.board[p[0]] && g.board[p[0]] === g.board[p[1]] && g.board[p[0]] === g.board[p[2]]) {
                        winner = symbol;
                        break;
                    }
                }

                if (winner) {
                    g.active = false;
                    ns.to(gameId).emit('gameState', g);
                    ns.to(gameId).emit('gameOver', { winner });
                } else if (!g.board.includes('')) {
                    g.active = false;
                    ns.to(gameId).emit('gameState', g);
                    ns.to(gameId).emit('gameOver', { winner: 'Draw' });
                } else {
                    ns.to(gameId).emit('gameState', g);
                }
            }
        });

        socket.on('resetGame', ({ gameId }) => {
            const g = games.get(gameId);
            if (g) {
                g.board = Array(9).fill('');
                g.turn = 'X';
                g.active = true;
                ns.to(gameId).emit('gameState', g);
            }
        });
    });
};
