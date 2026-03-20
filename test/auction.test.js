const { expect } = require('chai');
const io = require('socket.io-client');
const http = require('http');
const { Server } = require('socket.io');
const express = require('express');
const auctionModule = require('../socket/auction');

describe('Auction Socket Logic', () => {
    let ioServer, server, clientUri;

    before((done) => {
        const app = express();
        server = http.createServer(app);
        ioServer = new Server(server);
        auctionModule(ioServer);
        server.listen(() => {
            const port = server.address().port;
            clientUri = `http://localhost:${port}/auction`;
            done();
        });
    });

    after(() => {
        ioServer.close();
        server.close();
    });

    it('should join auction and broadcast state', (done) => {
        const client = io(clientUri, { transports: ['websocket'] });
        client.on('connect', () => {
            client.emit('joinAuction', { name: 'TestPlayer', isAdmin: true });
        });
        client.on('stateUpdate', (state) => {
            if (state.players.length === 1 && state.players[0].name === 'TestPlayer') {
                client.disconnect();
                done();
            }
        });
    });

    it('should allow auction to start with 4 players and accept valid bids', (done) => {
        const clients = [];
        const names = ['P1', 'P2', 'P3', 'P4'];
        let activeAdmin = null;

        const cleanup = () => {
            clients.forEach(c => c.disconnect());
        };

        const setup = (name, isAdmin) => {
            const c = io(clientUri, { transports: ['websocket'] });
            c.on('connect', () => {
                c.emit('joinAuction', { name, isAdmin });
                clients.push(c);
                if (isAdmin) activeAdmin = c;

                if (clients.length === 4) {
                    setTimeout(() => {
                        activeAdmin.emit('startAuction');
                    }, 500);
                }
            });

            c.on('stateUpdate', (state) => {
                if (state.gameStatus === 'active' && isAdmin) {
                    // Try valid bid
                    c.emit('bid', 10);
                }
                if (state.currentBid === 10) {
                    cleanup();
                    done();
                }
            });
        };

        names.forEach((n, i) => setup(n, i === 0));
    });
});
