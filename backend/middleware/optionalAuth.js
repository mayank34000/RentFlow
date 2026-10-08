const jwt = require('jsonwebtoken');
const User = require('../models/User');

const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            return next();
        }

        const token = authHeader.substring(7);

        try {
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            const userId = decoded.userId || decoded.id || decoded._id;

            if (userId) {
                // Fetch the user to determine active Pro status
                const user = await User.findById(userId).select('isPro premiumUntil role');
                if (user) {
                    req.user = {
                        _id: user._id.toString(),
                        id: user._id.toString(),
                        role: (user.role === 'customer' || user.role === 'seller') ? 'user' : user.role,
                        isPro: Boolean(user.isPro && user.premiumUntil && new Date(user.premiumUntil) > new Date()),
                    };
                } else {
                    req.user = null;
                }
            } else {
                req.user = null;
            }
        } catch (jwtError) {
            req.user = null; // Ignore invalid/expired tokens for optional auth
        }

        next();
    } catch (error) {
        req.user = null;
        next();
    }
};

module.exports = optionalAuth;
