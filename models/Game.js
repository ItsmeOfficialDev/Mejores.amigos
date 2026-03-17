const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  type: { type: String, enum: ['chess', 'tictactoe', 'auction'] },
  gameId: { type: String, required: true, unique: true },
  players: [{
    name: String,
    role: String // 'white', 'black', 'X', 'O', 'bidder'
  }],
  state: { type: Object },
  history: [{ type: Object }],
  winner: String,
  endedAt: Date
}, { timestamps: true });

module.exports = mongoose.model('Game', gameSchema);
