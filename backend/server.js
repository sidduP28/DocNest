// Fix ISP DNS blocking MongoDB SRV lookups
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Initialize firebase-admin early so middleware can use it
const admin = require('firebase-admin');
if (!admin.apps.length) {
  let serviceAccount;
  if (process.env.FIREBASE_ADMIN_SDK_JSON) {
    // Production: JSON string stored in environment variable (Render, Vercel, etc.)
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
  } else {
    // Local dev: JSON file on disk
    serviceAccount = require('./firebase-admin-sdk.json');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
});

// Attach io to app so routes can access it
app.set('io', io);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/hospitals',     require('./routes/hospitals'));
app.use('/api/patient',       require('./routes/patientAuth'));
app.use('/api/hospital',      require('./routes/hospitalAuth'));
app.use('/api/blood-requests',require('./routes/bloodRequests'));
app.use('/api/appointments',  require('./routes/appointments'));

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── Socket.io ────────────────────────────────────────────────────────────────
const socketHandlers = require('./socket/socketHandlers');
socketHandlers(io);

// ─── MongoDB ──────────────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: 'docnest',
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB error:', err));

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 DocNest backend running on http://localhost:${PORT}`);
});
