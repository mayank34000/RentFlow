'use strict';

const express = require('express');
const router = express.Router();
const walletController = require('../controllers/walletController');
const authenticateToken = require('../middleware/authMiddleware');
const paymentLimiter = require('../middleware/paymentLimiter');

// ── Protected Wallet Routes ───────────────────────────────────────────────────

// GET /api/wallet - Get current authenticated user's wallet & paginated ledger
router.get('/', authenticateToken, walletController.getWallet);

// Top-up routes protected by JWT auth & payment rate limiter
router.post('/topup/order', authenticateToken, paymentLimiter, walletController.createTopupOrder);
router.post('/topup/verify', authenticateToken, paymentLimiter, walletController.verifyTopupPayment);
router.post('/topup/check-pending', authenticateToken, paymentLimiter, walletController.checkPendingTopups);

module.exports = router;
