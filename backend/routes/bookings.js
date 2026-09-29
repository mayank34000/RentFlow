'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const devAuth = require('../middleware/devAuth');

// ── Public Routes ─────────────────────────────────────────────────────────────

// Important: Specific routes like /availability must be registered before generic /:id routes
// to prevent /availability from being interpreted as an :id parameter.
router.get('/availability', bookingController.checkAvailability);


// ── Protected Routes (Require Authentication) ─────────────────────────────────

// POST /api/bookings
router.post('/', devAuth, bookingController.createBooking);


module.exports = router;
