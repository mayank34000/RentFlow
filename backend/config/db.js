/**
 * RentFlow — MongoDB Connection Helper
 * Reads MONGO_URI from environment and establishes a Mongoose connection.
 *
 * Design decisions:
 *  - Never calls process.exit() — the server stays up even without a DB.
 *  - Warns clearly when MONGO_URI is missing.
 *  - Never logs the URI itself (it may contain credentials).
 *  - Uses a 5 s serverSelectionTimeoutMS so connection failures resolve quickly.
 */

const mongoose = require('mongoose');

const connectDB = async () => {
    // Re-use active connection in serverless runtime across warm invocations
    if (mongoose.connection.readyState === 1) {
        return;
    }

    const uri = process.env.MONGO_URI || process.env.MONGODB_URI;

    if (!uri) {
        console.warn('[DB] Neither MONGO_URI nor MONGODB_URI is set. Skipping database connection.');
        console.warn('[DB] The server will run, but all database operations will fail.');
        return;
    }

    try {
        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log('[DB] MongoDB connected successfully.');
    } catch (err) {
        console.warn('[DB] MongoDB connection failed:', err.message);
        console.warn('[DB] The server will continue running without a database connection.');
        // Do NOT call process.exit() — let the server remain up.
    }
};

module.exports = connectDB;
