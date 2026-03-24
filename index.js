require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  transports: ['websocket', 'polling']
});

const User = require('./models/User');

const MONGODB_URI = process.env.MONGODB_URI;
const IS_PLACEHOLDER = !MONGODB_URI || MONGODB_URI.includes('cluster.mongodb.net');

if (!IS_PLACEHOLDER) {
    mongoose.connect(MONGODB_URI).catch(e => console.error('DB Error:', e));
}

app.set('trust proxy', 1);
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

if (!IS_PLACEHOLDER) {
    sessionOptions.store = MongoStore.MongoStore.create({ mongoUrl: MONGODB_URI });
}

const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/login', async (req, res) => {
  const { name, password } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const nameLower = name.trim().toLowerCase();
  let isAdmin = false;
  let finalName = name.trim();
  if (nameLower === 'admin' && password === 'Devadutt@2011') { isAdmin = true; finalName = 'Main Admin'; }
  else if (nameLower === 'admin') return res.status(401).json({ error: 'Invalid admin password' });
  finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
  req.session.name = finalName;
  req.session.isMainAdmin = isAdmin;
  req.session.save(() => res.json({ user: { name: finalName, isAdmin } }));
});

app.post('/api/auction/login', (req, res) => {
    const { name, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const nameLower = name.trim().toLowerCase();
    let isAuctionAdmin = false;
    let finalName = name.trim();
    if (nameLower.endsWith('admin')) {
        if (password === '123456') { isAuctionAdmin = true; finalName = finalName.slice(0, -5).trim(); }
        else return res.status(401).json({ error: 'Invalid auction PIN' });
    }
    finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
    res.json({ user: { name: finalName, isAuctionAdmin } });
});

app.get('/api/me', (req, res) => {
    if (req.session.name) return res.json({ user: { name: req.session.name, isAdmin: req.session.isMainAdmin } });
    res.status(401).json({ error: 'Unauthorized' });
});

app.get('/api/last-auction', (req, res) => {
    const filePath = path.join(__dirname, 'last_auction.json');
    if (fs.existsSync(filePath)) return res.sendFile(filePath);
    res.status(404).json({ error: 'No data' });
});

app.get('/games.html', (req, res) => res.sendFile(path.join(__dirname, 'public/games.html')));
app.get('/auction/login', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/login.html')));
app.get('/auction/lobby', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/lobby.html')));
app.get('/auction/index', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/index.html')));
app.get('/auction/results', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/results.html')));

require('./socket/chess')(io);
require('./socket/tictactoe')(io);
require('./socket/auction')(io);

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
