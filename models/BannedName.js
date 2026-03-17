const mongoose = require('mongoose');

const bannedNameSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  nameLower: { type: String, required: true, unique: true },
  bannedBy: String,
  bannedAt: { type: Date, default: Date.now },
  reason: String
});

module.exports = mongoose.model('BannedName', bannedNameSchema);
