const crypto = require('crypto');
const Razorpay = require('razorpay');
const User = require('../models/User');

const PREMIUM_AMOUNT = 30000; // 300 INR in paise
const PREMIUM_CURRENCY = 'INR';

const createOrder = async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
            return res.status(500).json({ success: false, message: 'Payment gateway is not configured.' });
        }

        const razorpay = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET,
        });

        const options = {
            amount: PREMIUM_AMOUNT,
            currency: PREMIUM_CURRENCY,
            receipt: `receipt_order_${req.user._id}`,
        };

        const order = await razorpay.orders.create(options);

        // Save order ID to user to verify later
        await User.findByIdAndUpdate(req.user._id, { razorpayOrderId: order.id });

        return res.status(200).json({
            success: true,
            data: {
                orderId: order.id,
                amount: order.amount,
                currency: order.currency,
                keyId: process.env.RAZORPAY_KEY_ID,
            },
        });
    } catch (error) {
        console.error('[Payment] Create order error:', error);
        return res.status(500).json({ success: false, message: 'Failed to create payment order.' });
    }
};

const verifyPayment = async (req, res) => {
    try {
        if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) { return res.status(500).json({ success: false, message: "Payment gateway is not configured." }); }

        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ success: false, message: 'Missing payment verification details.' });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        if (user.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ success: false, message: 'Order ID mismatch.' });
        }

        // Idempotency check
        if (user.razorpayPaymentId === razorpay_payment_id) {
            return res.status(400).json({ success: false, message: 'Payment already processed.' });
        }

        // Verify signature
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        // Prevent timing attacks
        const expectedBuffer = Buffer.from(expectedSignature, 'hex');
        const signatureBuffer = Buffer.from(razorpay_signature, 'hex');
        const isAuthentic = expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);

        if (!isAuthentic) {
            return res.status(400).json({ success: false, message: 'Invalid signature. Payment verification failed.' });
        }

        // Apply Premium extension
        const now = new Date();
        let newPremiumUntil = new Date();

        if (user.isPro && user.premiumUntil && user.premiumUntil > now) {
            newPremiumUntil = new Date(user.premiumUntil);
        } else {
            newPremiumUntil = now;
        }

        newPremiumUntil.setDate(newPremiumUntil.getDate() + 30); // 30-day extension

        user.isPro = true;
        user.premiumUntil = newPremiumUntil;
        user.razorpayPaymentId = razorpay_payment_id;

        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Payment verified successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPro: true,
                premiumUntil: user.premiumUntil,
                phone: user.phone,
                profileImage: user.profileImage,
            }
        });
    } catch (error) {
        console.error('[Payment] Verify error:', error);
        return res.status(500).json({ success: false, message: 'Payment verification failed.' });
    }
};

module.exports = {
    createOrder,
    verifyPayment,
};
