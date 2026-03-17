const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameLower: { type: String, required: true, unique: true },
  profilePic: { type: String, default: 'https://ui-avatars.com/api/?background=random' },
  isMainAppAdmin: { type: Boolean, default: false },
  isAuctionAdmin: { type: Boolean, default: false },
  banned: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  ips: [{ type: String }],
  watchHistory: [{
    animeId: String,
    animeTitle: String,
    episode: Number,
    timestamp: Number, // in seconds
    duration: Number,
    updatedAt: { type: Date, default: Date.now }
  }],
  gameHistory: [{
    gameType: { type: String, enum: ['chess', 'tictactoe', 'auction'] },
    opponent: String,
    result: String,
    date: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
