const express = require('express');

const {
    signup,
    login,
    getMe,
    updateProfile,
    uploadProfileImage,
    googleLogin,
    sendOtp,
    verifyOtp,
    sendForgotPasswordOtp,
    verifyForgotPasswordOtp,
    resetPassword,
} = require('../controllers/authController');

const authenticateToken = require('../middleware/authMiddleware');
const { profileUpload } = require('../middleware/upload');
const router = express.Router();

// POST /api/auth/signup
router.post('/signup', signup);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/google
router.post('/google', googleLogin);

// POST /api/auth/otp
router.post('/send-otp', sendOtp);

// GET /api/auth/me
router.get('/me', authenticateToken, getMe);

// PUT /api/auth/profile
router.put('/me', authenticateToken, updateProfile);

// POST /api/auth/profile-image
router.post('/me/profile-image', authenticateToken, profileUpload.single('profileImage'), uploadProfileImage);

// POST /api/auth/verify-otp
router.post('/verify-otp', verifyOtp);

// POST /api/auth/send-forgot-password-otp
router.post('/forgot-password/send-otp', sendForgotPasswordOtp);

// POST /api/auth/verify-forgot-password-otp
router.post('/forgot-password/verify-otp', verifyForgotPasswordOtp);

// POST /api/auth/reset-password
router.post('/forgot-password/reset', resetPassword);

module.exports = router;