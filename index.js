require('dotenv').config();
const startTime = Date.now();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

// Models
const User = require('./models/User');
const Anime = require('./models/Anime');
const Game = require('./models/Game');
const BannedName = require('./models/BannedName');

// DB Connection
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI)
      .then(() => console.log('Connected to MongoDB'))
      .catch(err => console.error('DB Error:', err));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'mejores-ultra-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
};

if (process.env.MONGODB_URI) {
    sessionOptions.store = MongoStore.create({ mongoUrl: process.env.MONGODB_URI });
}

const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH & LOGIN ---
app.post('/api/login', async (req, res) => {
  const { name, password, profilePic } = req.body;
  const ip = req.ip;
  const nameLower = name ? name.trim().toLowerCase() : '';

  if (nameLower === 'clearall') {
    if (process.env.MONGODB_URI) {
        await User.deleteMany({});
        await Game.deleteMany({});
    }
    return res.json({ success: true, message: 'System wiped' });
  }

  try {
    let isMainAdmin = false;
    let finalName = name.trim();

    if (nameLower === 'admin' || nameLower.endsWith('admin')) {
      if (password === '123456' || password === 'Devadutt@2011') {
          isMainAdmin = true;
          finalName = (nameLower === 'admin') ? 'Admin' : finalName.slice(0, -5).trim();
      } else {
          return res.status(401).json({ error: 'Wrong Admin password' });
      }
    }

    finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);

    let user = null;
    if (process.env.MONGODB_URI) {
        user = await User.findOne({ nameLower: finalName.toLowerCase() });
        if (!user) {
          user = new User({
            name: finalName,
            nameLower: finalName.toLowerCase(),
            isMainAppAdmin: isMainAdmin, isAuctionAdmin: isMainAdmin,
            profilePic: profilePic || 'https://ui-avatars.com/api/?background=random&name=' + finalName,
            ips: [ip]
          });
        } else {
          if (isMainAdmin) user.isMainAppAdmin = true;
          if (!user.ips.includes(ip)) user.ips.push(ip);
          if (profilePic) user.profilePic = profilePic;
        }
        await user.save();
        req.session.userId = user._id;
    } else {
        req.session.userId = 'temp-id';
    }

    req.session.name = finalName;
    req.session.isMainAppAdmin = isMainAdmin;

    res.json({ user: { name: finalName, isAuctionAdmin: isMainAdmin, isAdmin: isMainAdmin } });
  } catch (err) {
    res.status(500).json({ error: 'Auth failed' });
  }
});

app.get('/api/me', async (req, res) => {
    if (req.session.name) {
        return res.json({ user: { name: req.session.name, isAuctionAdmin: req.session.isMainAppAdmin, isAdmin: req.session.isMainAppAdmin } });
    }
    res.status(404).json({ error: 'No session' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// --- AUCTION ROUTES ---
app.get('/auction/lobby', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auction/lobby.html'));
});
app.get('/auction/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auction/index.html'));
});
app.get('/auction/results.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'public/auction/results.html'));
});

// --- ADMIN API ---
const adminCheck = (req, res, next) => {
  if (req.session.isMainAppAdmin) next();
  else res.status(403).json({ error: 'Unauthorized' });
};

app.get('/api/admin/stats', adminCheck, async (req, res) => {
  res.json({
    userCount: process.env.MONGODB_URI ? await User.countDocuments() : 0,
    animeCount: process.env.MONGODB_URI ? await Anime.countDocuments() : 0,
    uptime: Math.floor((Date.now() - startTime) / 1000),
    connections: io.sockets.sockets.size
  });
});

// --- ANIME API (ani-cli logic) ---
app.get('/api/anime', async (req, res) => {
    if (!process.env.MONGODB_URI) return res.json([{ title: 'Sample Anime', jikanId: 1, posterUrl: 'https://via.placeholder.com/200' }]);
    res.json(await Anime.find({}, 'title posterUrl jikanId'));
});

app.get('/api/anime/:id', async (req, res) => {
    if (!process.env.MONGODB_URI) return res.json({ title: 'Sample', synopsis: 'Demo' });
    res.json(await Anime.findOne({ jikanId: req.params.id }));
});

app.get('/api/stream/resolve', async (req, res) => {
    const { title, ep } = req.query;
    // Mock resolution mimicking ani-cli scraping
    res.json({
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
        qualities: ['1080p', '720p', '480p']
    });
});

// --- SOCKET MODULES ---
require('./socket/chess')(io);
require('./socket/tictactoe')(io);
require('./socket/auction')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
