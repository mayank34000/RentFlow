'use strict';

/**
 * RentFlow — Express Application Entry Point
 *
 * Responsibilities of this file (keep it focused):
 *   1. Load environment variables
 *   2. Connect to the database
 *   3. Configure Express middleware (JSON, CORS)
 *   4. Mount API routes
 *   5. Register health, 404, and error handlers
 *   6. Start the HTTP server
 */

// ── 1. Environment variables ──────────────────────────────────────────────────
require('dotenv').config();

// ── 2. Core dependencies ──────────────────────────────────────────────────────
const express   = require('express');
const authRoutes = require('./routes/auth');
const cors      = require('cors');
const mongoose  = require('mongoose');
const connectDB = require('./config/db');
const http      = require('http');
const { Server } = require('socket.io');
const errorHandler    = require('./middleware/errorHandler');
const requestLogger   = require('./middleware/requestLogger');

// ── 3. App setup ──────────────────────────────────────────────────────────────
const app = express();
const httpServer = http.createServer(app);
const defaultOrigins = 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5501,http://127.0.0.1:5501,http://127.0.0.1:5500';

function getAllowedOrigins() {
    if (process.env.NODE_ENV === 'production') {
        return process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(o => o.trim()) : [];
    }
    const originsString = process.env.CORS_ORIGIN || defaultOrigins;
    return originsString.split(',').map(o => o.trim());
}

const originCallback = (origin, callback) => {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    const allowedOrigins = getAllowedOrigins();

    if (allowedOrigins.indexOf(origin) !== -1) {
        callback(null, true);
    } else {
        // Disallowed origin should simply receive no Access-Control-Allow-Origin header, not a 500
        callback(null, false);
    }
};

// CORS — allow the configured origin
app.use(cors({ origin: originCallback, credentials: true }));

// Socket.IO configuration
const io = new Server(httpServer, {
    cors: { origin: originCallback, methods: ['GET', 'POST'] }
});
require('./sockets/chatSocket')(io);

// Parse incoming JSON request bodies
app.use(express.json());

// ── HTTP request logger (Mayank — Stage 3) ────────────────────────────────────
// Must be mounted AFTER express.json() (so req.path is resolved) but BEFORE
// any route handlers so every request is captured.
app.use(requestLogger);

// ── 4. Static Files ───────────────────────────────────────────────────────────
const path = require('path');
app.use('/uploads', (req, res, next) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
}, express.static(path.join(__dirname, 'uploads')));


const rateLimit = require('express-rate-limit');
const authenticateToken = require('./middleware/authMiddleware');

// Trust proxy for production rate limiting
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
}

// 1. Login limiter
const loginLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX) || 5,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Too many login attempts, please try again later' },
    validate: { trustProxy: false, xForwardedForHeader: false }
});

// 2. OTP limiter
const otpLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_OTP_MAX) || 5,
    keyGenerator: (req, res) => {
        const ip = rateLimit.ipKeyGenerator(req, res);
        const email = req.body && req.body.email ? req.body.email.toLowerCase() : '';
        return `${ip}_${email}`;
    },
    message: { success: false, message: 'Too many requests, please try again later' },
    validate: { trustProxy: false, xForwardedForHeader: false }
});

// 3. Payment limiter
const paymentLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX) || 10,
    keyGenerator: (req, res) => {
        return req.user ? req.user._id.toString() : rateLimit.ipKeyGenerator(req, res);
    },
    message: { success: false, message: 'Too many payment attempts, please try again later' },
    validate: { trustProxy: false, xForwardedForHeader: false }
});

// Mount limiters by path
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/send-otp', otpLimiter);
app.use('/api/auth/forgot-password/send-otp', otpLimiter);
app.use('/api/auth/forgot-password/verify-otp', otpLimiter);
app.use('/api/auth/forgot-password/reset', otpLimiter);

// Payment routing with limiter
// authMiddleware -> paymentLimiter -> existing payment route

// ── 5. API Routes ─────────────────────────────────────────────────────────────
// User-facing routes (from main)
app.use('/api/listings', require('./routes/listings'));
app.use("/api/payment", authenticateToken, paymentLimiter, require("./routes/payment"));

app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/contact', require('./routes/contact'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/auth', authRoutes);

// Admin & Auth routes (from feature/admin)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));


// ── 5a. Health check ──────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
    let dbStatus;

    if (!process.env.MONGO_URI) {
        dbStatus = 'not_configured';
    } else {
        const state = mongoose.connection.readyState;
        dbStatus = state === 1 ? 'connected' : 'disconnected';
    }

    res.json({
        success: true,
        message: 'Server is running',
        database: dbStatus,
    });
});

// ── 5b. 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Route not found',
    });
});

// ── 5c. Global error handler ──────────────────────────────────────────────────
app.use(errorHandler);

// ── 6. Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

// Validate JWT_SECRET for auth/admin routes
if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set in .env');
  process.exit(1);
}

const startServer = async () => {
    // Attempt DB connection first
    await connectDB();

    httpServer.listen(PORT, () => {
        console.log(`[Server] RentFlow API running on http://localhost:${PORT}`);
        console.log(`[Server] Environment : ${process.env.NODE_ENV || 'development'}`);
        console.log(`[Server] CORS origin  : ${getAllowedOrigins().join(', ')}`);
        console.log(`[Server] Health check : http://localhost:${PORT}/api/health`);
    });
};

startServer();
