const { expect } = require('chai');
const io = require('socket.io-client');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

describe('Mejores Amigos Auction Game', () => {
    let ioServer, server;
    let client1, client2, client3, client4;
    const port = 4000;

    before((done) => {
        const app = express();
        server = http.createServer(app);
        ioServer = new Server(server);

        // Mock server logic for testing
        let players = [];
        ioServer.on('connection', (socket) => {
            socket.on('join', ({ name, password }) => {
                if (name.endsWith('admin') && password === '123456') {
                    let cleanName = name.slice(0,-5);
                    cleanName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
                    const user = { id: socket.id, name: cleanName, isAdmin: true };
                    players.push(user);
                    socket.emit('joined', { user, gameStatus: 'lobby' });
                } else {
                    const user = { id: socket.id, name, isAdmin: false };
                    players.push(user);
                    socket.emit('joined', { user, gameStatus: 'lobby' });
                }
                ioServer.emit('playerList', players.map(p => ({ name: p.name, isAdmin: p.isAdmin })));
            });
        });

        server.listen(port, done);
    });

    after(() => {
        server.close();
        ioServer.close();
    });

    afterEach(() => {
        if (client1) client1.disconnect();
        if (client2) client2.disconnect();
        if (client3) client3.disconnect();
        if (client4) client4.disconnect();
    });

    it('should allow a player to join the lobby', (done) => {
        client1 = io(`http://localhost:${port}`);
        client1.on('joined', (data) => {
            expect(data.user.name).to.equal('Rohit');
            expect(data.gameStatus).to.equal('lobby');
            done();
        });
        client1.emit('join', { name: 'Rohit' });
    });

    it('should identify an admin correctly', (done) => {
        client2 = io(`http://localhost:${port}`);
        client2.on('joined', (data) => {
            expect(data.user.isAdmin).to.be.true;
            expect(data.user.name).to.equal('Ishan');
            done();
        });
        client2.emit('join', { name: 'ishanadmin', password: '123456' });
    });
});
