const express = require('express');

const {
    signup,
    login,
    getMe,
    googleLogin,
} = require('../controllers/authController');

const authenticateToken = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/google
router.post('/google', googleLogin);

// GET /api/auth/me
router.get('/me', authenticateToken, getMe);

module.exports = router;