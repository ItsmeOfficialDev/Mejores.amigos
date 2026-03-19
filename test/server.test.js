const { expect } = require('chai');
const io = require('socket.io-client');
const http = require('http');
const server = require('../index'); // Note: index.js must export the server object

// For testing purposes, we might need to export the server in index.js
