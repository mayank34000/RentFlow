'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const authenticateToken = require('../middleware/authMiddleware');

// ── Protected Premium Payment Routes ──────────────────────────────────────────

// GET /api/payment/quote - Get price, available balance, shortfall, and membership status
router.get('/quote', authenticateToken, paymentController.getPremiumQuote);
router.get('/premium/quote', authenticateToken, paymentController.getPremiumQuote);

// POST /api/payment/pay-wallet - Pay full ₹300 using wallet balance
router.post('/pay-wallet', authenticateToken, paymentController.payWithWallet);
router.post('/premium/pay-wallet', authenticateToken, paymentController.payWithWallet);

// POST /api/payment/create-order - Create Razorpay order (full or shortfall split)
router.post('/create-order', authenticateToken, paymentController.createOrder);

// POST /api/payment/verify - Verify Razorpay payment, credit shortfall, debit Premium
router.post('/verify', authenticateToken, paymentController.verifyPayment);

module.exports = router;
