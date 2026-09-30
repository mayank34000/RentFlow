const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const User = require('../models/User');

const router = express.Router();

// Fields that an admin is allowed to update on a user record.
// passwordHash is intentionally excluded — it has its own flow.
const ALLOWED_UPDATE_FIELDS = ['name', 'email', 'role', 'isPro', 'kycStatus', 'avatar'];

// Valid enum values — mirrors the User schema so we can give clear errors
// before Mongoose even touches the database.
const VALID_ROLES = ['customer', 'seller', 'admin'];
const VALID_KYC_STATUSES = ['none', 'pending', 'approved', 'rejected'];

// Helper: returns true when the given string is not a valid MongoDB ObjectId.
function isInvalidId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
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

module.exports = router;

