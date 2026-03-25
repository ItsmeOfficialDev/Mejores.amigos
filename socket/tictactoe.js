module.exports = (io, trackActivity) => {
    const ns = io.of('/tictactoe');
    const games = new Map();

    ns.on('connection', (socket) => {
        socket.on('joinGame', ({ gameId, player }) => {
            let g = games.get(gameId);

            if (!g) {
                const isX = Math.random() > 0.5;
                g = {
                    board: Array(9).fill(''),
                    X: isX ? player : null,
                    O: isX ? null : player,
                    turn: 'X',
                    active: true,
                    scores: { X: 0, O: 0 }
                };
                games.set(gameId, g);
                trackActivity(player, 'ttt_created', { gameId });
            } else {
                if (g.X === null && g.O !== player) {
                    g.X = player;
                    trackActivity(player, 'ttt_joined', { gameId, as: 'X' });
                }
                else if (g.O === null && g.X !== player) {
                    g.O = player;
                    trackActivity(player, 'ttt_joined', { gameId, as: 'O' });
                }
                else if (g.X !== player && g.O !== player) {
                    socket.emit('error', 'Game room is full. Please try another link.');
                    return;
                }
            }

            socket.join(gameId);
            socket.playerName = player;

            ns.to(gameId).emit('gameState', {
                board: g.board,
                X: g.X,
                O: g.O,
                turn: g.turn,
                active: g.active,
                scores: g.scores
            });
        });

        socket.on('move', ({ gameId, index, symbol }) => {
            const g = games.get(gameId);
            if (g && g.active && g.X && g.O && g.board[index] === '' && g.turn === symbol) {
                const expectedPlayer = symbol === 'X' ? g.X : g.O;
                if (socket.playerName !== expectedPlayer) return;

                g.board[index] = symbol;
                g.turn = symbol === 'X' ? 'O' : 'X';

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
                    g.scores[winner]++;
                    trackActivity(socket.playerName, 'ttt_won', { gameId });
                    ns.to(gameId).emit('gameState', g);
                    ns.to(gameId).emit('gameOver', { winner });
                } else if (!g.board.includes('')) {
                    g.active = false;
                    trackActivity(socket.playerName, 'ttt_draw', { gameId });
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
                trackActivity(socket.playerName, 'ttt_reset', { gameId });
                ns.to(gameId).emit('gameState', g);
            }
        });
    });
};
