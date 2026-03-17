const mongoose = require('mongoose');

const indexingQueueSchema = new mongoose.Schema({
  userId: { type: Number, required: true },
  currentAnime: String,
  currentSeason: { type: Number, default: 1 },
  currentType: { type: String, enum: ["tv", "movie"], default: "tv" },
  firstEpisodeFileId: String,
  firstEpisodeNumber: Number,
  waitingFor: { type: String, enum: ["first", "last", "done", "movie"] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('IndexingQueue', indexingQueueSchema);
