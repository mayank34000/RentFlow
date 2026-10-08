const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');
const Feedback = require('../models/Feedback');
const Booking = require('../models/Booking');

const router = express.Router();

// Fields that an admin is allowed to update on a user record.
// passwordHash is intentionally excluded — it has its own flow.
const ALLOWED_UPDATE_FIELDS = ['name', 'email', 'role', 'isPro', 'kycStatus', 'avatar'];

// Valid enum values — mirrors the User schema so we can give clear errors
// before Mongoose even touches the database.
const VALID_ROLES = ['user', 'admin'];
const VALID_KYC_STATUSES = ['none', 'pending', 'approved', 'rejected'];

// Helper: returns true when the given string is not a valid MongoDB ObjectId.
function isInvalidId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
}

// ─── Lazy Listing model helper ────────────────────────────────
// The Listing model is owned by Madhav and may not be registered at server
// startup (e.g. during Phase 2 development). This helper attempts to retrieve
// the already-registered model from Mongoose's internal registry at the moment
// a request arrives. If the model is not registered yet, it returns null and
// the calling route responds with 503. This mirrors the identical pattern used
// in bookingController.js (getListingModel).
//
// IMPORTANT: Do NOT convert this to a top-level require('../models/Listing').
// That would throw "Cannot find module" at startup if Listing.js does not exist.
function getListingModel() {
  try {
    return mongoose.model('Listing');
  } catch (_) {
    return null;
  }
}

// ─── Verification route (kept from Stage 1) ──────────────────
// GET /api/admin/test
router.get('/test', auth, admin, (req, res) => {
  res.json({
    success: true,
    message: 'Admin access confirmed.',
    user: { id: req.user.id, role: req.user.role },
  });
});

// ─── GET /api/admin/users ─────────────────────────────────────
// Returns all users. passwordHash is never included.
router.get('/users', auth, admin, async (req, res, next) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/users/:id ─────────────────────────────────
// Returns one user by ID. passwordHash is never included.
router.get('/users/:id', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/users/:id ──────────────────────────────
// Updates allowed fields on a user. Strips any field not in ALLOWED_UPDATE_FIELDS.
router.patch('/users/:id', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    // Build an update object containing only the allowed fields that were sent.
    const updates = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: `No valid fields to update. Allowed fields: ${ALLOWED_UPDATE_FIELDS.join(', ')}.`,
      });
    }

    // Validate enum values before hitting the database.
    if (updates.role && !VALID_ROLES.includes(updates.role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.`,
      });
    }

    if (updates.kycStatus && !VALID_KYC_STATUSES.includes(updates.kycStatus)) {
      return res.status(400).json({
        success: false,
        message: `Invalid kycStatus. Must be one of: ${VALID_KYC_STATUSES.join(', ')}.`,
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-passwordHash');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'User updated successfully.', user });
  } catch (err) {
    // MongoDB duplicate key error (e.g. email already taken)
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'A user with that email already exists.' });
    }
    next(err);
  }
});

// ─── DELETE /api/admin/users/:id ─────────────────────────────
// Deletes a user. Prevents an admin from deleting their own account.
router.delete('/users/:id', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid user ID format.' });
    }

    // Prevent self-deletion — req.user.id comes from the verified JWT.
    if (req.user.id === req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own admin account.',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({
      success: true,
      message: 'User deleted successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════
// ADMIN LISTING ROUTES
// Owner: Mayank
//
// These routes provide moderation-level access to listings.
// They depend on the 'Listing' Mongoose model, which is owned by Madhav.
// getListingModel() is used instead of a top-level require() so that this
// file loads safely even when Listing.js does not exist yet.
//
// Status field assumption: The status field is a string set by Madhav's
// Listing model/CRUD. No enum is enforced here — we pass the value through
// to Mongoose, which will enforce its own schema validation if defined.
// A non-empty string check is the only pre-flight guard applied at this layer.
// ════════════════════════════════════════════════════════════════

// ─── GET /api/admin/listings ──────────────────────────────────
// Returns all listings in the system sorted by newest first.
// Requires: admin JWT.
router.get('/listings', auth, admin, async (req, res, next) => {
  try {
    const Listing = getListingModel();
    if (!Listing) {
      return res.status(503).json({
        success: false,
        message: 'Listing service is not available yet. Madhav\'s Listing model has not been registered.',
      });
    }

    const listings = await Listing.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      count: listings.length,
      listings,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/listings/:id ─────────────────────────────
// Returns a single listing by its MongoDB ObjectId.
// Requires: admin JWT.
router.get('/listings/:id', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID format.' });
    }

    const Listing = getListingModel();
    if (!Listing) {
      return res.status(503).json({
        success: false,
        message: 'Listing service is not available yet. Madhav\'s Listing model has not been registered.',
      });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    res.json({ success: true, listing });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/admin/listings/:id/status ────────────────────
// Allows an admin to update only the status field of a listing.
// This is the admin's moderation power (e.g. block/unblock a listing).
//
// Body: { "status": "<value>" }
//
// The status value is intentionally NOT validated against a hardcoded enum
// here because Madhav's Listing schema defines the canonical allowed values.
// Mongoose's own runValidators will reject values that violate that schema.
// The only pre-flight check is that status is a non-empty string.
//
// Requires: admin JWT.
router.patch('/listings/:id/status', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID format.' });
    }

    const { status } = req.body;

    // Pre-flight: status must be provided and must be a non-empty string.
    if (status === undefined || status === null || String(status).trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'status is required and must be a non-empty string.',
      });
    }

    const Listing = getListingModel();
    if (!Listing) {
      return res.status(503).json({
        success: false,
        message: 'Listing service is not available yet. Madhav\'s Listing model has not been registered.',
      });
    }

    // runValidators: true — Mongoose will enforce Madhav's enum if he defined one.
    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { $set: { status: String(status).trim() } },
      { new: true, runValidators: true }
    );

    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    res.json({
      success: true,
      message: 'Listing status updated successfully.',
      listing,
    });
  } catch (err) {
    // Mongoose validation error (e.g. status value not in Madhav's enum)
    if (err.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
    next(err);
  }
});

// ─── DELETE /api/admin/listings/:id ──────────────────────────
// Permanently deletes a listing by ID.
// Admin use case: remove fraudulent, illegal, or violating listings.
// Requires: admin JWT.
router.delete('/listings/:id', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid listing ID format.' });
    }

    const Listing = getListingModel();
    if (!Listing) {
      return res.status(503).json({
        success: false,
        message: 'Listing service is not available yet. Madhav\'s Listing model has not been registered.',
      });
    }

    const listing = await Listing.findByIdAndDelete(req.params.id);
    if (!listing) {
      return res.status(404).json({ success: false, message: 'Listing not found.' });
    }

    res.json({
      success: true,
      message: 'Listing deleted successfully.',
      listing,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/admin/analytics/overview ───────────────────────
// Returns platform analytics (user and feedback statistics).
router.get('/analytics/overview', auth, admin, async (req, res, next) => {
  try {
    const [
      totalUsers,
      roleDistribution,
      kycDistribution,
      proUsers,
      nonProUsers,
      registrationTrend,
      totalFeedback,
      ratingStats,
      ratingDistribution,
      feedbackTrend
    ] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.aggregate([{ $group: { _id: '$kycStatus', count: { $sum: 1 } } }]),
      User.countDocuments({ isPro: true }),
      User.countDocuments({ isPro: false }),
      User.aggregate([
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ]),
      Feedback.countDocuments(),
      Feedback.aggregate([
        { $group: { _id: null, averageRating: { $avg: '$rating' } } }
      ]),
      Feedback.aggregate([
        { $group: { _id: '$rating', count: { $sum: 1 } } },
        { $sort: { _id: -1 } }
      ]),
      Feedback.aggregate([
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } }
      ])
    ]);

    let averageRating = 0;
    if (ratingStats.length > 0 && ratingStats[0].averageRating) {
      averageRating = Math.round(ratingStats[0].averageRating * 100) / 100;
    }

    res.json({
      success: true,
      data: {
        userStats: {
          totalUsers,
          roleDistribution,
          kycDistribution,
          proUsers,
          nonProUsers,
          registrationTrend
        },
        feedbackStats: {
          totalFeedback,
          averageRating,
          ratingDistribution,
          feedbackTrend
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════════════════════
// ADMIN BOOKING ROUTES
// Owner: Mayank
//
// These routes provide administrative oversight of all bookings.
// They are distinct from Aryan's normal booking routes in two ways:
//   1. They use JWT auth (auth + admin middleware), not devAuth.
//   2. GET /:id here bypasses the renter/lender ownership check that
//      Aryan's bookingController enforces for regular users.
//
// The force-cancel endpoint is authorised by the Booking model's own
// inline documentation (Booking.js lines ~94–98), which explicitly
// lists "admin" as an allowed actor for Pending → Cancelled and
// Approved → Cancelled transitions.
//
// Status enum values are taken verbatim from backend/models/Booking.js:
//   'Pending', 'Approved', 'Active', 'Completed', 'Returned',
//   'Cancelled', 'Rejected'
// ════════════════════════════════════════════════════════════════

// ─── GET /api/admin/bookings ──────────────────────────────────
// Returns all bookings on the platform, newest first.
// Populates listing, renter, and lender references.
// passwordHash is excluded from user population.
// Requires: admin JWT.
router.get('/bookings', auth, admin, async (req, res, next) => {
  try {
    const bookings = await Booking.find()
      .sort({ createdAt: -1 })
      .populate('listing')
      .populate('renter', '-passwordHash')
      .populate('lender', '-passwordHash');

    res.json({
      success: true,
      count: bookings.length,
      bookings,
    });
  } catch (err) {
    // Graceful handling if Listing model is not yet registered (Madhav's work).
    if (err.name === 'MissingSchemaError') {
      // Fall back: return raw bookings without population.
      try {
        const rawBookings = await Booking.find().sort({ createdAt: -1 });
        return res.json({
          success: true,
          count: rawBookings.length,
          bookings: rawBookings,
          warning: 'Listing population skipped — Listing model not registered yet.',
        });
      } catch (fallbackErr) {
        return next(fallbackErr);
      }
    }
    next(err);
  }
});

// ─── GET /api/admin/bookings/:id ─────────────────────────────
// Returns a single booking by ID with full population.
// Does NOT apply the renter/lender ownership check — admin sees all.
// Requires: admin JWT.
router.get('/bookings/:id', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    const booking = await Booking.findById(req.params.id)
      .populate('listing')
      .populate('renter', '-passwordHash')
      .populate('lender', '-passwordHash');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    if (err.name === 'MissingSchemaError') {
      // Fall back to raw booking if population fails.
      try {
        const raw = await Booking.findById(req.params.id);
        if (!raw) {
          return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        return res.json({
          success: true,
          booking: raw,
          warning: 'Listing population skipped — Listing model not registered yet.',
        });
      } catch (fallbackErr) {
        return next(fallbackErr);
      }
    }
    next(err);
  }
});

// ─── PATCH /api/admin/bookings/:id/cancel ────────────────────
// Allows an admin to force-cancel a booking in Pending or Approved status.
//
// Grounding: Aryan's Booking model (Booking.js) explicitly documents:
//   "Pending  → Cancelled (renter or admin cancels)"
//   "Approved → Cancelled (renter or admin cancels)"
// This endpoint implements the admin side of those documented transitions.
//
// Scoped to /cancel (not DELETE /:id) to avoid colliding with Aryan's
// cancel route which is DELETE /api/bookings/:id and is renter-only.
//
// Terminal bookings (Returned, Cancelled, Rejected) cannot be cancelled.
// Requires: admin JWT.
router.patch('/bookings/:id/cancel', auth, admin, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid booking ID format.' });
    }

    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    // Only bookings in Pending or Approved state can be cancelled.
    // All other states are either already terminal or represent an
    // active financial transaction that admin should not unilaterally reverse.
    if (!['Pending', 'Approved'].includes(booking.status)) {
      return res.status(409).json({
        success: false,
        message: `Booking cannot be cancelled in its current status ('${booking.status}'). Only Pending or Approved bookings may be cancelled.`,
      });
    }

    booking.status = 'Cancelled';
    await booking.save();

    res.json({
      success: true,
      message: 'Booking cancelled by admin.',
      booking,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
