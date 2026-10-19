'use strict';

const Razorpay = require('razorpay');
const { validatePaymentVerification } = require('razorpay/dist/utils/razorpay-utils');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const WalletLedger = require('../models/WalletLedger');
const TopupOrder = require('../models/TopupOrder');
const { getOrCreateWallet } = require('./walletController');

const PREMIUM_AMOUNT_PAISE = 30000; // Fixed server-side ₹300 in paise
const PREMIUM_CURRENCY = 'INR';

/**
 * Ensures Razorpay client is initialized and guarded for test mode.
 */
function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        const err = new Error('Payment gateway is not configured.');
        err.statusCode = 503;
        throw err;
    }

    if (!keyId.startsWith('rzp_test_')) {
        const err = new Error('Payment gateway must be in test mode (key must start with rzp_test_).');
        err.statusCode = 503;
        throw err;
    }

    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/**
 * Activates or extends Pro membership on the User document.
 */
function calculateNewPremiumDate(user) {
    const now = new Date();
    let baseDate = now;
    if (user.premiumUntil && new Date(user.premiumUntil) > now) {
        baseDate = new Date(user.premiumUntil);
    }
    const newUntil = new Date(baseDate);
    newUntil.setDate(newUntil.getDate() + 30);
    return newUntil;
}

/**
 * GET /api/payment/quote
 * Returns quote for Premium subscription: price, available wallet balance, shortfall, and active status.
 */
exports.getPremiumQuote = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const wallet = await getOrCreateWallet(req.user._id);
        const now = new Date();
        const isCurrentlyActive = !!(user.premiumUntil && new Date(user.premiumUntil) > now);

        const availablePaise = wallet.balancePaise;
        const shortfallPaise = Math.max(0, PREMIUM_AMOUNT_PAISE - availablePaise);

        return res.status(200).json({
            success: true,
            data: {
                pricePaise: PREMIUM_AMOUNT_PAISE,
                priceRupees: '300.00',
                availableBalancePaise: availablePaise,
                walletBalancePaise: availablePaise,
                canPayWithWallet: availablePaise >= PREMIUM_AMOUNT_PAISE,
                shortfallPaise,
                isCurrentlyActive,
                premiumUntil: user.premiumUntil,
            },
        });
    } catch (err) {
        console.error('[Payment] getPremiumQuote error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to fetch premium quote.' });
    }
};

/**
 * POST /api/payment/pay-wallet
 * Activates Premium directly using available wallet balance.
 */
exports.payWithWallet = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Active premium members are permitted to extend their subscription (+30 days)

        const wallet = await getOrCreateWallet(req.user._id);
        if (wallet.balancePaise < PREMIUM_AMOUNT_PAISE) {
            return res.status(400).json({
                success: false,
                message: 'Insufficient wallet balance. Please use Razorpay or split payment.',
            });
        }

        const purchaseId = `${Date.now()}`;
        const idempotencyKey = `PREMIUM:${user._id}:${purchaseId}`;

        // 1. Insert PREMIUM_PAYMENT ledger row first (insert-first atomicity)
        let ledgerRow;
        try {
            ledgerRow = await WalletLedger.create({
                wallet: wallet._id,
                user: user._id,
                type: 'PREMIUM_PAYMENT',
                balanceDeltaPaise: -PREMIUM_AMOUNT_PAISE,
                lockedDeltaPaise: 0,
                balanceAfterPaise: wallet.balancePaise - PREMIUM_AMOUNT_PAISE,
                lockedAfterPaise: wallet.lockedPaise,
                idempotencyKey,
                note: 'RentFlow Pro Pass - 1 Month Subscription via Wallet Balance',
            });
        } catch (err) {
            if (err.code === 11000) {
                return res.status(200).json({ success: true, message: 'Subscription already processed.' });
            }
            throw err;
        }

        // 2. Conditional balance deduction on wallet
        const updatedWallet = await Wallet.findOneAndUpdate(
            { _id: wallet._id, balancePaise: { $gte: PREMIUM_AMOUNT_PAISE } },
            { $inc: { balancePaise: -PREMIUM_AMOUNT_PAISE } },
            { new: true }
        );

        if (!updatedWallet) {
            // Roll back ledger insertion if conditional balance check failed
            await WalletLedger.findByIdAndDelete(ledgerRow._id);
            return res.status(400).json({
                success: false,
                message: 'Insufficient balance. Please top up your wallet.',
            });
        }

        // 3. Activate Premium on User
        user.isPro = true;
        user.premiumUntil = calculateNewPremiumDate(user);
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Payment successful! Welcome to RentFlow Premium.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPro: true,
                premiumUntil: user.premiumUntil,
            },
            data: {
                wallet: {
                    balancePaise: updatedWallet.balancePaise,
                    lockedPaise: updatedWallet.lockedPaise,
                },
            },
        });
    } catch (err) {
        console.error('[Payment] payWithWallet error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to process wallet payment for premium.' });
    }
};

exports.createOrder = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        // Active premium members are permitted to extend their subscription (+30 days)

        const useWallet = !!req.body.useWallet;
        const wallet = await getOrCreateWallet(req.user._id);

        let shortfallPaise = PREMIUM_AMOUNT_PAISE;
        if (useWallet) {
            shortfallPaise = Math.max(0, PREMIUM_AMOUNT_PAISE - wallet.balancePaise);
            if (shortfallPaise === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Your wallet has sufficient balance to cover the full ₹300. Please use wallet payment.',
                });
            }
        }

        // Razorpay enforces a minimum order amount of 100 paise (₹1.00)
        const orderAmountPaise = Math.max(shortfallPaise, 100);

        // Wallet cap verification: balance + locked + this incoming shortfall <= ₹1,00,000
        const projectedTotal = wallet.balancePaise + wallet.lockedPaise + orderAmountPaise;
        if (projectedTotal > 10000000) {
            return res.status(400).json({
                success: false,
                message: 'Payment would exceed maximum wallet limit of ₹1,00,000.',
            });
        }

        const receipt = `prem_${Date.now()}`.substring(0, 40);
        const razorpay = getRazorpayClient();
        const order = await razorpay.orders.create({
            amount: orderAmountPaise,
            currency: PREMIUM_CURRENCY,
            receipt,
        });

        // Save order tracking with purpose 'PREMIUM'
        await TopupOrder.create({
            user: user._id,
            razorpayOrderId: order.id,
            amountPaise: orderAmountPaise,
            currency: PREMIUM_CURRENCY,
            purpose: 'PREMIUM',
            status: 'CREATED',
        });

        // Maintain legacy field for compatibility
        user.razorpayOrderId = order.id;
        await user.save();

        return res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
                shortfallPaise,
                useWallet,
            },
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Payment] createOrder error:', err.message);
        return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
    }
};

/**
 * POST /api/payment/verify
 * Verifies Razorpay payment signature & SDK payment capture, credits shortfall to wallet,
 * then debits the ₹300 Premium payment atomically to activate subscription.
 */
exports.verifyPayment = async (req, res) => {
    try {
        const razorpay = getRazorpayClient();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
        }

        const user = await User.findById(req.user._id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const topupOrder = await TopupOrder.findOne({
            razorpayOrderId: razorpay_order_id,
            user: user._id,
            purpose: 'PREMIUM',
        });

        if (!topupOrder) {
            return res.status(404).json({ success: false, message: 'Premium order not found.' });
        }

        const wallet = await getOrCreateWallet(user._id);

        // 1. Signature verification using installed Razorpay SDK helper
        let isAuthentic = false;
        try {
            isAuthentic = validatePaymentVerification(
                { order_id: razorpay_order_id, payment_id: razorpay_payment_id },
                razorpay_signature,
                process.env.RAZORPAY_KEY_SECRET
            );
        } catch (sigErr) {
            isAuthentic = false;
        }

        if (!isAuthentic) {
            return res.status(400).json({ success: false, message: 'Invalid payment signature.' });
        }

        // 2. Gateway status verification via Razorpay SDK
        const payment = await razorpay.payments.fetch(razorpay_payment_id);
        if (
            payment.status !== 'captured' ||
            payment.amount !== topupOrder.amountPaise ||
            payment.currency !== PREMIUM_CURRENCY ||
            payment.order_id !== topupOrder.razorpayOrderId
        ) {
            return res.status(400).json({ success: false, message: 'Payment verification failed with gateway.' });
        }

        // 3. One-code-path: Shortfall credited to wallet as TOPUP (idempotent)
        const topupKey = `TOPUP:${topupOrder.razorpayOrderId}`;
        if (topupOrder.status !== 'PAID') {
            try {
                await WalletLedger.create({
                    wallet: wallet._id,
                    user: user._id,
                    type: 'TOPUP',
                    balanceDeltaPaise: topupOrder.amountPaise,
                    lockedDeltaPaise: 0,
                    balanceAfterPaise: wallet.balancePaise + topupOrder.amountPaise,
                    lockedAfterPaise: wallet.lockedPaise,
                    idempotencyKey: topupKey,
                    razorpayPaymentId: razorpay_payment_id,
                    note: `Shortfall top-up for Premium Subscription (${topupOrder.razorpayOrderId})`,
                });

                await Wallet.findByIdAndUpdate(wallet._id, {
                    $inc: { balancePaise: topupOrder.amountPaise },
                });
            } catch (err) {
                if (err.code !== 11000) throw err;
            }

            topupOrder.status = 'PAID';
            topupOrder.razorpayPaymentId = razorpay_payment_id;
            await topupOrder.save();
        }

        // Re-read wallet after top-up credit
        const freshWallet = await Wallet.findById(wallet._id);

        // 4. Debit Premium fee via PREMIUM_PAYMENT ledger row (idempotent)
        const premiumKey = `PREMIUM:${user._id}:${topupOrder.razorpayOrderId}`;
        let premiumLedgerDone = false;

        try {
            await WalletLedger.create({
                wallet: freshWallet._id,
                user: user._id,
                type: 'PREMIUM_PAYMENT',
                balanceDeltaPaise: -PREMIUM_AMOUNT_PAISE,
                lockedDeltaPaise: 0,
                balanceAfterPaise: freshWallet.balancePaise - PREMIUM_AMOUNT_PAISE,
                lockedAfterPaise: freshWallet.lockedPaise,
                idempotencyKey: premiumKey,
                razorpayPaymentId: razorpay_payment_id,
                note: `RentFlow Pro Pass - 1 Month Subscription (${topupOrder.razorpayOrderId})`,
            });
            premiumLedgerDone = true;
        } catch (err) {
            if (err.code === 11000) {
                // Already processed idempotently
                premiumLedgerDone = true;
            } else {
                throw err;
            }
        }

        if (premiumLedgerDone) {
            // Apply wallet balance deduction if not already applied
            await Wallet.findOneAndUpdate(
                { _id: freshWallet._id, balancePaise: { $gte: PREMIUM_AMOUNT_PAISE } },
                { $inc: { balancePaise: -PREMIUM_AMOUNT_PAISE } }
            );

            // 5. Activate Pro membership on User document
            user.isPro = true;
            user.premiumUntil = calculateNewPremiumDate(user);
            user.razorpayPaymentId = razorpay_payment_id;
            await user.save();
        }

        const finalWallet = await Wallet.findById(wallet._id);

        return res.status(200).json({
            success: true,
            message: 'Payment verified and Premium membership activated!',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPro: true,
                premiumUntil: user.premiumUntil,
            },
            data: {
                wallet: {
                    balancePaise: finalWallet.balancePaise,
                    lockedPaise: finalWallet.lockedPaise,
                },
            },
        });
    } catch (err) {
        if (err.statusCode === 503) {
            return res.status(503).json({ success: false, message: err.message });
        }
        console.error('[Payment] verifyPayment error:', err.message);
        return res.status(500).json({ success: false, message: 'Payment verification failed.' });
    }
};
