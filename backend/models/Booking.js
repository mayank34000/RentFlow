'use strict';

/**
 * RentFlow — Booking Mongoose Model
 *
 * Represents a single rental transaction between a renter and a lender
 * for a specific listing over a date range.
 *
 * SCOPE NOTES (what this file intentionally does NOT contain):
 *  - No date business validation (endDate > startDate, min/max duration, past-date
 *    checks). Those rules live in the booking controller (Task 3).
 *  - No availability / overlap checking. The controller queries bookings whose
 *    status is NOT 'Cancelled' or 'Rejected' before creating a new one.
 *  - No lifecycle auto-transitions (e.g. Active → Completed). The controller
 *    handles status changes on read or explicit action.
 *  - No User.js or Listing.js are required here; the refs 'User' and 'Listing'
 *    are string identifiers that Mongoose resolves at query time when those
 *    models are registered (by whoever owns them on the team).
 */

const mongoose = require('mongoose');

// ── Schema ────────────────────────────────────────────────────────────────────

const bookingSchema = new mongoose.Schema(
    {
        // ── References ───────────────────────────────────────────────────────
        listing: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Listing',
            required: true,
        },

        renter: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        lender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },

        // ── Rental Window ─────────────────────────────────────────────────────
        startDate: {
            type: Date,
            required: true,
        },

        endDate: {
            type: Date,
            required: true,
        },

        // ── Financials ────────────────────────────────────────────────────────
        // Snapshotted at booking creation so receipts remain accurate even
        // if the listing price changes later.
        pricePerDay: {
            type: Number,
            required: true,
        },

        totalDays: {
            type: Number,
            required: true,
        },

        subtotal: {
            type: Number,
            required: true,
        },

        securityDeposit: {
            type: Number,
            required: true,
        },

        platformFee: {
            type: Number,
            default: 0,
        },

        total: {
            type: Number,
            required: true,
        },

        // ── Status Machine ────────────────────────────────────────────────────
        // Allowed transitions (enforced by the controller, not here):
        //   Pending  → Approved  (lender approves)
        //   Pending  → Rejected  (lender rejects)
        //   Pending  → Cancelled (renter or admin cancels)
        //   Approved → Active    (renter pays; Razorpay signature verified)
        //   Approved → Cancelled (renter or admin cancels)
        //   Active   → Completed (end date passed; checked on read or cron)
        //   Completed→ Returned  (lender confirms physical return)
        // Terminal states: Rejected, Returned, Cancelled
        status: {
            type: String,
            enum: [
                'Pending',
                'Approved',
                'Active',
                'Completed',
                'Returned',
                'Cancelled',
                'Rejected',
            ],
            default: 'Pending',
        },

        // ── Return Condition (Phase 2 — Multer upload) ────────────────────────
        returnPhoto: {
            type: String,
            default: null,
        },

        returnNote: {
            type: String,
            default: '',
        },

        returnedAt: {
            type: Date,
            default: null,
        },

        // ── Payment Tracking ──────────────────────────────────────────────────
        // Populated after Razorpay signature is verified server-side in Task 3.
        razorpayOrderId: {
            type: String,
            default: null,
        },

        razorpayPaymentId: {
            type: String,
            default: null,
        },

        paidAt: {
            type: Date,
            default: null,
        },
    },
    {
        // Automatically adds createdAt and updatedAt fields.
        timestamps: true,
    }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Fast lookup: "show me all bookings made by this renter, newest first"
bookingSchema.index({ renter: 1, createdAt: -1 });

// Fast lookup: "show me all bookings on my listings, filtered by status"
bookingSchema.index({ lender: 1, status: 1 });

// Fast availability check: "is this listing already booked for these dates?"
bookingSchema.index({ listing: 1, startDate: 1, endDate: 1 });

// ── Export ────────────────────────────────────────────────────────────────────

module.exports = mongoose.model('Booking', bookingSchema);
