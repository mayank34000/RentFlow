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
    const uri = process.env.MONGO_URI;

    if (!uri) {
        console.warn('[DB] MONGO_URI is not set. Skipping database connection.');
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
