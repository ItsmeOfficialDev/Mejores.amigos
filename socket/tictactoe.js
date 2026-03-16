module.exports = (io) => {
  const tttNamespace = io.of('/tictactoe');
  const games = new Map();

  tttNamespace.on('connection', (socket) => {
    socket.on('joinTTT', ({ gameId, player }) => {
      socket.join(gameId);
      let gameData = games.get(gameId);
      if (!gameData) {
        gameData = { board: Array(9).fill(''), X: player, O: null, turn: 'X' };
        games.set(gameId, gameData);
      } else if (!gameData.O && gameData.X !== player) {
        gameData.O = player;
      }
      socket.emit('tttState', gameData);
      socket.to(gameId).emit('tttPlayerJoined', gameData);
    });

    socket.on('tttMove', ({ gameId, index, player }) => {
      const gameData = games.get(gameId);
      if (gameData && gameData.turn === player && gameData.board[index] === '') {
        gameData.board[index] = player;
        gameData.turn = player === 'X' ? 'O' : 'X';
        tttNamespace.to(gameId).emit('tttMoveMade', { index, player, nextTurn: gameData.turn });
      }
    });
  });
};
