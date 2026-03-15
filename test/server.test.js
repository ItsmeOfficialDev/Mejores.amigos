const { expect } = require('chai');
const io = require('socket.io-client');
const http = require('http');
const server = require('../server'); // Note: server.js must export the server object

// For testing purposes, we might need to export the server in server.js
