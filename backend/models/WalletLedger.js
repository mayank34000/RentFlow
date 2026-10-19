'use strict';

const mongoose = require('mongoose');

/**
 * WalletLedger Model
 * Append-only financial ledger tracking balance and locked deltas.
 * In-syllabus: Mongoose schema, validation, ObjectId references, compound and unique indexes.
 */
const walletLedgerSchema = new mongoose.Schema(
    {
        wallet: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Wallet',
            required: [true, 'Wallet reference is required'],
            index: true,
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            index: true,
        },
        type: {
            type: String,
            required: [true, 'Ledger transaction type is required'],
            enum: [
                'TOPUP',
                'RENTAL_HOLD',
                'DEPOSIT_HOLD',
                'RENTAL_RELEASE',
                'DEPOSIT_RELEASE',
                'RENTAL_SETTLE',
                'RENTAL_EARNING',
                'DEPOSIT_DEDUCTION',
                'DAMAGE_COMPENSATION',
                'COMMISSION_FEE',
                'PREMIUM_PAYMENT',
            ],
        },
        // Signed integer paise delta applied to available balance
        balanceDeltaPaise: {
            type: Number,
            required: true,
            default: 0,
        },
        // Signed integer paise delta applied to locked escrow
        lockedDeltaPaise: {
            type: Number,
            required: true,
            default: 0,
        },
        // Snapshot of available balance after applying delta
        balanceAfterPaise: {
            type: Number,
            required: true,
            min: [0, 'Balance after transaction cannot be negative'],
        },
        // Snapshot of locked escrow after applying delta
        lockedAfterPaise: {
            type: Number,
            required: true,
            min: [0, 'Locked after transaction cannot be negative'],
        },
        // Optional booking reference for rental holds and settlements
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            default: null,
            index: true,
        },
        // Unique deterministic key to prevent duplicate financial processing
        idempotencyKey: {
            type: String,
            required: [true, 'Idempotency key is required'],
            unique: true,
            index: true,
        },
        razorpayPaymentId: {
            type: String,
            default: null,
        },
        note: {
            type: String,
            default: '',
            trim: true,
        },
    },
    {
        timestamps: true,
    }
);

// Helpful index for timeline retrieval
walletLedgerSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletLedger', walletLedgerSchema);
