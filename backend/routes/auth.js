const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateFields } = require('../utils/validate');

const {
  signup: controllerSignup,
  login: controllerLogin,
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
// Keep the existing Stage 2 signup implementation because it supports
// customer/seller roles and the existing JWT authentication flow.
router.post('/signup', async (req, res, next) => {
  try {
    const error = validateFields(req.body, ['name', 'email', 'password']);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const { name, email, password, role } = req.body;

    const allowedRoles = ['customer', 'seller'];
    const assignedRole = allowedRoles.includes(role) ? role : 'customer';

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      role: assignedRole,
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully. Please log in.',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
// Keep the existing JWT login implementation so admin role checks continue
// to receive { id, role } in the signed token.
router.post('/login', async (req, res, next) => {
  try {
    const error = validateFields(req.body, ['email', 'password']);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const { email, password } = req.body;

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isPro: user.isPro,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    next(err);
  }
});

// Dhruv's extended authentication/profile routes.
router.post('/google', googleLogin);

router.post('/send-otp', sendOtp);

router.get('/me', authenticateToken, getMe);

router.put('/me', authenticateToken, updateProfile);

router.post(
  '/me/profile-image',
  authenticateToken,
  profileUpload.single('profileImage'),
  uploadProfileImage
);

router.post('/verify-otp', verifyOtp);

router.post(
  '/forgot-password/send-otp',
  sendForgotPasswordOtp
);

router.post(
  '/forgot-password/verify-otp',
  verifyForgotPasswordOtp
);

router.post(
  '/forgot-password/reset',
  resetPassword
);

// Upgrade to Premium
const { upgradePremium } = require('../controllers/authController');
router.post('/premium', authenticateToken, upgradePremium);

module.exports = router;
