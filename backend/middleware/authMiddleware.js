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

        if (!decoded.userId) {
            return res.status(401).json({
                message: 'Invalid authentication token.',
            });
        }

        // Maintain compatibility with existing controllers
        // that use req.user._id
        req.user = {
            _id: decoded.userId,
        };

        next();
    } catch (error) {
        return res.status(401).json({
            message: 'Invalid or expired authentication token.',
        });
    }
};

module.exports = authenticateToken;