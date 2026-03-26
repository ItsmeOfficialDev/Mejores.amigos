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

const MONGODB_URI = process.env.MONGODB_URI;
const IS_PLACEHOLDER = !MONGODB_URI || MONGODB_URI.includes('cluster.mongodb.net') || MONGODB_URI.includes('<password>');

if (!IS_PLACEHOLDER) {
    mongoose.connect(MONGODB_URI).catch(e => console.error('DB Error:', e));
}

const Log = require('./models/Log');

app.set('trust proxy', 1);

// --- SECURITY & HTTPS ---
app.use((req, res, next) => {
    if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    next();
});

app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy',
        "default-src 'self' https:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; " +
        "style-src 'self' 'unsafe-inline' https:; " +
        "font-src 'self' https:; " +
        "img-src 'self' data: https:; " +
        "connect-src 'self' https: wss: ws:;"
    );
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

    next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const sessionOptions = {
    secret: process.env.SESSION_SECRET || 'mejores-ultra-secret-2025-prod-v4',
    resave: true,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000
    }
};

if (!IS_PLACEHOLDER) {
    sessionOptions.store = MongoStore.create({ mongoUrl: MONGODB_URI });
}

const sessionMiddleware = session(sessionOptions);
app.use(sessionMiddleware);
io.engine.use(sessionMiddleware);

app.use(express.static(path.join(__dirname, 'public')));

// Helper for logging activity
async function trackActivity(userName, action, details = {}) {
    if (!IS_PLACEHOLDER) {
        try { await Log.create({ userName, action, details }); } catch (e) {}
    }
}

// --- AUTH API ---
app.post('/api/login', async (req, res) => {
    const { name, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const nameLower = name.trim().toLowerCase();
    let isAdmin = process.env.NODE_ENV === 'production';
    let finalName = name.trim();

    if (nameLower === 'admin' && password === 'Devadutt@2011') {
        isAdmin = true;
        finalName = 'Main Admin';
    } else if (nameLower === 'admin') {
        return res.status(401).json({ error: 'Invalid admin password' });
    }

    finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
    req.session.name = finalName;
    req.session.isMainAdmin = isAdmin;

    await trackActivity(finalName, 'website_login');

    req.session.save(() => res.json({ user: { name: finalName, isAdmin } }));
});

app.post('/api/auction/login', async (req, res) => {
    const { name, password } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });
    const nameLower = name.trim().toLowerCase();
    let isAuctionAdmin = process.env.NODE_ENV === 'production';
    let finalName = name.trim();

    if (nameLower.endsWith('admin')) {
        if (password === '123456') {
            isAuctionAdmin = true;
            finalName = finalName.slice(0, -5).trim();
        } else {
            return res.status(401).json({ error: 'Invalid auction PIN' });
        }
    }

    finalName = finalName.charAt(0).toUpperCase() + finalName.slice(1);
    req.session.auctionName = finalName;
    req.session.isAuctionAdmin = isAuctionAdmin;

    await trackActivity(finalName, 'auction_join_lobby', { isAuctionAdmin });

    req.session.save(() => res.json({ user: { name: finalName, isAuctionAdmin } }));
});

app.get('/api/me', (req, res) => {
    if (req.session.name) return res.json({ user: { name: req.session.name, isAdmin: req.session.isMainAdmin } });
    res.status(401).json({ error: 'Unauthorized' });
});

app.get('/api/admin/tracking', async (req, res) => {
    if (!req.session.isMainAdmin) return res.status(403).json({ error: 'Forbidden' });
    if (IS_PLACEHOLDER) return res.json({ logs: [], userCount: 0 });

    const logs = await Log.find().sort({ timestamp: -1 }).limit(100);
    const userCount = await Log.distinct('userName').then(u => u.length);
    res.json({ logs, userCount });
});

app.get('/api/last-auction', (req, res) => {
    const filePath = path.join(__dirname, 'last_auction_stats.json');
    if (fs.existsSync(filePath)) {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        return res.json(data);
    }
    res.status(404).json({ error: 'No stats found' });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.clearCookie('connect.sid');
    res.json({ success: true });
});

// --- ROUTES ---
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public/admin.html')));
app.get('/games', (req, res) => res.sendFile(path.join(__dirname, 'public/games.html')));
app.get('/auction/login', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/login.html')));
app.get('/auction/lobby', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/lobby.html')));
app.get('/auction/game', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/index.html')));
app.get('/auction/results', (req, res) => res.sendFile(path.join(__dirname, 'public/auction/results.html')));

require('./socket/tictactoe')(io, trackActivity);
require('./socket/auction')(io, trackActivity);

const PORT = process.env.PORT || 10000;
server.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

process.on('unhandledRejection', (r) => console.error('Rejection:', r));
process.on('uncaughtException', (e) => console.error('Exception:', e));
