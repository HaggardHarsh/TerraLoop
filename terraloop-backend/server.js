'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./firebase');
const errorHandler = require('./middleware/errorHandler');

// Routes
const scanRoute = require('./routes/scan');
const userRoute = require('./routes/user');
const garageRoute = require('./routes/garage');
const postsRoute = require('./routes/posts');
const facilitiesRoute = require('./routes/facilities');
const impactRoute = require('./routes/impact');
const notificationsRoute = require('./routes/notifications');

// ── Init ──────────────────────────────────────
initFirebase();

const app = express();
const PORT = process.env.PORT || 3000;

// ── CORS ──────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, file://)
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') return callback(null, true);
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
}));

// ── Body Parsers ──────────────────────────────
app.use(express.json({ limit: '15mb' })); // large limit for base64 images
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// ── Request Logger (dev) ──────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`→ ${req.method} ${req.path}`);
    next();
  });
}

// ── Health Check ──────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'TerraLoop API',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// ── API Routes ────────────────────────────────
app.use('/api/scan', scanRoute);
app.use('/api/user', userRoute);
app.use('/api/garage', garageRoute);
app.use('/api/posts', postsRoute);
app.use('/api/facilities', facilitiesRoute);
app.use('/api/impact', impactRoute);
app.use('/api/notifications', notificationsRoute);

// ── 404 ───────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ─────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  🌿 TerraLoop API');
  console.log(`  ➜  Running at http://localhost:${PORT}`);
  console.log(`  ➜  Health:    http://localhost:${PORT}/health`);
  console.log(`  ➜  Mode:      ${process.env.NODE_ENV}`);
  console.log('');
});

module.exports = app;
