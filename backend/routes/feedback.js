const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const admin = require('../middleware/admin');
const Feedback = require('../models/Feedback');

const router = express.Router();

// Helper: returns true when the given string is not a valid MongoDB ObjectId.
function isInvalidId(id) {
  return !mongoose.Types.ObjectId.isValid(id);
}

// ─── POST /api/feedback ───────────────────────────────────────
// Authenticated users can create feedback.
// Always associates the feedback with the logged-in user (req.user.id).
router.post('/', auth, async (req, res, next) => {
  try {
    const { rating, comment } = req.body;

    if (rating === undefined || rating === null) {
      return res.status(400).json({ success: false, message: 'Rating is required.' });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5.' });
    }

    const feedback = await Feedback.create({
      user: req.user.id, // Enforce ownership from verified JWT
      rating: numericRating,
      comment: comment || '',
    });

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully.',
      feedback,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/feedback ────────────────────────────────────────
// Admins can fetch the feedback list used by the admin console.
// We optionally populate the basic user info (no sensitive data).
router.get('/', auth, admin, async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: feedbacks.length,
      feedbacks,
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/feedback/:id ────────────────────────────────────
// Fetch a single feedback by ID.
router.get('/:id', auth, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID format.' });
    }

    const feedback = await Feedback.findById(req.params.id).populate('user', 'name avatar');
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    res.json({ success: true, feedback });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /api/feedback/:id ──────────────────────────────────
// Users can update their own feedback. Admins can update any feedback.
// Does NOT allow changing the feedback owner.
router.patch('/:id', auth, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID format.' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    // Authorization check: Must be owner or an admin
    if (feedback.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to update this feedback.' });
    }

    const { rating, comment } = req.body;

    // Validate if provided
    if (rating !== undefined && rating !== null) {
      const numericRating = Number(rating);
      if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'Rating must be a number between 1 and 5.' });
      }
      feedback.rating = numericRating;
    }

    if (comment !== undefined) {
      feedback.comment = comment;
    }

    await feedback.save(); // runValidators is triggered on save

    res.json({
      success: true,
      message: 'Feedback updated successfully.',
      feedback,
    });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/feedback/:id ─────────────────────────────────
// Users can delete their own feedback. Admins can delete any feedback.
router.delete('/:id', auth, async (req, res, next) => {
  try {
    if (isInvalidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid feedback ID format.' });
    }

    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({ success: false, message: 'Feedback not found.' });
    }

    // Authorization check: Must be owner or an admin
    if (feedback.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You are not authorized to delete this feedback.' });
    }

    await Feedback.deleteOne({ _id: feedback._id });

    res.json({
      success: true,
      message: 'Feedback deleted successfully.',
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
