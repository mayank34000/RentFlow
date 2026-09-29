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

// Specific GET routes before generic /:id
router.get('/my', devAuth, bookingController.getMyBookings);
router.get('/lender', devAuth, bookingController.getLenderBookings);

// POST /api/bookings
router.post('/', devAuth, bookingController.createBooking);

// GET /api/bookings/:id
router.get('/:id', devAuth, bookingController.getBookingById);

// DELETE /api/bookings/:id (Cancel)
router.delete('/:id', devAuth, bookingController.cancelBooking);

// PATCH /api/bookings/:id/approve
router.patch('/:id/approve', devAuth, bookingController.approveBooking);

// PATCH /api/bookings/:id/pay
router.patch('/:id/pay', devAuth, bookingController.payBooking);

// PATCH /api/bookings/:id/return
router.patch('/:id/return', devAuth, bookingController.returnBooking);

module.exports = router;
