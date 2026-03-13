// Fix ISP DNS blocking MongoDB SRV lookups
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Initialize firebase-admin early so middleware can use it
const admin = require('firebase-admin');
if (!admin.apps.length) {
  let serviceAccount;
  if (process.env.FIREBASE_ADMIN_SDK_JSON) {
    serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_SDK_JSON);
  } else {
    serviceAccount = require('./firebase-admin-sdk.json');
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

const app = express();

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 500, standardHeaders: true, legacyHeaders: false }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/hospitals',      require('./routes/hospitals'));
app.use('/api/patient',        require('./routes/patientAuth'));
app.use('/api/hospital',       require('./routes/hospitalAuth'));
app.use('/api/blood-requests', require('./routes/bloodRequests'));
app.use('/api/appointments',   require('./routes/appointments'));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date() }));

// ─── MongoDB (connect once, reuse across serverless calls) ────────────────────
let mongoConnected = false;
async function connectMongo() {
  if (mongoConnected || mongoose.connection.readyState === 1) return;
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'docnest' });
  mongoConnected = true;
  console.log('✅ MongoDB connected');
}

module.exports = { app, connectMongo };
