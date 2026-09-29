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
 *
 * Do NOT add business logic here.
 * Future routes go in routes/ and are mounted with app.use().
 */

// ── 1. Environment variables ──────────────────────────────────────────────────
require('dotenv').config();

// ── 2. Core dependencies ──────────────────────────────────────────────────────
const express   = require('express');
const cors      = require('cors');
const mongoose  = require('mongoose');
const connectDB = require('./config/db');

// ── 3. App setup ──────────────────────────────────────────────────────────────
const app = express();

// CORS — allow the configured origin (Live Server default if not set)
const corsOrigin = process.env.CORS_ORIGIN || 'http://127.0.0.1:5500';
app.use(cors({ origin: corsOrigin, credentials: true }));

// Parse incoming JSON request bodies
app.use(express.json());

// ── 4. API Routes ─────────────────────────────────────────────────────────────
// Future routes are mounted here, for example:
//   const bookingRoutes = require('./routes/bookings');
//   app.use('/api/bookings', bookingRoutes);
//
// Add new route mounts below this comment block as needed.

// ── 5a. Health check ──────────────────────────────────────────────────────────
// Indicates the DB state without exposing connection details.
// readyState: 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
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
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || err.status || 500;

    const response = {
        success: false,
        message: err.message || 'Internal server error',
    };

    // Only expose stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
});

// ── 6. Start server ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

const startServer = async () => {
    // Attempt DB connection first (non-fatal — server starts regardless)
    await connectDB();

    app.listen(PORT, () => {
        console.log(`[Server] RentFlow API running on http://localhost:${PORT}`);
        console.log(`[Server] Environment : ${process.env.NODE_ENV || 'development'}`);
        console.log(`[Server] CORS origin  : ${corsOrigin}`);
        console.log(`[Server] Health check : http://localhost:${PORT}/api/health`);
    });
};

startServer();
