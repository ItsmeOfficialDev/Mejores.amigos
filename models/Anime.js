const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleLower: { type: String, required: true },
  jikanId: { type: Number, unique: true },
  posterUrl: String,
  bannerUrl: String,
  synopsis: String,
  type: String,
  totalEpisodes: Number,
  status: String,
  genres: [String],
  seasons: [{
    seasonNum: Number,
    episodes: [{
      epNum: Number,
      title: String,
      links: [{
          quality: String,
          url: String,
          provider: String
      }],
      subtitles: [{ lang: String, url: String }]
    }]
  }]
}, { timestamps: true });

animeSchema.index({ title: 'text', titleLower: 'text' });

module.exports = mongoose.model('Anime', animeSchema);
