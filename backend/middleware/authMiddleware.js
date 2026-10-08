const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                message: 'Authentication required.',
            });
        }

        const token = authHeader.substring(7);

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // Support both old and new JWT payload formats
        const userId = decoded.userId || decoded.id || decoded._id;

        if (!userId) {
            return res.status(401).json({
                message: 'Invalid authentication token.',
            });
        }

        // Maintain compatibility with existing controllers
        // that use req.user._id
        req.user = {
            _id: userId,
            id: userId,
            role: (decoded.role === 'customer' || decoded.role === 'seller') ? 'user' : decoded.role,
        };

        next();

    } catch (error) {
        console.error('Authentication error:', error.message);

        return res.status(401).json({
            message: 'Invalid or expired authentication token.',
        });
    }
};

module.exports = authenticateToken;