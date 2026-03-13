// Vercel Serverless Function — wraps the Express app for API routes
const { app, connectMongo } = require('../backend/app');

// Connect to MongoDB (cached across warm invocations)
connectMongo().catch((err) => console.error('MongoDB connection error:', err));

// Export Express app as Vercel handler
module.exports = app;
