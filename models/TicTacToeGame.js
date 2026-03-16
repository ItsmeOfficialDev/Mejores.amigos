const mongoose = require('mongoose');

const ticTacToeGameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  playerX: String,
  playerO: String,
  board: [String],
  currentTurn: String,
  moves: [Number],
  result: String,
  startedAt: { type: Date, default: Date.now },
  endedAt: Date
});

module.exports = mongoose.model('TicTacToeGame', ticTacToeGameSchema);
