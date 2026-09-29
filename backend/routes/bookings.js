'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const devAuth = require('../middleware/devAuth');
const upload = require('../middleware/upload');

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
router.patch('/:id/return', devAuth, (req, res, next) => {
    upload.single('returnPhoto')(req, res, function (err) {
        if (err instanceof require('multer').MulterError) {
            // A Multer error occurred when uploading.
            return res.status(400).json({ success: false, message: err.message });
        } else if (err && err.message === 'INVALID_FILE_TYPE') {
            return res.status(400).json({ success: false, message: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.' });
        } else if (err) {
            // An unknown error occurred when uploading.
            return res.status(400).json({ success: false, message: 'File upload error.' });
        }
        next();
    });
}, bookingController.returnBooking);

module.exports = router;
