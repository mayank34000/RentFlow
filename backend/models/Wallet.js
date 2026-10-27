'use strict';

const mongoose = require('mongoose');

/**
 * Wallet Model
 * Represents a user's closed-loop platform balance in integer paise.
 * In-syllabus: Mongoose schema, validation, ObjectId reference.
 */
const walletSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            unique: true,
            index: true,
        },
        // Available balance in integer paise (>= 0)
        balancePaise: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Wallet balance cannot be negative'],
        },
        // Locked in escrow for pending/active rentals in integer paise (>= 0)
        lockedPaise: {
            type: Number,
            required: true,
            default: 0,
            min: [0, 'Locked escrow cannot be negative'],
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR'],
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('Wallet', walletSchema);
