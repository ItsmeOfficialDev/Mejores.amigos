const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    action: String, // 'join', 'play_chess', 'bid', etc.
    details: Object,
    timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema);
