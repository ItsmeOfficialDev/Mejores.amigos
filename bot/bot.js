const TelegramBot = require('node-telegram-bot-api');
const Anime = require('../models/Anime');
const IndexingQueue = require('../models/IndexingQueue');
const jikan = require('./jikan');

module.exports = function(token, adminId) {
  if (!token) {
    console.warn('TELEGRAM_BOT_TOKEN not provided. Bot disabled.');
    return null;
  }

  const bot = new TelegramBot(token, { polling: true });

  const isAuthorized = (msg) => msg.from.id.toString() === adminId.toString();

  bot.onText(/\/start/, (msg) => {
    if (!isAuthorized(msg)) return bot.sendMessage(msg.chat.id, "Unauthorized.");

    bot.sendMessage(msg.chat.id, `🎬 Mejores Amigos Anime Indexing Bot

Commands:
/index <anime name> - Index TV series
/movie <movie name> - Index movie
/stopindex - Stop current session
/status - Current status
/list - List indexed anime`);
  });

  bot.onText(/\/index (.+)/, async (msg, match) => {
    if (!isAuthorized(msg)) return;
    const animeName = match[1].trim();

    await IndexingQueue.deleteMany({ userId: msg.from.id });
    await new IndexingQueue({
      userId: msg.from.id,
      currentAnime: animeName,
      waitingFor: 'first'
    }).save();

    bot.sendMessage(msg.chat.id, `📥 Indexing "${animeName}". Send the FIRST episode file.`);
  });

  bot.on('message', async (msg) => {
    if (!isAuthorized(msg)) return;
    if (msg.text && msg.text.startsWith('/')) return;

    const queue = await IndexingQueue.findOne({ userId: msg.from.id });
    if (!queue) return;

    const fileId = msg.document?.file_id || msg.video?.file_id;
    if (!fileId) return;

    if (queue.waitingFor === 'first') {
      queue.firstEpisodeFileId = fileId;
      queue.waitingFor = 'last';
      await queue.save();
      bot.sendMessage(msg.chat.id, "✅ First episode received. Now send the LAST episode file (or /done).");
    } else if (queue.waitingFor === 'last') {
       // Simple indexing logic: store first/last, meta from jikan
       const searchRes = await jikan.searchAnime(queue.currentAnime);
       const animeMeta = searchRes.data[0];

       if (!animeMeta) {
         return bot.sendMessage(msg.chat.id, "Could not find anime on Jikan. Check title.");
       }

       let anime = await Anime.findOne({ jikanId: animeMeta.mal_id });
       if (!anime) {
         anime = new Anime({
           title: animeMeta.title,
           titleLower: animeMeta.title.toLowerCase(),
           jikanId: animeMeta.mal_id,
           posterUrl: animeMeta.images.webp.image_url,
           synopsis: animeMeta.synopsis,
           type: animeMeta.type?.toLowerCase() || 'tv'
         });
       }

       // For MVP, just index one season one range
       const season = {
         seasonNumber: queue.currentSeason,
         episodes: [
           { episodeNumber: 1, telegramFileId: queue.firstEpisodeFileId, title: "Start" },
           { episodeNumber: 2, telegramFileId: fileId, title: "End" }
         ]
       };

       anime.seasons.push(season);
       await anime.save();
       await queue.deleteOne();

       bot.sendMessage(msg.chat.id, `✅ "${anime.title}" indexed successfully!`);
    }
  });

  return bot;
};
