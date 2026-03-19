const { expect } = require('chai');
const io = require('socket.io-client');
const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const auctionModule = require('../socket/auction');

describe('Auction Socket Logic', () => {
    let ioServer, clientSocket, server;

    before((done) => {
        const app = express();
        server = http.createServer(app);
        ioServer = new Server(server);
        auctionModule(ioServer);
        server.listen(() => {
            const port = server.address().port;
            clientSocket = io(`http://localhost:${port}/auction`, { transports: ['websocket'] });
            clientSocket.on('connect', done);
        });
    });

    after(() => {
        ioServer.close();
        clientSocket.disconnect();
        server.close();
    });

    it('should join auction and broadcast state', (done) => {
        clientSocket.once('stateUpdate', (state) => {
            expect(state.players).to.have.lengthOf(1);
            expect(state.players[0].name).to.equal('TestPlayer');
            done();
        });
        clientSocket.emit('joinAuction', { name: 'TestPlayer', isAdmin: true });
    });

    it('should respect bid increments of 5', (done) => {
        // First join 4 players to allow start
        const clients = [];
        let joinCount = 0;
        const names = ['P1', 'P2', 'P3', 'P4'];

        const checkStart = () => {
            joinCount++;
            if (joinCount === 4) {
                const admin = clients[0];
                admin.emit('startAuction');
                admin.once('stateUpdate', (state) => {
                    if (state.gameStatus === 'active') {
                        // Try invalid bid
                        admin.emit('bid', 7);
                        setTimeout(() => {
                            admin.emit('bid', 10);
                            admin.once('stateUpdate', (s2) => {
                                expect(s2.currentBid).to.equal(10);
                                clients.forEach(c => c.disconnect());
                                done();
                            });
                        }, 500);
                    }
                });
            }
        };

        names.forEach((n, i) => {
            const c = io(clientSocket.io.uri, { transports: ['websocket'] });
            c.on('connect', () => {
                c.emit('joinAuction', { name: n, isAdmin: i === 0 });
                clients.push(c);
                checkStart();
            });
        });
    });
});
