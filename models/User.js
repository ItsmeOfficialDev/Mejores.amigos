const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameLower: { type: String, required: true, unique: true },
  isMainAppAdmin: { type: Boolean, default: false },
  isAuctionAdmin: { type: Boolean, default: false },
  banned: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
  totalTimeSpent: { type: Number, default: 0 },
  sessions: [
    {
      loginTime: Date,
      logoutTime: Date,
      duration: Number,
      ipAddress: String,
      userAgent: String
    }
  ],
  ipAddresses: [String],
  userAgents: [String]
});

module.exports = mongoose.model('User', userSchema);
