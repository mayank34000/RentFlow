'use strict';

const mongoose = require('mongoose');

/**
 * TopupOrder Model
 * Tracks Razorpay payment order attempts for wallet top-ups.
 * In-syllabus: Mongoose schema, validation, ObjectId reference, unique index.
 */
const topupOrderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'User reference is required'],
            index: true,
        },
        razorpayOrderId: {
            type: String,
            required: [true, 'Razorpay order ID is required'],
            unique: true,
            index: true,
        },
        amountPaise: {
            type: Number,
            required: [true, 'Amount in paise is required'],
            min: [100, 'Minimum payment order amount is 100 paise (₹1)'],
            max: [10000000, 'Maximum payment order amount is ₹1,00,000 (10,000,000 paise)'],
        },
        purpose: {
            type: String,
            enum: ['WALLET_TOPUP', 'BOOKING', 'PREMIUM'],
            default: 'WALLET_TOPUP',
            index: true,
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            default: null,
            index: true,
        },
        currency: {
            type: String,
            default: 'INR',
            enum: ['INR'],
        },
        status: {
            type: String,
            default: 'CREATED',
            enum: ['CREATED', 'PAID', 'FAILED'],
            index: true,
        },
        razorpayPaymentId: {
            type: String,
            default: null,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('TopupOrder', topupOrderSchema);
