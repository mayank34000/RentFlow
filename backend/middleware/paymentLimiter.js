'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Payment Rate Limiter
 * Reusable rate limiter applying user-keyed or IP-keyed throttling for payment actions.
 */
const paymentLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_PAYMENT_MAX, 10) || 10,
    keyGenerator: (req, res) => {
        return req.user ? req.user._id.toString() : rateLimit.ipKeyGenerator(req, res);
    },
    message: { success: false, message: 'Too many payment attempts, please try again later' },
    validate: { trustProxy: false, xForwardedForHeader: false },
});

module.exports = paymentLimiter;
