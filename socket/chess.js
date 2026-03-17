const { Chess } = require('chess.js');

module.exports = (io) => {
  const chessNamespace = io.of('/chess');
  const games = new Map();

  chessNamespace.on('connection', (socket) => {
    socket.on('joinGame', ({ gameId, player }) => {
      socket.join(gameId);
      let gameData = games.get(gameId);

      if (!gameData) {
        gameData = {
          game: new Chess(),
          white: player,
          black: null,
          fen: 'start'
        };
        games.set(gameId, gameData);
      } else if (!gameData.black && gameData.white !== player) {
        gameData.black = player;
      }

      socket.emit('gameState', {
        fen: gameData.game.fen(),
        white: gameData.white,
        black: gameData.black,
        turn: gameData.game.turn()
      });

      socket.to(gameId).emit('playerJoined', { white: gameData.white, black: gameData.black });
    });

    socket.on('move', ({ gameId, move }) => {
      const gameData = games.get(gameId);
      if (!gameData) return;

      try {
        const result = gameData.game.move(move);
        if (result) {
          chessNamespace.to(gameId).emit('moveMade', {
            move: result,
            fen: gameData.game.fen(),
            turn: gameData.game.turn()
          });
        }
      } catch (e) {
        socket.emit('error', 'Invalid move');
      }
    });
  });
};
