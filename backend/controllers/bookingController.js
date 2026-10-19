'use strict';

const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');
const TopupOrder = require('../models/TopupOrder');
const { getOrCreateWallet, getRazorpayClient } = require('./walletController');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const { sendMail } = require('../utils/sendMail');
const { buildReceipt } = require('../utils/receiptEmail');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Helper to safely retrieve the Listing model, which may not be registered yet.
 */
const getListingModel = () => {
    try {
        return mongoose.model('Listing');
    } catch (err) {
        return null;
    }
};

/**
 * Formats a Date object into human-readable string: e.g. "Oct 15, 2026 at 2:00 PM"
 */
function formatHumanDateTime(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

/**
 * Returns the maximum endDate among conflicting bookings
 */
function getLatestConflictEndDate(overlappingBookings) {
    let latest = null;
    for (const b of overlappingBookings) {
        if (b.endDate) {
            const end = new Date(b.endDate);
            if (!latest || end > latest) {
                latest = end;
            }
        }
    }
    return latest;
}

/**
 * Shared availability helper to check if a listing has overlapping bookings.
 *
 * Logic: An existing booking overlaps if its start date is before the new end date
 * AND its end date is after the new start date.
 * Ignored statuses: Cancelled, Rejected, Expired.
 */
const checkBookingOverlap = async (listingId, newStartDate, newEndDate) => {
    const overlappingBookings = await Booking.find({
        listing: listingId,
        status: { $nin: ['Cancelled', 'Rejected', 'Expired'] },
        startDate: { $lt: newEndDate },
        endDate: { $gt: newStartDate }
    }).select('_id startDate endDate status');

    return overlappingBookings;
};

/**
 * Helper to safely check if a user is Pro
 */
const getIsPro = async (userId) => {
    try {
        const UserModel = mongoose.model('User');
        const user = await UserModel.findById(userId).select('isPro');
        return !!(user && user.isPro);
    } catch (_e) {
        return false;
    }
};

/**
 * Protects phone privacy based on viewer pro status and rental relationship
 */
const scrubBookingPhones = (bookingDoc, currentUserId, isViewerPro) => {
    const b = bookingDoc.toObject ? bookingDoc.toObject() : { ...bookingDoc };
    const isRenter = String(b.renter?._id || b.renter) === String(currentUserId);
    const isLender = String(b.lender?._id || b.lender) === String(currentUserId);

    if (!isViewerPro && !isRenter && !isLender) {
        if (b.renter && b.renter.phone) delete b.renter.phone;
        if (b.lender && b.lender.phone) delete b.lender.phone;
    }
    return b;
};

/**
 * Settles held booking escrow funds:
 * - Releases security deposit (depositPaise) back to renter's available balance (DEPOSIT_RELEASE).
 * - Credits rental earnings (rentalPaise - commissionPaise) to lender's available balance (RENTAL_EARNING).
 * - Clears locked escrow on renter.
 * - Transitions booking fundsState to 'SETTLED'.
 */
async function settleBookingFunds(bookingDoc) {
    if (!bookingDoc || bookingDoc.fundsState !== 'HELD') return bookingDoc;

    const renterId = bookingDoc.renter._id || bookingDoc.renter;
    const lenderId = bookingDoc.lender._id || bookingDoc.lender;

    const rentalPaise = bookingDoc.rentalPaise || 0;
    const depositPaise = bookingDoc.depositPaise || 0;
    const commissionPaise = bookingDoc.commissionPaise || 0;
    const lenderNetEarning = bookingDoc.subtotal ? Math.round(bookingDoc.subtotal * 100) : Math.max(0, rentalPaise - commissionPaise);

    const renterWallet = await getOrCreateWallet(renterId);
    const lenderWallet = await getOrCreateWallet(lenderId);

    // 1. Refund Security Deposit to Renter's available wallet balance
    if (depositPaise > 0) {
        const depositReleaseKey = `DEPOSIT_RELEASE:${bookingDoc._id}`;
        try {
            const freshRenter = await Wallet.findById(renterWallet._id);
            await WalletLedger.create({
                wallet: renterWallet._id,
                user: renterId,
                type: 'DEPOSIT_RELEASE',
                balanceDeltaPaise: depositPaise,
                lockedDeltaPaise: -depositPaise,
                balanceAfterPaise: freshRenter.balancePaise + depositPaise,
                lockedAfterPaise: Math.max(0, freshRenter.lockedPaise - depositPaise),
                booking: bookingDoc._id,
                idempotencyKey: depositReleaseKey,
                note: `Security deposit refund for booking ${bookingDoc._id}`
            });
            await Wallet.findByIdAndUpdate(renterWallet._id, {
                $inc: { balancePaise: depositPaise, lockedPaise: -depositPaise }
            });
        } catch (err) {
            if (err.code !== 11000) console.error('[Settlement] Deposit release error:', err.message);
        }
    }

    // 2. Clear remaining locked rental fee from Renter's escrow
    if (rentalPaise > 0) {
        const rentalSettleKey = `RENTAL_SETTLE:${bookingDoc._id}`;
        try {
            const freshRenter = await Wallet.findById(renterWallet._id);
            await WalletLedger.create({
                wallet: renterWallet._id,
                user: renterId,
                type: 'RENTAL_SETTLE',
                balanceDeltaPaise: 0,
                lockedDeltaPaise: -rentalPaise,
                balanceAfterPaise: freshRenter.balancePaise,
                lockedAfterPaise: Math.max(0, freshRenter.lockedPaise - rentalPaise),
                booking: bookingDoc._id,
                idempotencyKey: rentalSettleKey,
                note: `Rental escrow release for booking ${bookingDoc._id}`
            });
            await Wallet.findByIdAndUpdate(renterWallet._id, {
                $inc: { lockedPaise: -rentalPaise }
            });
        } catch (err) {
            if (err.code !== 11000) console.error('[Settlement] Rental settle error:', err.message);
        }
    }

    // 3. Credit rental earnings to Lender's wallet
    if (lenderNetEarning > 0) {
        const rentalEarningKey = `RENTAL_EARNING:${bookingDoc._id}`;
        try {
            const freshLender = await Wallet.findById(lenderWallet._id);
            await WalletLedger.create({
                wallet: lenderWallet._id,
                user: lenderId,
                type: 'RENTAL_EARNING',
                balanceDeltaPaise: lenderNetEarning,
                lockedDeltaPaise: 0,
                balanceAfterPaise: freshLender.balancePaise + lenderNetEarning,
                lockedAfterPaise: freshLender.lockedPaise,
                booking: bookingDoc._id,
                idempotencyKey: rentalEarningKey,
                note: `Rental earnings for booking ${bookingDoc._id}`
            });
            await Wallet.findByIdAndUpdate(lenderWallet._id, {
                $inc: { balancePaise: lenderNetEarning }
            });
        } catch (err) {
            if (err.code !== 11000) console.error('[Settlement] Rental earning credit error:', err.message);
        }
    }

    // 4. Record platform commission fee
    if (commissionPaise > 0) {
        const commissionKey = `COMMISSION_FEE:${bookingDoc._id}`;
        try {
            const freshLender = await Wallet.findById(lenderWallet._id);
            await WalletLedger.create({
                wallet: lenderWallet._id,
                user: lenderId,
                type: 'COMMISSION_FEE',
                balanceDeltaPaise: 0,
                lockedDeltaPaise: 0,
                balanceAfterPaise: freshLender.balancePaise,
                lockedAfterPaise: freshLender.lockedPaise,
                booking: bookingDoc._id,
                idempotencyKey: commissionKey,
                note: `Platform fee on booking ${bookingDoc._id}`
            });
        } catch (err) {
            if (err.code !== 11000) console.error('[Settlement] Commission fee error:', err.message);
        }
    }

    // 5. Update booking fundsState to 'SETTLED'
    const updated = await Booking.findByIdAndUpdate(
        bookingDoc._id,
        { fundsState: 'SETTLED' },
        { new: true }
    );
    return updated || bookingDoc;
}

/**
 * Performs lazy state machine evaluation on one or more bookings:
 * 1. Pending -> Expired if (now - createdAt >= 48h) OR (now >= startDate)
 * 2. Approved -> Active if (now >= startDate) AND paymentStatus === 'PAID'
 * 3. Active -> Completed when now >= endDate (settles funds & refunds security deposit!)
 * 4. Returned -> Completed if (now - returnedAt >= 72h) OR (now >= endDate)
 */
async function applyLifecycleTransitions(bookingDocs) {
    if (!bookingDocs || bookingDocs.length === 0) return;
    const now = new Date();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const seventyTwoHoursMs = 72 * 60 * 60 * 1000;

    for (const doc of bookingDocs) {
        // 1. Pending auto-expires after 48h or at startDate
        if (doc.status === 'Pending') {
            const createdMs = doc.createdAt ? new Date(doc.createdAt).getTime() : 0;
            const isExpiredByTime = createdMs && (now.getTime() - createdMs >= fortyEightHoursMs);
            const isExpiredByStart = doc.startDate && (now >= new Date(doc.startDate));

            if (isExpiredByTime || isExpiredByStart) {
                const claimed = await Booking.findOneAndUpdate(
                    { _id: doc._id, status: 'Pending' },
                    { status: 'Expired' },
                    { new: true }
                );
                if (claimed) {
                    doc.status = 'Expired';
                }
            }
        }

        // 2. Approved auto-transitions:
        // - If unpaid and deadline (paymentDueAt or startDate) passed -> Expired (never Active!)
        // - If paid and now >= startDate -> Active
        else if (doc.status === 'Approved') {
            const isPastDue = doc.paymentDueAt && now >= new Date(doc.paymentDueAt);
            const isPastStart = doc.startDate && now >= new Date(doc.startDate);

            if (doc.paymentStatus !== 'PAID') {
                if (isPastDue || isPastStart) {
                    const claimed = await Booking.findOneAndUpdate(
                        { _id: doc._id, status: 'Approved', paymentStatus: { $ne: 'PAID' } },
                        { status: 'Expired' },
                        { new: true }
                    );
                    if (claimed) {
                        doc.status = 'Expired';
                    }
                }
            } else {
                if (isPastStart) {
                    const claimed = await Booking.findOneAndUpdate(
                        { _id: doc._id, status: 'Approved', paymentStatus: 'PAID' },
                        { status: 'Active' },
                        { new: true }
                    );
                    if (claimed) {
                        doc.status = 'Active';
                    }
                }
            }
        }

        // 3. Active auto-completes when now >= endDate and settles funds (refunds deposit to renter wallet!)
        else if (doc.status === 'Active') {
            if (doc.endDate && now >= new Date(doc.endDate)) {
                const claimed = await Booking.findOneAndUpdate(
                    { _id: doc._id, status: 'Active' },
                    { status: 'Completed', completedAt: now },
                    { new: true }
                );
                if (claimed) {
                    doc.status = 'Completed';
                    doc.completedAt = claimed.completedAt;
                    await settleBookingFunds(claimed);
                }
            }
        }

        // 4. Returned auto-completes 72h after return (or when now >= endDate) if not disputed
        else if (doc.status === 'Returned') {
            const returnedMs = doc.returnedAt ? new Date(doc.returnedAt).getTime() : 0;
            const isInspectionPassed = returnedMs && (now.getTime() - returnedMs >= seventyTwoHoursMs);
            const isEnded = doc.endDate && (now >= new Date(doc.endDate));

            if (isInspectionPassed || isEnded) {
                const claimed = await Booking.findOneAndUpdate(
                    { _id: doc._id, status: 'Returned' },
                    { status: 'Completed', completedAt: new Date() },
                    { new: true }
                );
                if (claimed) {
                    doc.status = 'Completed';
                    doc.completedAt = claimed.completedAt;
                    await settleBookingFunds(claimed);
                }
            }
        }
    }
}

/**
 * Periodic hygiene check running every 15 minutes via standard setInterval (in-syllabus).
 */
async function runLifecycleHygiene() {
    try {
        if (mongoose.connection.readyState !== 1) return;
        const candidates = await Booking.find({
            status: { $in: ['Pending', 'Approved', 'Active', 'Returned'] }
        });
        await applyLifecycleTransitions(candidates);
    } catch (err) {
        console.error('[Lifecycle Hygiene] Sweep error:', err.message);
    }
}

// 15-minute background timer (in-syllabus standard Node.js setInterval)
const HYGIENE_INTERVAL_MS = 15 * 60 * 1000;
const hygieneTimer = setInterval(runLifecycleHygiene, HYGIENE_INTERVAL_MS);
if (hygieneTimer.unref) hygieneTimer.unref();

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Create a new booking.
 */
// Pure function to calculate legacy pricing rules
function calculatePricing(listing, startDate, endDate) {
    const diffMs = endDate.getTime() - startDate.getTime();
    const totalHours = diffMs / (1000 * 60 * 60);
    const fullDays = Math.floor(totalHours / 24);
    const remainingHours = totalHours % 24;

    let chargedDays = 0;
    if (fullDays === 0) {
        chargedDays = remainingHours < 12 ? 0.5 : 1.0;
    } else {
        if (remainingHours === 0) {
            chargedDays = fullDays;
        } else if (remainingHours < 12) {
            chargedDays = fullDays + 0.5;
        } else {
            chargedDays = fullDays + 1.0;
        }
    }

    const pricePerDay = parseFloat(listing.price) || 0;
    const securityDeposit = parseFloat(listing.securityDeposit) || 0;
    const subtotal = chargedDays * pricePerDay;
    const platformFee = Math.round(subtotal * 0.02);
    const total = subtotal + platformFee + securityDeposit;

    return {
        totalDays: chargedDays,
        pricePerDay,
        subtotal,
        platformFee,
        securityDeposit,
        total
    };
}

exports.createBooking = async (req, res) => {
    try {
        const { listingId, startDate, endDate } = req.body;

        // Validation: listingId
        if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid listingId is required.'
            });
        }

        // Fetch Listing model safely
        const Listing = getListingModel();
        if (!Listing) {
            return res.status(503).json({
                success: false,
                message: 'Listing model not available yet'
            });
        }

        // Validation: Listing existence & status
        let listing = await Listing.findById(listingId);
        if (!listing) {
            // Check if listingId corresponds to a catalog product hex ID or title
            const catalogPath = path.resolve(__dirname, '../data/products.json');
            if (fs.existsSync(catalogPath)) {
                try {
                    const raw = fs.readFileSync(catalogPath, 'utf8');
                    const catalogData = JSON.parse(raw);
                    const match = catalogData.find((item, idx) => {
                        const num = parseInt(String(item.id).replace(/\D/g, ''), 10) || (idx + 1);
                        const hex = '00000000000000000000' + num.toString(16).padStart(4, '0');
                        return hex === String(listingId) || String(item.id) === String(listingId);
                    });
                    if (match) {
                        const safeTitle = (match.title || '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        listing = await Listing.findOne({
                            status: 'Active',
                            title: { $regex: new RegExp(`^${safeTitle}$`, 'i') }
                        });
                    }
                } catch (_e) {}
            }
        }
        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found.'
            });
        }
        if (listing.status !== 'Active') {
            return res.status(400).json({
                success: false,
                message: 'This listing is not currently active and cannot be booked.'
            });
        }

        // Validation: Dates
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Both startDate and endDate are required.'
            });
        }

        const parsedStart = new Date(startDate);
        const parsedEnd = new Date(endDate);

        if (isNaN(parsedStart.valueOf()) || isNaN(parsedEnd.valueOf())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid dates provided.'
            });
        }

        const now = new Date();
        const minStartDate = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

        if (parsedStart < minStartDate) {
            return res.status(400).json({
                success: false,
                message: 'Start date must be at least 1 hour from the current time.'
            });
        }

        if (parsedEnd <= parsedStart) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date.'
            });
        }

        // Validation: Duration (1 hour to 90 days)
        const durationMs = parsedEnd.getTime() - parsedStart.getTime();
        const oneHourMs = 60 * 60 * 1000;
        const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;

        if (durationMs < oneHourMs || durationMs > ninetyDaysMs) {
            return res.status(400).json({
                success: false,
                message: 'Booking duration must be between 1 hour and 90 days.'
            });
        }

        // Validation: Self-booking check
        if (String(req.user._id) === String(listing.owner)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot book your own listing.'
            });
        }

        // Validation: Availability (Overlap check)
        const overlappingBookings = await checkBookingOverlap(listingId, parsedStart, parsedEnd);
        if (overlappingBookings.length > 0) {
            const availableFrom = getLatestConflictEndDate(overlappingBookings);
            const formattedDate = formatHumanDateTime(availableFrom);
            return res.status(409).json({
                success: false,
                error: 'LISTING_UNAVAILABLE',
                available: false,
                availableFrom: availableFrom ? availableFrom.toISOString() : null,
                message: availableFrom
                    ? `This item is currently booked. It will be available to rent starting from: ${formattedDate}.`
                    : 'The listing is unavailable for the selected dates due to a conflicting booking.'
            });
        }

        // Server-side Financial Calculations using legacy rules
        const pricing = calculatePricing(listing, parsedStart, parsedEnd);

        // Build Booking instance
        const newBooking = new Booking({
            listing: listing._id,
            renter: req.user._id,
            lender: listing.owner,
            startDate: parsedStart,
            endDate: parsedEnd,
            pricePerDay: pricing.pricePerDay,
            totalDays: pricing.totalDays,
            subtotal: pricing.subtotal,
            securityDeposit: pricing.securityDeposit,
            platformFee: pricing.platformFee,
            total: pricing.total
            // status will use Mongoose default ('Pending')
        });

        const savedBooking = await newBooking.save();

        res.status(201).json({
            success: true,
            data: savedBooking
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

/**
 * GET /api/bookings/availability
 * Public endpoint to check if a listing is available for given dates.
 */
exports.checkAvailability = async (req, res) => {
    try {
        const { listingId, startDate, endDate } = req.query;

        // Input validation
        if (!listingId || !mongoose.Types.ObjectId.isValid(listingId)) {
            return res.status(400).json({
                success: false,
                message: 'A valid listingId is required.'
            });
        }

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'Both startDate and endDate are required.'
            });
        }

        const parsedStart = new Date(startDate);
        const parsedEnd = new Date(endDate);

        if (isNaN(parsedStart.valueOf()) || isNaN(parsedEnd.valueOf())) {
            return res.status(400).json({
                success: false,
                message: 'Invalid dates provided.'
            });
        }

        if (parsedEnd <= parsedStart) {
            return res.status(400).json({
                success: false,
                message: 'End date must be after start date.'
            });
        }

        // Fetch Listing model safely
        const Listing = getListingModel();
        if (!Listing) {
            return res.status(503).json({
                success: false,
                message: 'Listing model not available yet'
            });
        }

        // Verify listing exists
        const listing = await Listing.findById(listingId);
        if (!listing) {
            return res.status(404).json({
                success: false,
                message: 'Listing not found.'
            });
        }

        // Run overlap logic
        const overlappingBookings = await checkBookingOverlap(listingId, parsedStart, parsedEnd);

        if (overlappingBookings.length > 0) {
            const availableFrom = getLatestConflictEndDate(overlappingBookings);
            const formattedDate = formatHumanDateTime(availableFrom);
            return res.status(200).json({
                success: true,
                data: {
                    available: false,
                    availableFrom: availableFrom ? availableFrom.toISOString() : null,
                    message: availableFrom
                        ? `This item is currently booked. It will be available to rent starting from: ${formattedDate}.`
                        : 'The listing is unavailable for the selected dates due to a conflicting booking.',
                    conflictingDates: overlappingBookings.map(b => ({
                        startDate: b.startDate,
                        endDate: b.endDate
                    }))
                }
            });
        }

        // No conflicts
        res.status(200).json({
            success: true,
            data: {
                available: true,
                conflictingDates: []
            }
        });

    } catch (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};

// ── Read / CRUD Operations ────────────────────────────────────────────────────

/**
 * GET /api/bookings/my
 * Get bookings for the authenticated renter
 */
exports.getMyBookings = async (req, res) => {
    try {
        const isPro = await getIsPro(req.user._id);
        const bookingsDocs = await Booking.find({ renter: req.user._id })
            .sort({ createdAt: -1 })
            .populate('listing')
            .populate('renter', 'name email avatar profileImage phone role')
            .populate('lender', 'name email avatar profileImage phone role');

        // Apply lazy lifecycle state machine transitions (Pending->Expired, Approved->Active, Active->Overdue, Returned->Completed)
        await applyLifecycleTransitions(bookingsDocs);

        const bookings = bookingsDocs.map(doc => scrubBookingPhones(doc, req.user._id, isPro));

        return res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * GET /api/bookings/lender
 * Get bookings for the authenticated lender
 */
exports.getLenderBookings = async (req, res) => {
    try {
        const isPro = await getIsPro(req.user._id);
        const bookingsDocs = await Booking.find({ lender: req.user._id })
            .sort({ createdAt: -1 })
            .populate('listing')
            .populate('renter', 'name email avatar profileImage phone role')
            .populate('lender', 'name email avatar profileImage phone role');

        // Apply lazy lifecycle state machine transitions
        await applyLifecycleTransitions(bookingsDocs);

        const bookings = bookingsDocs.map(doc => scrubBookingPhones(doc, req.user._id, isPro));

        return res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * GET /api/bookings/:id
 * Get single booking by ID
 */
exports.getBookingById = async (req, res) => {
    try {
        const bookingId = req.params.id;

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const bookingDoc = await Booking.findById(bookingId)
            .populate('listing')
            .populate('renter', 'name email avatar profileImage phone role')
            .populate('lender', 'name email avatar profileImage phone role');

        if (!bookingDoc) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Authorization: only renter or lender can view
        if (String(bookingDoc.renter._id || bookingDoc.renter) !== String(req.user._id) &&
            String(bookingDoc.lender._id || bookingDoc.lender) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this booking.' });
        }

        // Apply lazy lifecycle state machine transitions
        await applyLifecycleTransitions([bookingDoc]);
        
        const isPro = await getIsPro(req.user._id);
        const booking = scrubBookingPhones(bookingDoc, req.user._id, isPro);

        return res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

// ── Status Operations ─────────────────────────────────────────────────────────

/**
 * DELETE /api/bookings/:id and PATCH /api/bookings/:id/cancel
 * Cancel a booking. Allowed from Pending or Approved (before startDate). Only booker can cancel.
 */
exports.cancelBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const now = new Date();
        // Conditional atomic update: booker only, Pending OR (Approved before startDate)
        const updated = await Booking.findOneAndUpdate(
            {
                _id: bookingId,
                renter: req.user._id,
                $or: [
                    { status: 'Pending' },
                    { status: 'Approved', startDate: { $gt: now } }
                ]
            },
            { status: 'Cancelled' },
            { new: true }
        );

        if (!updated) {
            const existing = await Booking.findById(bookingId);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            if (String(existing.renter) !== String(req.user._id)) {
                return res.status(403).json({ success: false, message: 'Only the booker can cancel this booking.' });
            }
            if (!['Pending', 'Approved'].includes(existing.status)) {
                return res.status(409).json({ success: false, message: 'Booking cannot be cancelled in its current status.' });
            }
            if (existing.status === 'Approved' && now >= new Date(existing.startDate)) {
                return res.status(409).json({ success: false, message: 'Approved booking cannot be cancelled after the rental start time.' });
            }
            return res.status(409).json({ success: false, message: 'Booking state has already changed.' });
        }

        // TODO: Stage 6 - Wallet ledger integration (Refund RENTAL_RELEASE + DEPOSIT_RELEASE to tenant wallet if fundsState === 'HELD')

        return res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/approve
 * Approve a booking. Allowed from Pending. Only listing owner can approve.
 */
exports.approveBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const platformFeePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 0;
        if (platformFeePercent > 0 && !process.env.PLATFORM_WALLET_USER_ID) {
            return res.status(503).json({
                success: false,
                message: 'Platform wallet is not configured for commission collection.'
            });
        }

        const existing = await Booking.findById(bookingId);
        if (!existing) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        if (String(existing.lender) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the listing owner can approve this booking.' });
        }
        if (existing.status !== 'Pending') {
            return res.status(409).json({ success: false, message: 'Only Pending bookings can be approved.' });
        }

        const now = new Date();
        const subtotalPaise = Math.round((existing.subtotal || 0) * 100);
        const feeRupees = existing.platformFee !== undefined ? existing.platformFee : Math.round((existing.subtotal || 0) * 0.02);
        const commissionPaise = Math.round(feeRupees * 100);
        const rentalPaise = subtotalPaise + commissionPaise;
        const depositPaise = Math.round((existing.securityDeposit || 0) * 100);

        // Payment due window: 24h from now or startDate, whichever is sooner
        const twentyFourHours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const paymentDueAt = existing.startDate < twentyFourHours ? existing.startDate : twentyFourHours;

        // Section D: Atomic conditional update to claim Approved status
        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, lender: req.user._id, status: 'Pending' },
            {
                status: 'Approved',
                paymentStatus: 'AWAITING_PAYMENT',
                paymentDueAt,
                rentalPaise,
                depositPaise,
                commissionPaise
            },
            { new: true }
        );

        if (!updated) {
            return res.status(409).json({ success: false, message: 'Booking state has already changed.' });
        }

        // Section D: Safer post-claim overlap verification
        // Check if another Approved or Active booking overlaps on the same listing
        const conflictingApprovedOrActive = await Booking.findOne({
            listing: updated.listing,
            _id: { $ne: updated._id },
            status: { $in: ['Approved', 'Active'] },
            startDate: { $lt: updated.endDate },
            endDate: { $gt: updated.startDate }
        });

        if (conflictingApprovedOrActive) {
            // Revert back to Pending immediately to resolve race condition
            await Booking.findOneAndUpdate(
                { _id: updated._id, status: 'Approved' },
                {
                    status: 'Pending',
                    paymentStatus: 'UNPAID',
                    paymentDueAt: null
                }
            );
            return res.status(409).json({
                success: false,
                message: 'Cannot approve: this listing already has an approved or active booking for conflicting dates.'
            });
        }

        // Auto-reject any overlapping Pending requests on the same listing
        const overlappingPending = await Booking.find({
            listing: updated.listing,
            _id: { $ne: updated._id },
            status: 'Pending',
            startDate: { $lt: updated.endDate },
            endDate: { $gt: updated.startDate }
        });

        for (const pendingBooking of overlappingPending) {
            const rejected = await Booking.findOneAndUpdate(
                { _id: pendingBooking._id, status: 'Pending' },
                { status: 'Rejected' },
                { new: true }
            );
            // (Stage 6: if rejected and fundsState === 'HELD', release held funds)
        }

        return res.status(200).json({
            success: true,
            message: 'Booking approved successfully',
            data: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/reject
 * Reject a booking. Allowed from Pending. Only listing owner can reject.
 */
exports.rejectBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, lender: req.user._id, status: 'Pending' },
            { status: 'Rejected' },
            { new: true }
        );

        if (!updated) {
            const existing = await Booking.findById(bookingId);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            if (String(existing.lender) !== String(req.user._id)) {
                return res.status(403).json({ success: false, message: 'Only the listing owner can reject this booking.' });
            }
            return res.status(409).json({ success: false, message: 'Only Pending bookings can be rejected.' });
        }

        // TODO: Stage 6 - Wallet ledger integration (Refund RENTAL_RELEASE + DEPOSIT_RELEASE if fundsState === 'HELD')

        return res.status(200).json({
            success: true,
            message: 'Booking rejected successfully',
            data: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/pay
 * LOCKED / DISABLED (Per Decision 1A - All bookings paid exclusively via wallet)
 */
exports.payBooking = async (req, res) => {
    return res.status(403).json({
        success: false,
        code: 'ROUTE_DISABLED',
        message: 'Direct booking payment route is disabled. Booking payments will be handled exclusively via wallet balance.'
    });
};

/**
 * PATCH /api/bookings/:id/return
 * Return a booking. Allowed from Active or Overdue. Only booker can mark returned.
 */
exports.returnBooking = async (req, res) => {
    const fs = require('fs');

    const cleanupUpload = () => {
        if (req.file && req.file.path) {
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupErr) {
                // Ignore errors during cleanup
            }
        }
    };

    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            cleanupUpload();
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const updateData = {
            status: 'Returned',
            returnedAt: new Date()
        };
        if (req.body.returnNote && typeof req.body.returnNote === 'string') {
            updateData.returnNote = req.body.returnNote.substring(0, 500);
        }
        if (req.file) {
            updateData.returnPhoto = `uploads/returns/${req.file.filename}`;
        }

        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, renter: req.user._id, status: { $in: ['Active', 'Overdue'] } },
            updateData,
            { new: true }
        );

        if (!updated) {
            cleanupUpload();
            const existing = await Booking.findById(bookingId);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            if (String(existing.renter) !== String(req.user._id)) {
                return res.status(403).json({ success: false, message: 'Only the booker can mark this booking as returned.' });
            }
            return res.status(409).json({ success: false, message: 'Only Active or Overdue bookings can be marked as returned.' });
        }

        return res.status(200).json({
            success: true,
            message: 'Booking marked as returned successfully. Pending inspection.',
            data: updated
        });
    } catch (err) {
        cleanupUpload();
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/confirm-return
 * Confirm return and complete booking. Allowed from Returned. Only listing owner can confirm.
 */
exports.confirmReturn = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, lender: req.user._id, status: { $in: ['Returned', 'Active'] } },
            { status: 'Completed', completedAt: new Date() },
            { new: true }
        );

        if (!updated) {
            const existing = await Booking.findById(bookingId);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            if (String(existing.lender) !== String(req.user._id)) {
                return res.status(403).json({ success: false, message: 'Only the listing owner can confirm return.' });
            }
            return res.status(409).json({ success: false, message: 'Only Active or Returned bookings can be confirmed.' });
        }

        // Release security deposit to tenant, credit rental earnings to lender minus commission
        await settleBookingFunds(updated);

        return res.status(200).json({
            success: true,
            message: 'Return confirmed and booking completed successfully. Security deposit refunded to renter wallet.',
            data: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * POST /api/bookings/:id/dispute
 * Flag item damage / raise dispute. Allowed from Returned or Overdue. Only listing owner can dispute.
 */
exports.disputeBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const { reason } = req.body;
        if (!reason || typeof reason !== 'string' || !reason.trim()) {
            return res.status(400).json({ success: false, message: 'A dispute reason is required.' });
        }

        // Section D & G: Allowed from Returned OR Overdue
        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, lender: req.user._id, status: { $in: ['Returned', 'Overdue'] } },
            {
                status: 'Disputed',
                disputeReason: reason.trim().substring(0, 1000),
                disputedAt: new Date()
            },
            { new: true }
        );

        if (!updated) {
            const existing = await Booking.findById(bookingId);
            if (!existing) {
                return res.status(404).json({ success: false, message: 'Booking not found.' });
            }
            if (String(existing.lender) !== String(req.user._id)) {
                return res.status(403).json({ success: false, message: 'Only the listing owner can dispute this booking.' });
            }
            return res.status(409).json({ success: false, message: 'Only Returned or Overdue bookings can be disputed.' });
        }

        // Escrow funds stay frozen pending admin resolution.

        return res.status(200).json({
            success: true,
            message: 'Dispute recorded. Escrow funds will remain held pending admin resolution.',
            data: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

/**
 * GET /api/bookings/:id/payment-quote
 * Booker gets payment quote for approved booking: rental, deposit, total, wallet balance, shortfall.
 */
exports.getPaymentQuote = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await Booking.findById(bookingId).populate('listing');
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Booker only
        if (String(booking.renter) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the booker can view the payment quote.' });
        }

        await applyLifecycleTransitions([booking]);

        if (booking.status !== 'Approved') {
            return res.status(400).json({
                success: false,
                message: `Booking is in ${booking.status} status and cannot be paid.`,
                status: booking.status
            });
        }

        if (booking.paymentStatus === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'This booking has already been paid.',
                paymentStatus: 'PAID'
            });
        }

        const subtotalPaise = Math.round((booking.subtotal || 0) * 100);
        const platformFeePaise = Math.round((booking.platformFee !== undefined ? booking.platformFee : (booking.subtotal || 0) * 0.02) * 100);
        const depositPaise = booking.depositPaise || Math.round((booking.securityDeposit || 0) * 100);
        const totalPaise = subtotalPaise + platformFeePaise + depositPaise;

        const wallet = await getOrCreateWallet(req.user._id);
        const walletBalancePaise = wallet.balancePaise;
        const shortfallPaise = Math.max(0, totalPaise - walletBalancePaise);
        const canPayWithWallet = walletBalancePaise >= totalPaise;

        return res.status(200).json({
            success: true,
            data: {
                bookingId: booking._id,
                itemTitle: booking.listing?.title || 'Rental Item',
                rentalPaise: subtotalPaise,
                platformFeePaise,
                depositPaise,
                totalPaise,
                totalAmountPaise: totalPaise,
                rentalDays: booking.totalDays,
                totalRupees: (totalPaise / 100).toFixed(2),
                walletBalancePaise,
                shortfallPaise,
                canPayWithWallet,
                paymentDueAt: booking.paymentDueAt,
                paymentStatus: booking.paymentStatus,
                startDate: booking.startDate,
                endDate: booking.endDate
            }
        });
    } catch (err) {
        console.error('[Booking] getPaymentQuote error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch payment quote.' });
    }
};

/**
 * POST /api/bookings/:id/pay-wallet
 * Pay full rental fee + security deposit using available wallet balance.
 */
exports.payBookingWithWallet = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (String(booking.renter) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the booker can pay for this booking.' });
        }

        await applyLifecycleTransitions([booking]);

        if (booking.status !== 'Approved') {
            return res.status(400).json({
                success: false,
                message: `Booking is in ${booking.status} status and cannot be paid.`
            });
        }

        if (booking.paymentStatus === 'PAID') {
            return res.status(200).json({
                success: true,
                message: 'Booking has already been paid.',
                data: booking
            });
        }

        const now = new Date();
        if (booking.paymentDueAt && now >= new Date(booking.paymentDueAt)) {
            await Booking.findByIdAndUpdate(booking._id, { status: 'Expired' });
            return res.status(400).json({
                success: false,
                message: 'The payment window for this booking has expired.'
            });
        }

        const rentalPaise = booking.rentalPaise || Math.round((booking.subtotal || 0) * 100);
        const depositPaise = booking.depositPaise || Math.round((booking.securityDeposit || 0) * 100);
        const totalPaise = rentalPaise + depositPaise;

        const wallet = await getOrCreateWallet(req.user._id);
        if (wallet.balancePaise < totalPaise) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance to cover the full booking amount.',
                walletBalancePaise: wallet.balancePaise,
                totalPaise
            });
        }

        // Section D: Insert-first idempotency for ledger rows
        const rentalKey = `RENTAL_HOLD:${booking._id}`;
        const depositKey = `DEPOSIT_HOLD:${booking._id}`;

        let rentalLedger;
        try {
            rentalLedger = await WalletLedger.create({
                wallet: wallet._id,
                user: req.user._id,
                type: 'RENTAL_HOLD',
                balanceDeltaPaise: -rentalPaise,
                lockedDeltaPaise: rentalPaise,
                balanceAfterPaise: wallet.balancePaise - rentalPaise,
                lockedAfterPaise: wallet.lockedPaise + rentalPaise,
                booking: booking._id,
                idempotencyKey: rentalKey,
                note: `Rental hold for booking ${booking._id}`
            });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(200).json({ success: true, message: 'Payment already processed.' });
            }
            throw err;
        }

        let depositLedger;
        if (depositPaise > 0) {
            try {
                depositLedger = await WalletLedger.create({
                    wallet: wallet._id,
                    user: req.user._id,
                    type: 'DEPOSIT_HOLD',
                    balanceDeltaPaise: -depositPaise,
                    lockedDeltaPaise: depositPaise,
                    balanceAfterPaise: wallet.balancePaise - totalPaise,
                    lockedAfterPaise: wallet.lockedPaise + totalPaise,
                    booking: booking._id,
                    idempotencyKey: depositKey,
                    note: `Security deposit hold for booking ${booking._id}`
                });
            } catch (err) {
                if (err.code === 11000) {
                    // Already processed
                } else {
                    await WalletLedger.findByIdAndDelete(rentalLedger._id);
                    throw err;
                }
            }
        }

        // Conditional balance deduction on wallet
        const updatedWallet = await Wallet.findOneAndUpdate(
            { _id: wallet._id, balancePaise: { $gte: totalPaise } },
            { $inc: { balancePaise: -totalPaise, lockedPaise: totalPaise } },
            { new: true }
        );

        if (!updatedWallet) {
            if (rentalLedger) await WalletLedger.findByIdAndDelete(rentalLedger._id);
            if (depositLedger) await WalletLedger.findByIdAndDelete(depositLedger._id);
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance.'
            });
        }

        const nowPaid = new Date();
        const durationDays = booking.totalDays || 1;
        const activeStartDate = new Date(nowPaid);
        const calculatedEndDate = new Date(activeStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const activeEndDate = (booking.endDate && new Date(booking.endDate) > nowPaid)
            ? new Date(booking.endDate)
            : calculatedEndDate;

        // Update booking state to Active, PAID, and HELD so rental countdown timer starts immediately
        const updatedBooking = await Booking.findByIdAndUpdate(
            booking._id,
            {
                status: 'Active',
                paymentStatus: 'PAID',
                fundsState: 'HELD',
                startDate: activeStartDate,
                endDate: activeEndDate,
                paidAt: nowPaid
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Payment completed successfully from wallet! Your rental is confirmed.',
            data: updatedBooking
        });
    } catch (err) {
        console.error('[Booking] payBookingWithWallet error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to process wallet payment for booking.' });
    }
};

/**
 * POST /api/bookings/:id/pay-razorpay/order
 * Create Razorpay order for booking shortfall (or full amount).
 */
exports.createBookingPaymentOrder = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (String(booking.renter) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the booker can pay for this booking.' });
        }

        await applyLifecycleTransitions([booking]);

        if (booking.status !== 'Approved') {
            return res.status(400).json({
                success: false,
                message: `Booking is in ${booking.status} status and cannot be paid.`
            });
        }

        if (booking.paymentStatus === 'PAID') {
            return res.status(400).json({
                success: false,
                message: 'This booking has already been paid.'
            });
        }

        const now = new Date();
        if (booking.paymentDueAt && now >= new Date(booking.paymentDueAt)) {
            await Booking.findByIdAndUpdate(booking._id, { status: 'Expired' });
            return res.status(400).json({
                success: false,
                message: 'The payment window for this booking has expired.'
            });
        }

        const rentalPaise = booking.rentalPaise || Math.round((booking.subtotal || 0) * 100);
        const depositPaise = booking.depositPaise || Math.round((booking.securityDeposit || 0) * 100);
        const totalPaise = rentalPaise + depositPaise;

        const useWallet = !!req.body.useWallet;
        const wallet = await getOrCreateWallet(req.user._id);

        let shortfallPaise = totalPaise;
        if (useWallet) {
            shortfallPaise = Math.max(0, totalPaise - wallet.balancePaise);
            if (shortfallPaise === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your wallet balance covers the full amount. Please use Pay from Wallet.'
                });
            }
        }

        const orderAmountPaise = Math.max(shortfallPaise, 100);

        const projectedTotal = wallet.balancePaise + wallet.lockedPaise + orderAmountPaise;
        if (projectedTotal > 10000000) {
            return res.status(400).json({
                success: false,
                message: 'Payment would exceed maximum wallet limit of ₹1,00,000.'
            });
        }

        const razorpay = getRazorpayClient();
        const receipt = `bk_${Date.now()}`.substring(0, 40);

        const order = await razorpay.orders.create({
            amount: orderAmountPaise,
            currency: 'INR',
            receipt
        });

        await TopupOrder.create({
            user: req.user._id,
            razorpayOrderId: order.id,
            amountPaise: orderAmountPaise,
            currency: 'INR',
            purpose: 'BOOKING',
            booking: booking._id,
            status: 'CREATED'
        });

        return res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
                shortfallPaise,
                useWallet,
                bookingId: booking._id
            }
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Booking] createBookingPaymentOrder error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
    }
};

/**
 * POST /api/bookings/:id/pay-razorpay/verify
 * Verifies Razorpay payment, credits shortfall to wallet, and locks funds for booking in one step.
 */
exports.verifyBookingPayment = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (String(booking.renter) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the booker can verify payment for this booking.' });
        }

        if (booking.paymentStatus === 'PAID') {
            return res.status(200).json({
                success: true,
                message: 'Payment already verified.',
                data: booking
            });
        }

        const topupOrder = await TopupOrder.findOne({
            razorpayOrderId: razorpay_order_id,
            user: req.user._id,
            purpose: 'BOOKING',
            booking: booking._id
        });

        if (!topupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Payment order not found for this booking.'
            });
        }

        const razorpay = getRazorpayClient();

        const isValidSignature = validatePaymentVerification(
            { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
            razorpay_signature,
            process.env.RAZORPAY_KEY_SECRET
        );

        if (!isValidSignature) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
        }

        const paymentDetails = await razorpay.payments.fetch(razorpay_payment_id);
        if (!paymentDetails || paymentDetails.status !== 'captured' || paymentDetails.currency !== 'INR') {
            return res.status(400).json({
                success: false,
                message: 'Payment was not captured successfully by the gateway.'
            });
        }

        const rentalPaise = booking.rentalPaise || Math.round((booking.subtotal || 0) * 100);
        const depositPaise = booking.depositPaise || Math.round((booking.securityDeposit || 0) * 100);
        const totalPaise = rentalPaise + depositPaise;

        const wallet = await getOrCreateWallet(req.user._id);
        const shortfallPaise = topupOrder.amountPaise;

        // 1. Credit shortfall to wallet via TOPUP ledger
        const topupKey = `TOPUP:${razorpay_order_id}`;
        try {
            await WalletLedger.create({
                wallet: wallet._id,
                user: req.user._id,
                type: 'TOPUP',
                balanceDeltaPaise: shortfallPaise,
                lockedDeltaPaise: 0,
                balanceAfterPaise: wallet.balancePaise + shortfallPaise,
                lockedAfterPaise: wallet.lockedPaise,
                booking: booking._id,
                idempotencyKey: topupKey,
                razorpayPaymentId: razorpay_payment_id,
                note: `Topup for booking payment ${booking._id}`
            });
            await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balancePaise: shortfallPaise } });
        } catch (err) {
            if (err.code !== 11000) throw err;
        }

        const freshWallet = await Wallet.findById(wallet._id);

        // 2. Lock rental and deposit into escrow
        const rentalKey = `RENTAL_HOLD:${booking._id}`;
        const depositKey = `DEPOSIT_HOLD:${booking._id}`;

        try {
            await WalletLedger.create({
                wallet: wallet._id,
                user: req.user._id,
                type: 'RENTAL_HOLD',
                balanceDeltaPaise: -rentalPaise,
                lockedDeltaPaise: rentalPaise,
                balanceAfterPaise: freshWallet.balancePaise - rentalPaise,
                lockedAfterPaise: freshWallet.lockedPaise + rentalPaise,
                booking: booking._id,
                idempotencyKey: rentalKey,
                note: `Rental hold for booking ${booking._id}`
            });
        } catch (err) {
            if (err.code !== 11000) throw err;
        }

        if (depositPaise > 0) {
            try {
                await WalletLedger.create({
                    wallet: wallet._id,
                    user: req.user._id,
                    type: 'DEPOSIT_HOLD',
                    balanceDeltaPaise: -depositPaise,
                    lockedDeltaPaise: depositPaise,
                    balanceAfterPaise: freshWallet.balancePaise - totalPaise,
                    lockedAfterPaise: freshWallet.lockedPaise + totalPaise,
                    booking: booking._id,
                    idempotencyKey: depositKey,
                    note: `Security deposit hold for booking ${booking._id}`
                });
            } catch (err) {
                if (err.code !== 11000) throw err;
            }
        }

        await Wallet.findByIdAndUpdate(wallet._id, {
            $inc: { balancePaise: -totalPaise, lockedPaise: totalPaise }
        });

        topupOrder.status = 'PAID';
        topupOrder.razorpayPaymentId = razorpay_payment_id;
        await topupOrder.save();

        const nowPaid = new Date();
        const durationDays = booking.totalDays || 1;
        const activeStartDate = new Date(nowPaid);
        const calculatedEndDate = new Date(activeStartDate.getTime() + durationDays * 24 * 60 * 60 * 1000);
        const activeEndDate = (booking.endDate && new Date(booking.endDate) > nowPaid)
            ? new Date(booking.endDate)
            : calculatedEndDate;

        // Update booking state to Active, PAID, and HELD so rental countdown timer starts immediately
        const updatedBooking = await Booking.findByIdAndUpdate(
            booking._id,
            {
                status: 'Active',
                paymentStatus: 'PAID',
                fundsState: 'HELD',
                startDate: activeStartDate,
                endDate: activeEndDate,
                razorpayOrderId: razorpay_order_id,
                razorpayPaymentId: razorpay_payment_id,
                paidAt: nowPaid
            },
            { new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Payment verified and rental confirmed!',
            data: updatedBooking
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Booking] verifyBookingPayment error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to verify booking payment.' });
    }
};
