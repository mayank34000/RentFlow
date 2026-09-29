'use strict';

const mongoose = require('mongoose');
const Booking = require('../models/Booking');

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
 * Shared availability helper to check if a listing has overlapping bookings.
 *
 * Logic: An existing booking overlaps if its start date is before the new end date
 * AND its end date is after the new start date.
 * Ignored statuses: Cancelled, Rejected.
 */
const checkBookingOverlap = async (listingId, newStartDate, newEndDate) => {
    const overlappingBookings = await Booking.find({
        listing: listingId,
        status: { $nin: ['Cancelled', 'Rejected'] },
        startDate: { $lt: newEndDate },
        endDate: { $gt: newStartDate }
    }).select('_id startDate endDate status');

    return overlappingBookings;
};


// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/bookings
 * Create a new booking.
 */
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
        const listing = await Listing.findById(listingId);
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
        if (String(req.user._id) === String(listing.seller)) {
            return res.status(400).json({
                success: false,
                message: 'You cannot book your own listing.'
            });
        }

        // Validation: Availability (Overlap check)
        const overlappingBookings = await checkBookingOverlap(listingId, parsedStart, parsedEnd);
        if (overlappingBookings.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'LISTING_UNAVAILABLE',
                message: 'The listing is unavailable for the selected dates due to a conflicting booking.'
            });
        }

        // Server-side Financial Calculations
        const pricePerDay = listing.price || 0; // ensure fallback to 0 if undefined
        const calculatedTotalDays = Math.max(1, Math.ceil(durationMs / (24 * 60 * 60 * 1000)));
        const calculatedSubtotal = pricePerDay * calculatedTotalDays;
        const calculatedSecurityDeposit = Math.round(calculatedSubtotal * 0.10);
        const calculatedTotal = calculatedSubtotal + calculatedSecurityDeposit;

        // Build Booking instance
        const newBooking = new Booking({
            listing: listing._id,
            renter: req.user._id,
            lender: listing.seller,
            startDate: parsedStart,
            endDate: parsedEnd,
            pricePerDay: pricePerDay,
            totalDays: calculatedTotalDays,
            subtotal: calculatedSubtotal,
            securityDeposit: calculatedSecurityDeposit,
            platformFee: 0,
            total: calculatedTotal
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
            message: err.message || 'Internal server error while creating booking'
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
            // Found conflicts
            return res.status(200).json({
                success: true,
                data: {
                    available: false,
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
            message: err.message || 'Internal server error while checking availability'
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
        const bookings = await Booking.find({ renter: req.user._id })
            .sort({ createdAt: -1 })
            .populate('listing')
            .populate('renter', '-passwordHash')
            .populate('lender', '-passwordHash');

        return res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

/**
 * GET /api/bookings/lender
 * Get bookings for the authenticated lender
 */
exports.getLenderBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({ lender: req.user._id })
            .sort({ createdAt: -1 })
            .populate('listing')
            .populate('renter', '-passwordHash')
            .populate('lender', '-passwordHash');

        return res.status(200).json({
            success: true,
            data: bookings
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
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

        const booking = await Booking.findById(bookingId)
            .populate('listing')
            .populate('renter', '-passwordHash')
            .populate('lender', '-passwordHash');

        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Authorization: only renter or lender can view
        if (String(booking.renter._id || booking.renter) !== String(req.user._id) &&
            String(booking.lender._id || booking.lender) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Not authorized to view this booking.' });
        }

        return res.status(200).json({
            success: true,
            data: booking
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

// ── Status Operations ─────────────────────────────────────────────────────────

/**
 * DELETE /api/bookings/:id
 * Cancel a booking. Allowed from Pending or Approved. Only renter.
 */
exports.cancelBooking = async (req, res) => {
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
            return res.status(403).json({ success: false, message: 'Only the renter can cancel this booking.' });
        }

        if (!['Pending', 'Approved'].includes(booking.status)) {
            return res.status(409).json({ success: false, message: 'Booking cannot be cancelled in its current status.' });
        }

        booking.status = 'Cancelled';
        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Booking cancelled successfully',
            data: booking
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/approve
 * Approve a booking. Allowed from Pending. Only lender.
 */
exports.approveBooking = async (req, res) => {
    try {
        const bookingId = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid booking ID.' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (String(booking.lender) !== String(req.user._id)) {
            return res.status(403).json({ success: false, message: 'Only the lender can approve this booking.' });
        }

        if (booking.status !== 'Pending') {
            return res.status(409).json({ success: false, message: 'Only Pending bookings can be approved.' });
        }

        booking.status = 'Approved';
        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Booking approved successfully',
            data: booking
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/pay
 * Pay and activate a booking. Allowed from Approved. Only renter.
 */
exports.payBooking = async (req, res) => {
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
            return res.status(403).json({ success: false, message: 'Only the renter can pay for this booking.' });
        }

        if (booking.status !== 'Approved') {
            return res.status(409).json({ success: false, message: 'Only Approved bookings can be paid.' });
        }

        booking.status = 'Active';
        booking.paidAt = new Date();
        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Booking activated successfully',
            data: booking
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

/**
 * PATCH /api/bookings/:id/return
 * Return a booking. Allowed from Active. Only renter.
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

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            cleanupUpload();
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (String(booking.renter) !== String(req.user._id)) {
            cleanupUpload();
            return res.status(403).json({ success: false, message: 'Only the renter can return this booking.' });
        }

        if (booking.status !== 'Active') {
            cleanupUpload();
            return res.status(409).json({ success: false, message: 'Only Active bookings can be returned.' });
        }

        booking.status = 'Returned';
        booking.returnedAt = new Date();

        if (req.body.returnNote && typeof req.body.returnNote === 'string') {
            booking.returnNote = req.body.returnNote.substring(0, 500); // reasonable maximum length
        }

        if (req.file) {
            // Save relative representation of the uploaded file
            booking.returnPhoto = `uploads/returns/${req.file.filename}`;
        }

        await booking.save();

        return res.status(200).json({
            success: true,
            message: 'Booking returned successfully',
            data: booking
        });
    } catch (err) {
        cleanupUpload();
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};
