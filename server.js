/**
 * AutoNest Backend — server.js
 * Main entry point: sets up Express, connects to MongoDB, mounts all routes.
 */

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');
require('dotenv').config();
console.log("ENV CHECK:", process.env.RAZORPAY_KEY_ID);

const connectDB = require('./config/db');

// ── Route imports ─────────────────────────────────────────────
const authRoutes    = require('./routes/authRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const orderRoutes   = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const userRoutes    = require('./routes/userRoutes');

// ── Connect to MongoDB ────────────────────────────────────────
connectDB();

const app = express();

// ── Security & Middleware ─────────────────────────────────────
app.use(helmet());   // sets secure HTTP headers

// CORS — allow your frontend origin
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://127.0.0.1:5500",
  credentials: true,
}));

app.use(morgan('dev'));  // request logging in terminal

// IMPORTANT: For Razorpay webhook, we need raw body — mount it BEFORE express.json()
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// For all other routes, parse JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health Check ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ success: true, message: 'AutoNest API is running 🚀' });
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',     authRoutes);
app.use('/api/users',    userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/orders',   orderRoutes);
app.use('/api/payments', paymentRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ── Global Error Handler ──────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
  });
});

// ── Start Server ──────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ AutoNest server running on http://localhost:${PORT}`);
});
