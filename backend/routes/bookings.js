'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticateToken = require('../middleware/authMiddleware');
const upload = require('../middleware/upload');

// ── Public Routes ─────────────────────────────────────────────────────────────

// Important: Specific routes like /availability must be registered before
// generic /:id routes.
router.get('/availability', bookingController.checkAvailability);

// ── Protected Routes (Require JWT Authentication) ────────────────────────────

// Specific GET routes before generic /:id
router.get('/my', authenticateToken, bookingController.getMyBookings);
router.get('/lender', authenticateToken, bookingController.getLenderBookings);

// POST /api/bookings
router.post('/', authenticateToken, bookingController.createBooking);

// GET /api/bookings/:id
router.get('/:id', authenticateToken, bookingController.getBookingById);

// DELETE /api/bookings/:id
router.delete('/:id', authenticateToken, bookingController.cancelBooking);

// PATCH /api/bookings/:id/approve
router.patch('/:id/approve', authenticateToken, bookingController.approveBooking);

// PATCH /api/bookings/:id/pay
router.patch('/:id/pay', authenticateToken, bookingController.payBooking);

// PATCH /api/bookings/:id/return
router.patch(
    '/:id/return',
    authenticateToken,
    (req, res, next) => {
        upload.single('returnPhoto')(req, res, function (err) {
            if (err instanceof require('multer').MulterError) {
                return res.status(400).json({
                    success: false,
                    message: err.message,
                });
            }

            if (err && err.message === 'INVALID_FILE_TYPE') {
                return res.status(400).json({
                    success: false,
                    message:
                        'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
                });
            }

            if (err) {
                return res.status(400).json({
                    success: false,
                    message: 'File upload error.',
                });
            }

            next();
        });
    },
    bookingController.returnBooking
);

module.exports = router;