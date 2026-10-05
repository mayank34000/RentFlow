const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');

const googleClient = new OAuth2Client(
    process.env.VITE_GOOGLE_CLIENT_ID
);

const signup = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        // Validate required fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: 'Name, email and password are required.',
            });
        }

        // Basic password validation
        if (password.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long.',
            });
        }

        // Normalize email
        const normalizedEmail = email.trim().toLowerCase();

        // Check whether user already exists
        const existingUser = await User.findOne({
            email: normalizedEmail,
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email already exists.',
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            passwordHash,
            phone: phone ? phone.trim() : '',
        });

        return res.status(201).json({
            message: 'Account created successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        console.error('[Auth] Signup error:', error);

        // Handles MongoDB unique-email race condition
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'An account with this email already exists.',
            });
        }

        return res.status(500).json({
            message: 'Unable to create account.',
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({
                message: 'Email and password are required.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // passwordHash has select:false in the User model,
        // so explicitly request it for authentication.
        const user = await User.findOne({
            email: normalizedEmail,
        }).select('+passwordHash');

        // Don't reveal whether the email exists
        if (!user) {
            return res.status(401).json({
                message: 'Invalid email or password.',
            });
        }

        // Compare entered password with stored hash
        const passwordValid = await bcrypt.compare(
            password,
            user.passwordHash
        );

        if (!passwordValid) {
            return res.status(401).json({
                message: 'Invalid email or password.',
            });
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user._id.toString(),
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d',
            }
        );

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        console.error('[Auth] Login error:', error);

        return res.status(500).json({
            message: 'Unable to login.',
        });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
            });
        }

        return res.status(200).json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        console.error('[Auth] Get current user error:', error);

        return res.status(500).json({
            message: 'Unable to fetch user profile.',
        });
    }
};

const googleLogin = async (req, res) => {
    try {
        const { credential } = req.body;

        if (!credential) {
            return res.status(400).json({
                message: 'Google credential is required.',
            });
        }

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.VITE_GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();

        if (!payload) {
            return res.status(401).json({
                message: 'Invalid Google credential.',
            });
        }

        const {
            sub: googleId,
            email,
            email_verified,
            name,
            picture,
        } = payload;

        if (!email || !email_verified) {
            return res.status(401).json({
                message: 'Google email could not be verified.',
            });
        }

        let user = await User.findOne({
            email: email.toLowerCase(),
        });

        if (!user) {
            const randomPassword = require('crypto')
                .randomBytes(32)
                .toString('hex');

            const passwordHash = await bcrypt.hash(
                randomPassword,
                12
            );

            user = await User.create({
                name: name || 'Google User',
                email: email.toLowerCase(),
                passwordHash,
                profileImage: picture || '',
                role: 'user',
            });
        } else if (picture && !user.profileImage) {
            user.profileImage = picture;
            await user.save();
        }

        const token = jwt.sign(
            {
                userId: user._id.toString(),
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '7d',
            }
        );

        return res.status(200).json({
            message: 'Google login successful.',
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
            },
        });
    } catch (error) {
        console.error('[Auth] Google login error:', error);

        return res.status(401).json({
            message: 'Google authentication failed.',
        });
    }
};

module.exports = {
    signup,
    login,
    getMe,
    googleLogin,
};

