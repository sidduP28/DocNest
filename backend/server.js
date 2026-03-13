// Fix ISP DNS blocking MongoDB SRV lookups
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const { app, connectMongo } = require('./app');

// Socket.io (only for local dev — not available on Vercel serverless)
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});
app.set('io', io);

const socketHandlers = require('./socket/socketHandlers');
socketHandlers(io);

// Connect to MongoDB and start server
connectMongo()
  .then(() => {
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`🚀 DocNest backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB error:', err);
    process.exit(1);
  });
