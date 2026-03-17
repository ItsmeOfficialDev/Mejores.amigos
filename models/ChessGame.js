const mongoose = require('mongoose');

const chessGameSchema = new mongoose.Schema({
  gameId: { type: String, required: true, unique: true },
  whitePlayer: { type: String, required: true },
  blackPlayer: { type: String },
  timeControl: String,
  moves: [String],
  result: String,
  pgn: String,
  fenHistory: [String],
  startedAt: { type: Date, default: Date.now },
  endedAt: Date,
  winner: String,
  termination: String
});

module.exports = mongoose.model('ChessGame', chessGameSchema);
