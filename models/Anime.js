const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  title: { type: String, required: true },
  titleLower: { type: String, required: true },
  searchTerms: [String],
  jikanId: Number,
  posterUrl: String,
  bannerUrl: String,
  synopsis: String,
  genres: [String],
  status: String,
  type: { type: String, enum: ["tv", "movie", "ova", "special"], default: "tv" },
  totalEpisodes: Number,
  year: Number,
  rating: String,
  seasons: [
    {
      seasonNumber: { type: Number, required: true },
      seasonTitle: String,
      episodes: [
        {
          episodeNumber: { type: Number, required: true },
          title: String,
          telegramFileId: { type: String, required: true },
          duration: Number,
          thumbnailFileId: String,
          subtitles: [
            {
              language: { type: String, required: true },
              fileId: { type: String, required: true },
              default: { type: Boolean, default: false }
            }
          ],
          audioTracks: [
            {
              language: { type: String, required: true },
              fileId: { type: String, required: true },
              default: { type: Boolean, default: false }
            }
          ],
          qualityVersions: [
            {
              quality: { type: String, required: true },
              fileId: { type: String, required: true }
            }
          ]
        }
      ]
    }
  ],
  movies: [
    {
      title: String,
      telegramFileId: { type: String, required: true },
      posterUrl: String,
      synopsis: String,
      duration: Number,
      subtitles: [
        {
          language: String,
          fileId: String,
          default: Boolean
        }
      ],
      audioTracks: [
        {
          language: String,
          fileId: String,
          default: Boolean
        }
      ],
      qualityVersions: [
        {
          quality: String,
          fileId: String
        }
      ]
    }
  ],
  indexedAt: { type: Date, default: Date.now },
  lastUpdated: { type: Date, default: Date.now }
});

animeSchema.index({ title: 'text', titleLower: 'text' });

module.exports = mongoose.model('Anime', animeSchema);
