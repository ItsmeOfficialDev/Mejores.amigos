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
const IS_PLACEHOLDER_URI = !MONGODB_URI || MONGODB_URI.includes('cluster.mongodb.net');

// DB Connection
if (MONGODB_URI && !IS_PLACEHOLDER_URI) {
    mongoose.connect(MONGODB_URI)
      .then(() => console.log('Connected to MongoDB'))
      .catch(err => console.error('DB Error:', err.message));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionOptions = {
  secret: process.env.SESSION_SECRET || 'mejores-ultra-secret',
  resave: true, // Force session to be saved back to the session store
  saveUninitialized: true, // Force a session that is "uninitialized" to be saved to the store
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
};

if (MONGODB_URI && !IS_PLACEHOLDER_URI) {
    sessionOptions.store = MongoStore.MongoStore.create({
        mongoUrl: MONGODB_URI,
        collectionName: 'sessions'
    });
}

const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

// --- AUTH ---
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
        return res.status(401).json({ error: 'Wrong Admin password' });
    }
  }

  finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);

  // Persistence if DB connected
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
    } catch (e) {}
  }

  req.session.name = finalName;
  req.session.isMainAppAdmin = isMainAdmin;

  // Explicitly save session before responding
  req.session.save((err) => {
    if (err) return res.status(500).json({ error: 'Session save failed' });
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
  res.json({ success: true });
});

// --- ROUTES ---
app.get('/auction/lobby.html', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/lobby.html')));
app.get('/auction/index.html', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/index.html')));
app.get('/auction/results.html', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/results.html')));

// --- SOCKETS ---
require('./socket/chess')(io);
require('./socket/tictactoe')(io);
require('./socket/auction')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (r) => console.error('Rejection:', r));
process.on('uncaughtException', (e) => console.error('Exception:', e));
