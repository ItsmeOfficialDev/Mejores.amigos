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

const MONGODB_URI = process.env.MONGODB_URI;
const IS_INVALID_URI = !MONGODB_URI ||
                       MONGODB_URI.includes('<password>') ||
                       MONGODB_URI.includes('cluster.mongodb.net');

let isUsingMemoryDB = true;

if (MONGODB_URI && !IS_INVALID_URI) {
    mongoose.connect(MONGODB_URI)
      .then(() => {
          console.log('Connected to MongoDB');
          isUsingMemoryDB = false;
      })
      .catch(err => {
          console.error('DB Connection Failed:', err.message);
      });
}

app.set('trust proxy', 1); // Trust first proxy (Render)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'mejores-ultra-secret',
  resave: true,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
};

if (MONGODB_URI && !IS_INVALID_URI) {
    sessionOptions.store = MongoStore.MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions'
    });
}

const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH API ---
app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });

  const nameLower = name.trim().toLowerCase();
  let isMainAdmin = false;
  let finalName = name.trim();

  if (nameLower === 'admin' || nameLower.endsWith('admin')) {
    if (password === '123456' || password === 'Devadutt@2011') {
        isMainAdmin = true;
        finalName = (nameLower === 'admin') ? 'Admin' : finalName.slice(0, -5).trim();
    } else {
        return res.status(401).json({ error: 'Invalid admin password' });
    }
  }

  finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);

  if (mongoose.connection.readyState === 1) {
    try {
      let user = await User.findOne({ nameLower: finalName.toLowerCase() });
      if (!user) {
        user = new User({
          name: finalName,
          nameLower: finalName.toLowerCase(),
          isMainAppAdmin: isMainAdmin,
          isAuctionAdmin: isMainAdmin
        });
      }
      await user.save();
      req.session.userId = user._id;
    } catch (e) {
        console.error('User save error:', e.message);
    }
  }

  req.session.name = finalName;
  req.session.isMainAppAdmin = isMainAdmin;

  req.session.save((err) => {
    if (err) {
        console.error('Session save error:', err);
        return res.status(500).json({ error: 'Internal Session Error' });
    }
    res.json({ user: { name: finalName, isAuctionAdmin: isMainAdmin, isAdmin: isMainAdmin } });
  });
});

app.get('/api/me', (req, res) => {
    if (req.session && req.session.name) {
        return res.json({ user: { name: req.session.name, isAuctionAdmin: req.session.isMainAppAdmin, isAdmin: req.session.isMainAppAdmin } });
    }
    res.status(401).json({ error: 'Unauthorized' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.clearCookie('connect.sid');
  res.json({ success: true });
});

// --- ANIME API ---
app.get('/api/anime/search', async (req, res) => {
    const { q } = req.query;
    try {
        const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${q}&limit=10`);
        const results = response.data.data.map(a => ({
            title: a.title,
            posterUrl: a.images.webp.large_image_url,
            synopsis: a.synopsis,
            jikanId: a.mal_id
        }));
        res.json(results);
    } catch (e) {
        res.status(500).json({ error: 'Search failed' });
    }
});

app.post('/api/watch-history', async (req, res) => {
    if (!req.session.name || !mongoose.connection.readyState === 1) return res.sendStatus(204);
    const { title, timestamp } = req.body;
    try {
        await User.updateOne(
            { nameLower: req.session.name.toLowerCase() },
            { $push: { watchHistory: { $each: [{ animeTitle: title, timestamp, updatedAt: new Date() }], $position: 0, $slice: 10 } } }
        );
        res.sendStatus(200);
    } catch (e) { res.sendStatus(500); }
});

app.get('/api/watch-history', async (req, res) => {
    if (!req.session.name || !mongoose.connection.readyState === 1) return res.json([]);
    const user = await User.findOne({ nameLower: req.session.name.toLowerCase() });
    res.json(user ? user.watchHistory : []);
});

// --- ADMIN API ---
app.get('/api/admin/stats', async (req, res) => {
    if (!req.session.isMainAppAdmin) return res.status(403).json({ error: 'Forbidden' });
    res.json({
        userCount: mongoose.connection.readyState === 1 ? await User.countDocuments() : 'N/A',
        animeCount: 191,
        uptime: Math.floor((Date.now() - startTime) / 1000),
        connections: io.engine.clientsCount
    });
});

app.get('/api/admin/users', async (req, res) => {
    if (!req.session.isMainAppAdmin) return res.status(403).json({ error: 'Forbidden' });
    if (mongoose.connection.readyState === 1) {
        const users = await User.find().sort('-createdAt').limit(50);
        res.json(users);
    } else {
        res.json([{ name: req.session.name, isMainAppAdmin: true }]);
    }
});

// --- ROUTES ---
app.get('/auction/lobby.html', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/lobby.html')));
app.get('/auction/index.html', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/index.html')));
app.get('/auction/results.html', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/results.html')));

require('./socket/chess')(io);
require('./socket/tictactoe')(io);
require('./socket/auction')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});

process.on('unhandledRejection', (reason) => console.error('Rejection:', reason));
process.on('uncaughtException', (error) => console.error('Exception:', error));
