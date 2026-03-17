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
const Log = require('./models/Log');
const BannedName = require('./models/BannedName');
const Anime = require('./models/Anime');
const ApprovedAnime = require('./models/ApprovedAnime');

// Database Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/test")
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'mejores-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI || "mongodb://localhost:27017/test" }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000
  }
});
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

// Socket Modules
require('./socket/chess')(io);
require('./socket/tictactoe')(io);
require('./socket/auction')(io);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Specific Routes
app.get('/auction/lobby', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/lobby.html')));
app.get('/auction', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/index.html')));
app.get('/auction/results', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/results.html')));

// API Routes
app.post('/api/login', async (req, res) => {
  let { name, password } = req.body;

  if (name === 'clearall') {
      await User.deleteMany({});
      await Log.deleteMany({});
      return res.json({ success: true });
  }

  if (!name || name.trim().length < 2) return res.status(400).json({ error: 'Name too short.' });

  const nameLower = name.trim().toLowerCase();
  const isBanned = await BannedName.findOne({ nameLower });
  if (isBanned) return res.status(403).json({ error: 'Banned.' });

  let isMainAppAdmin = false;
  let finalName = name.trim();

  if (nameLower === 'admin' || nameLower.endsWith('admin')) {
    if (password === 'Devadutt@2011') {
        isMainAppAdmin = true;
        if (nameLower === 'admin') finalName = 'Admin';
        else finalName = finalName.slice(0, -5).trim();
    } else {
        return res.status(401).json({ error: 'Invalid Platform Admin password.' });
    }
  }

  finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);

  try {
    let user = await User.findOne({ nameLower: finalName.toLowerCase() });
    if (!user) user = new User({ name: finalName, nameLower: finalName.toLowerCase(), isMainAppAdmin });
    else if (isMainAppAdmin) user.isMainAppAdmin = true;

    user.lastSeen = Date.now();
    await user.save();

    req.session.userId = user._id;
    req.session.name = user.name;
    req.session.isMainAppAdmin = user.isMainAppAdmin;

    res.json({ user: { id: user._id, name: user.name, isAdmin: user.isMainAppAdmin } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed.' });
  }
});

app.post('/api/login/auction', async (req, res) => {
  let { name, password } = req.body;
  const nameLower = name.trim().toLowerCase();
  let isAuctionAdmin = false;

  if (nameLower.endsWith('admin')) {
    if (password !== '123456') {
      return res.status(401).json({ error: 'Invalid Auction password.' });
    }
    isAuctionAdmin = true;
  }

  let finalName = name.trim();
  if (nameLower.endsWith('admin')) finalName = finalName.slice(0, -5).trim();
  finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);

  try {
      let user;
      if (req.session.userId) {
        user = await User.findById(req.session.userId);
      } else {
        user = await User.findOne({ nameLower: finalName.toLowerCase() });
        if (!user) user = new User({ name: finalName, nameLower: finalName.toLowerCase() });
      }

      user.isAuctionAdmin = isAuctionAdmin;
      await user.save();

      req.session.userId = user._id;
      req.session.name = user.name;
      req.session.isAuctionAdmin = isAuctionAdmin;
      res.json({ user: { isAuctionAdmin } });
  } catch (e) {
      res.status(500).json({ error: 'Auction login failed.' });
  }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

const adminCheck = (req, res, next) => {
  if (req.session.isMainAppAdmin) next();
  else res.status(403).json({ error: 'Unauthorized' });
};

app.get('/api/admin/users', adminCheck, async (req, res) => res.json(await User.find({})));
app.get('/api/admin/logs', adminCheck, async (req, res) => res.json(await Log.find({}).sort({ timestamp: -1 }).limit(100)));
app.get('/api/admin/stats', adminCheck, async (req, res) => {
  res.json({
    userCount: await User.countDocuments(),
    animeCount: await Anime.countDocuments(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
    connections: io.sockets.sockets.size
  });
});

app.get('/api/anime', async (req, res) => res.json(await Anime.find({}, 'title posterUrl type jikanId')));
app.get('/api/anime/:id', async (req, res) => res.json(await Anime.findOne({ jikanId: req.params.id })));

app.get('/api/stream/resolve', async (req, res) => {
    const { title, ep } = req.query;
    res.json({
        url: "https://www.w3schools.com/html/mov_bbb.mp4",
        title: `${title} — Episode ${ep}`
    });
});

const onlineUsers = new Map();
io.on('connection', (socket) => {
  const session = socket.request.session;
  if (!session || !session.userId) return;
  onlineUsers.set(socket.id, { name: session.name, isAdmin: session.isMainAppAdmin });
  io.emit('online-users', Array.from(onlineUsers.values()));
  socket.on('disconnect', () => {
    onlineUsers.delete(socket.id);
    io.emit('online-users', Array.from(onlineUsers.values()));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

module.exports = { app, server, io };
