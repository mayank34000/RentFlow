'use strict';

// DEV ONLY: Replace with middleware/auth.js when real authentication is implemented.

const mongoose = require('mongoose');

module.exports = (req, res, next) => {
    const devUserId = req.header('x-dev-user-id');
    const devRole = req.header('x-dev-role') || 'user';

    if (!devUserId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required. Missing x-dev-user-id header.'
        });
    }

    if (!mongoose.Types.ObjectId.isValid(devUserId)) {
        return res.status(401).json({
            success: false,
            message: 'Invalid x-dev-user-id header. Must be a valid MongoDB ObjectId.'
        });
    }

    req.user = {
        _id: devUserId,
        role: devRole
    };

    next();
};
