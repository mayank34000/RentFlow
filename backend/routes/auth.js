const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { validateFields } = require('../utils/validate');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res, next) => {
  try {
    const error = validateFields(req.body, ['name', 'email', 'password']);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const { name, email, password, role } = req.body;

    // Only allow customer or seller at signup — admin must be set manually in DB
    const allowedRoles = ['customer', 'seller'];
    const assignedRole = allowedRoles.includes(role) ? role : 'customer';

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
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
router.post('/login', async (req, res, next) => {
  try {
    const error = validateFields(req.body, ['email', 'password']);
    if (error) {
      return res.status(400).json({ success: false, message: error });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // JWT payload: only include what is needed for auth/authorization.
    // Role comes from the database record — never from the request body.
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

module.exports = router;
