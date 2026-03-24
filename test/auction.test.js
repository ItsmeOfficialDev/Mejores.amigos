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

    it('should allow auction to start with 4 players and accept valid bids', function(done) {
        this.timeout(15000);
        const clients = [];
        const names = ['P1', 'P2', 'P3', 'P4'];
        let bidSent = false;

        const setup = (name, isAdmin) => {
            const c = io(clientUri, { transports: ['websocket'] });
            clients.push(c);
            c.on('connect', () => {
                c.emit('joinAuction', { name, isAdmin });
            });

            c.on('stateUpdate', (state) => {
                if (state.players.length === 4 && isAdmin && state.gameStatus === 'lobby') {
                    c.emit('startAuction');
                }
                if (state.gameStatus === 'active' && isAdmin && state.currentBid === 5 && !bidSent) {
                    bidSent = true;
                    c.emit('bid', 10);
                }
                if (state.currentBid === 10) {
                    clients.forEach(cl => cl.disconnect());
                    done();
                }
            });
        };

        names.forEach((n, i) => setup(n, i === 0));
    });
});
