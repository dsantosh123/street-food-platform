const app = require('./server/app');
const socketIo = require('socket.io');
const http = require('http');
const { setupWebSocket } = require('./server/utils/websocket');

const PORT = process.env.PORT || 5000;

// Create HTTP server
const server = http.createServer(app);

// Setup Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Setup WebSocket functionality
setupWebSocket(io);

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📱 Socket.io server ready for real-time updates`);
});

module.exports = { server, io };