'use strict';

const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authenticateToken = require('../middleware/authMiddleware');
const { upload } = require('../middleware/upload');

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

// DELETE /api/bookings/:id (cancel alias)
router.delete('/:id', authenticateToken, bookingController.cancelBooking);

// PATCH /api/bookings/:id/cancel
router.patch('/:id/cancel', authenticateToken, bookingController.cancelBooking);

// PATCH /api/bookings/:id/approve
router.patch('/:id/approve', authenticateToken, bookingController.approveBooking);

// PATCH /api/bookings/:id/reject
router.patch('/:id/reject', authenticateToken, bookingController.rejectBooking);

// PATCH /api/bookings/:id/confirm-return
router.patch('/:id/confirm-return', authenticateToken, bookingController.confirmReturn);

// POST /api/bookings/:id/dispute
router.post('/:id/dispute', authenticateToken, bookingController.disputeBooking);

// ── Booking Payment Routes (Pay After Seller Approval) ────────────────────────
// GET /api/bookings/:id/payment-quote
router.get('/:id/payment-quote', authenticateToken, bookingController.getPaymentQuote);

// POST /api/bookings/:id/pay-wallet
router.post('/:id/pay-wallet', authenticateToken, bookingController.payBookingWithWallet);

// POST /api/bookings/:id/pay-razorpay/order
router.post('/:id/pay-razorpay/order', authenticateToken, bookingController.createBookingPaymentOrder);

// POST /api/bookings/:id/pay-razorpay/verify
router.post('/:id/pay-razorpay/verify', authenticateToken, bookingController.verifyBookingPayment);

// PATCH /api/bookings/:id/pay (DISABLED per Decision 1A)
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