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
