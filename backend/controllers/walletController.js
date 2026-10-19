'use strict';

const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');
const TopupOrder = require('../models/TopupOrder');
const { parseRupeesToPaise } = require('../utils/money');

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Lazy upsert wallet on first access.
 * Handles duplicate-key race condition by safely re-reading.
 */
async function getOrCreateWallet(userId) {
    let wallet = await Wallet.findOne({ user: userId });
    if (wallet) return wallet;

    try {
        wallet = await Wallet.create({
            user: userId,
            balancePaise: 0,
            lockedPaise: 0,
            currency: 'INR',
        });
        return wallet;
    } catch (err) {
        if (err.code === 11000) {
            // Concurrent creation race: re-read the existing wallet
            return await Wallet.findOne({ user: userId });
        }
        throw err;
    }
}

/**
 * Verifies Razorpay credentials and enforces test mode.
 */
function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        const error = new Error('Payment gateway is not configured.');
        error.statusCode = 503;
        throw error;
    }

    // Safety rule: Test mode only
    if (!keyId.startsWith('rzp_test_')) {
        const error = new Error('Payment gateway must be in test mode (key must start with rzp_test_).');
        error.statusCode = 503;
        throw error;
    }

    return new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
    });
}

/**
 * Atomic credit logic: insert ledger row first, then $inc wallet balance.
 * Returns { alreadyProcessed, wallet }.
 */
async function executeTopupCredit(wallet, orderDoc, paymentId) {
    const idempotencyKey = `TOPUP:${orderDoc.razorpayOrderId}`;
    const amountPaise = orderDoc.amountPaise;

    try {
        // 1. Insert ledger row first
        await WalletLedger.create({
            wallet: wallet._id,
            user: wallet.user,
            type: 'TOPUP',
            balanceDeltaPaise: amountPaise,
            lockedDeltaPaise: 0,
            balanceAfterPaise: wallet.balancePaise + amountPaise,
            lockedAfterPaise: wallet.lockedPaise,
            idempotencyKey,
            razorpayPaymentId: paymentId,
            note: `Wallet top-up via Razorpay (${orderDoc.razorpayOrderId})`,
        });

        // 2. $inc wallet available balance
        const updatedWallet = await Wallet.findByIdAndUpdate(
            wallet._id,
            { $inc: { balancePaise: amountPaise } },
            { new: true }
        );

        orderDoc.status = 'PAID';
        orderDoc.razorpayPaymentId = paymentId;
        await orderDoc.save();

        return { alreadyProcessed: false, wallet: updatedWallet };
    } catch (err) {
        if (err.code === 11000) {
            // Already processed idempotently
            orderDoc.status = 'PAID';
            orderDoc.razorpayPaymentId = paymentId;
            await orderDoc.save();
            const currentWallet = await Wallet.findById(wallet._id);
            return { alreadyProcessed: true, wallet: currentWallet };
        }
        throw err;
    }
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * GET /api/wallet
 * Returns current authenticated user's wallet and paginated ledger.
 */
exports.getWallet = async (req, res) => {
    try {
        const wallet = await getOrCreateWallet(req.user._id);

        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
        const skip = (page - 1) * limit;

        const [ledger, totalCount] = await Promise.all([
            WalletLedger.find({ user: req.user._id })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('booking', 'status startDate endDate'),
            WalletLedger.countDocuments({ user: req.user._id }),
        ]);

        return res.status(200).json({
            success: true,
            data: {
                wallet: {
                    balancePaise: wallet.balancePaise,
                    lockedPaise: wallet.lockedPaise,
                    currency: wallet.currency,
                },
                ledger,
                pagination: {
                    page,
                    limit,
                    totalCount,
                    totalPages: Math.ceil(totalCount / limit),
                },
            },
        });
    } catch (err) {
        console.error('[Wallet] getWallet error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch wallet information.' });
    }
};

/**
 * POST /api/wallet/topup/order
 * Creates a Razorpay order for wallet top-up.
 */
exports.createTopupOrder = async (req, res) => {
    try {
        const { amountRupees } = req.body;

        if (amountRupees === undefined || amountRupees === null || amountRupees === '') {
            return res.status(400).json({
                success: false,
                message: 'amountRupees is required.',
            });
        }

        let amountPaise;
        try {
            amountPaise = parseRupeesToPaise(typeof amountRupees === 'string' ? amountRupees : String(amountRupees));
        } catch (parseErr) {
            return res.status(400).json({
                success: false,
                message: parseErr.message,
            });
        }

        // Limits: Min ₹100, Max ₹50,000
        const MIN_PAISE = 10000;    // ₹100
        const MAX_PAISE = 5000000;  // ₹50,000
        const CAP_PAISE = 10000000; // ₹1,00,000

        if (amountPaise < MIN_PAISE) {
            return res.status(400).json({
                success: false,
                message: 'Minimum top-up amount is ₹100.',
            });
        }

        if (amountPaise > MAX_PAISE) {
            return res.status(400).json({
                success: false,
                message: 'Maximum top-up amount per transaction is ₹50,000.',
            });
        }

        const wallet = await getOrCreateWallet(req.user._id);
        const projectedTotal = wallet.balancePaise + wallet.lockedPaise + amountPaise;

        if (projectedTotal > CAP_PAISE) {
            return res.status(400).json({
                success: false,
                message: 'Total wallet balance (available + held) cannot exceed ₹1,00,000.',
            });
        }

        const razorpay = getRazorpayClient();

        // Create Razorpay Order
        const receipt = `topup_${Date.now()}`.substring(0, 40);
        const rzpOrder = await razorpay.orders.create({
            amount: amountPaise,
            currency: 'INR',
            receipt,
        });

        // Save order tracking record
        await TopupOrder.create({
            user: req.user._id,
            razorpayOrderId: rzpOrder.id,
            amountPaise,
            currency: 'INR',
            purpose: 'WALLET_TOPUP',
            status: 'CREATED',
        });

        return res.status(200).json({
            success: true,
            data: {
                orderId: rzpOrder.id,
                amount: rzpOrder.amount,
                currency: rzpOrder.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            },
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Wallet] createTopupOrder error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create top-up order.' });
    }
};

/**
 * POST /api/wallet/topup/verify
 * Verifies Razorpay payment signature & credits wallet.
 */
exports.verifyTopupPayment = async (req, res) => {
    try {
        const razorpay = getRazorpayClient();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: 'Missing required payment verification details.',
            });
        }

        // Find the top-up order
        const topupOrder = await TopupOrder.findOne({
            razorpayOrderId: razorpay_order_id,
            user: req.user._id,
            purpose: 'WALLET_TOPUP',
        });

        if (!topupOrder) {
            return res.status(404).json({
                success: false,
                message: 'Top-up order not found.',
            });
        }

        const wallet = await getOrCreateWallet(req.user._id);

        // If already marked PAID, return success idempotently
        if (topupOrder.status === 'PAID') {
            return res.status(200).json({
                success: true,
                message: 'Payment verified and credited successfully.',
                data: {
                    balancePaise: wallet.balancePaise,
                    lockedPaise: wallet.lockedPaise,
                },
            });
        }

        // 1. Signature verification using installed Razorpay SDK export
        let isSignatureValid = false;
        try {
            isSignatureValid = validatePaymentVerification(
                { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
                razorpay_signature,
                process.env.RAZORPAY_KEY_SECRET
            );
        } catch (sigErr) {
            isSignatureValid = false;
        }

        if (!isSignatureValid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid payment signature. Verification failed.',
            });
        }

        // 2. Fetch payment details from Razorpay gateway
        const payment = await razorpay.payments.fetch(razorpay_payment_id);

        if (
            payment.status !== 'captured' ||
            payment.amount !== topupOrder.amountPaise ||
            payment.currency !== 'INR' ||
            payment.order_id !== topupOrder.razorpayOrderId
        ) {
            return res.status(400).json({
                success: false,
                message: 'Payment verification failed with gateway details.',
            });
        }

        // 3. Atomically credit wallet via idempotent ledger insertion
        const result = await executeTopupCredit(wallet, topupOrder, razorpay_payment_id);

        return res.status(200).json({
            success: true,
            message: 'Payment verified and credited to wallet.',
            data: {
                balancePaise: result.wallet.balancePaise,
                lockedPaise: result.wallet.lockedPaise,
            },
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Wallet] verifyTopupPayment error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to verify payment.' });
    }
};

/**
 * POST /api/wallet/topup/check-pending
 * Checks CREATED orders against Razorpay API to credit any completed payments.
 * Replaces external webhooks per project design.
 */
exports.checkPendingTopups = async (req, res) => {
    try {
        const razorpay = getRazorpayClient();
        const wallet = await getOrCreateWallet(req.user._id);

        // Check user's CREATED orders created within the last 24 hours
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const pendingOrders = await TopupOrder.find({
            user: req.user._id,
            status: 'CREATED',
            purpose: 'WALLET_TOPUP',
            createdAt: { $gte: oneDayAgo },
        });

        let creditedCount = 0;

        for (const order of pendingOrders) {
            try {
                const rzpPayments = await razorpay.orders.fetchPayments(order.razorpayOrderId);
                const capturedPayment = rzpPayments.items.find(
                    (p) => p.status === 'captured' && p.amount === order.amountPaise
                );

                if (capturedPayment) {
                    await executeTopupCredit(wallet, order, capturedPayment.id);
                    creditedCount++;
                }
            } catch (orderCheckErr) {
                console.error(`[Wallet] Error checking pending order ${order.razorpayOrderId}:`, orderCheckErr.message);
            }
        }

        const freshWallet = await Wallet.findById(wallet._id);

        return res.status(200).json({
            success: true,
            message: `Checked ${pendingOrders.length} pending orders. Credited ${creditedCount} orders.`,
            data: {
                checkedCount: pendingOrders.length,
                creditedCount,
                balancePaise: freshWallet.balancePaise,
                lockedPaise: freshWallet.lockedPaise,
            },
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Wallet] checkPendingTopups error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to check pending orders.' });
    }
};

module.exports.getOrCreateWallet = getOrCreateWallet;
module.exports.getRazorpayClient = getRazorpayClient;
