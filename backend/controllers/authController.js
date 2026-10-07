const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const Otp = require('../models/Otp');
const {
    sendOtpEmail,
    sendForgotPasswordOtpEmail,
} = require('../utils/emailService');

const googleClient = new OAuth2Client(
    process.env.VITE_GOOGLE_CLIENT_ID
);

const cloudinary = require('../config/cloudinary');
const { profileUpload } = require('../middleware/upload');

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
        dateOfBirth: user.dateOfBirth,
        country: user.country,
        state: user.state,
        city: user.city,
        address: user.address,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    },
});
    } catch (error) {
        console.error('[Auth] Get current user error:', error);

        return res.status(500).json({
            message: 'Unable to fetch user profile.',
        });
    }
};

const updateProfile = async (req, res) => {
    try {
        const {
    name,
    phone,
    profileImage,
    dateOfBirth,
    country,
    state,
    city,
    address,
} = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({
                message: 'Name must be at least 2 characters long.',
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
            });
        }

        user.name = name.trim();
        user.phone = phone ? phone.trim() : '';
        if (profileImage !== undefined) {user.profileImage = profileImage;}
        user.dateOfBirth = dateOfBirth || null;
        user.country = country ? country.trim() : 'India';
        user.state = state ? state.trim() : '';
        user.city = city ? city.trim() : '';
        user.address = address ? address.trim() : '';

        await user.save();

        return res.status(200).json({
            message: 'Profile updated successfully.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone,
                profileImage: user.profileImage,
                dateOfBirth: user.dateOfBirth,
                country: user.country,
                state: user.state,
                city: user.city,
                address: user.address,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
            },
        });
    } catch (error) {
        console.error('[Auth] Update profile error:', error);

        return res.status(500).json({
            message: 'Unable to update profile.',
        });
    }
};

const uploadProfileImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: 'Please select a profile image.',
            });
        }

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                message: 'User not found.',
            });
        }

        const uploadResult = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: 'rentflow/profile-images',
                    resource_type: 'image',
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            stream.end(req.file.buffer);
        });

        user.profileImage = uploadResult.secure_url;

        await user.save();

        return res.status(200).json({
            message: 'Profile image uploaded successfully.',
            profileImage: user.profileImage,
        });
    } catch (error) {
        console.error('[Auth] Profile image upload error:', error);

        return res.status(500).json({
            message: 'Unable to upload profile image.',
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

const sendOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                message: 'No account found with this email.',
            });
        }

        const otp = crypto
            .randomInt(100000, 1000000)
            .toString();

        const codeHash = await bcrypt.hash(otp, 10);

        await Otp.deleteMany({
            email: normalizedEmail,
            purpose: 'login',
        });

        await Otp.create({
            email: normalizedEmail,
            codeHash,
            purpose: 'login',
            attempts: 0,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        await sendOtpEmail(normalizedEmail, otp);

        return res.status(200).json({
            message: 'OTP sent successfully.',
        });
    } catch (error) {
        console.error('[Auth] Send OTP error:', error);

        return res.status(500).json({
            message: 'Unable to send OTP. Please try again.',
        });
    }
};

const verifyOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: 'Email and OTP are required.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            purpose: 'login',
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                message: 'OTP not found. Please request a new OTP.',
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({
                _id: otpRecord._id,
            });

            return res.status(400).json({
                message: 'OTP has expired. Please request a new OTP.',
            });
        }

        if (otpRecord.attempts >= 5) {
            await Otp.deleteOne({
                _id: otpRecord._id,
            });

            return res.status(429).json({
                message: 'Too many incorrect attempts. Please request a new OTP.',
            });
        }

        const otpValid = await bcrypt.compare(
            otp.toString(),
            otpRecord.codeHash
        );

        if (!otpValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();

            return res.status(401).json({
                message: 'Invalid OTP.',
            });
        }

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                message: 'User account not found.',
            });
        }

        await Otp.deleteOne({
            _id: otpRecord._id,
        });

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
            message: 'OTP login successful.',
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
        console.error('[Auth] Verify OTP error:', error);

        return res.status(500).json({
            message: 'Unable to verify OTP. Please try again.',
        });
    }
};

const sendForgotPasswordOtp = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: 'Email is required.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                message: 'No account found with this email.',
            });
        }

        const otp = crypto
            .randomInt(1000, 10000)
            .toString();

        const codeHash = await bcrypt.hash(otp, 10);

        await Otp.deleteMany({
            email: normalizedEmail,
            purpose: 'forgot-password',
        });

        await Otp.create({
            email: normalizedEmail,
            codeHash,
            purpose: 'forgot-password',
            attempts: 0,
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        });

        await sendForgotPasswordOtpEmail(
            normalizedEmail,
            otp
        );

        return res.status(200).json({
            message: 'Password reset OTP sent successfully.',
        });
    } catch (error) {
        console.error(
            '[Auth] Send forgot password OTP error:',
            error
        );

        return res.status(500).json({
            message: 'Unable to send password reset OTP. Please try again.',
        });
    }
};

const verifyForgotPasswordOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                message: 'Email and OTP are required.',
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const otpRecord = await Otp.findOne({
            email: normalizedEmail,
            purpose: 'forgot-password',
        }).sort({ createdAt: -1 });

        if (!otpRecord) {
            return res.status(400).json({
                message: 'OTP not found. Please request a new OTP.',
            });
        }

        if (otpRecord.expiresAt < new Date()) {
            await Otp.deleteOne({
                _id: otpRecord._id,
            });

            return res.status(400).json({
                message: 'OTP has expired. Please request a new OTP.',
            });
        }

        if (otpRecord.attempts >= 5) {
            await Otp.deleteOne({
                _id: otpRecord._id,
            });

            return res.status(429).json({
                message: 'Too many incorrect attempts. Please request a new OTP.',
            });
        }

        const otpValid = await bcrypt.compare(
            otp.toString(),
            otpRecord.codeHash
        );

        if (!otpValid) {
            otpRecord.attempts += 1;
            await otpRecord.save();

            return res.status(401).json({
                message: 'Invalid OTP.',
            });
        }

        const user = await User.findOne({
            email: normalizedEmail,
        });

        if (!user) {
            return res.status(404).json({
                message: 'User account not found.',
            });
        }

        // Remove the OTP after successful verification
        await Otp.deleteOne({
            _id: otpRecord._id,
        });

        // Create a short-lived reset token
        const resetToken = jwt.sign(
            {
                userId: user._id.toString(),
                purpose: 'password-reset',
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '10m',
            }
        );

        return res.status(200).json({
            message: 'OTP verified successfully.',
            resetToken,
        });
    } catch (error) {
        console.error(
            '[Auth] Verify forgot password OTP error:',
            error
        );

        return res.status(500).json({
            message: 'Unable to verify OTP. Please try again.',
        });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        if (!resetToken || !newPassword) {
            return res.status(400).json({
                message: 'Reset token and new password are required.',
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                message: 'Password must be at least 6 characters long.',
            });
        }

        let decoded;

        try {
            decoded = jwt.verify(
                resetToken,
                process.env.JWT_SECRET
            );
        } catch (error) {
            return res.status(401).json({
                message: 'Reset session has expired. Please request a new OTP.',
            });
        }

        if (
            !decoded.userId ||
            decoded.purpose !== 'password-reset'
        ) {
            return res.status(401).json({
                message: 'Invalid password reset token.',
            });
        }

        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({
                message: 'User account not found.',
            });
        }

        const passwordHash = await bcrypt.hash(
            newPassword,
            12
        );

        user.passwordHash = passwordHash;

        await user.save();

        return res.status(200).json({
            message: 'Password reset successfully.',
        });
    } catch (error) {
        console.error('[Auth] Reset password error:', error);

        return res.status(500).json({
            message: 'Unable to reset password. Please try again.',
        });
    }
};

module.exports = {
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
};


// @route   POST /api/auth/premium
// @desc    Upgrade user to premium
// @access  Private
const upgradePremium = async (req, res) => {
    try {
        const user = await User.findById(req.user._id || req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        user.isPro = true;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Successfully upgraded to premium',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                isPro: user.isPro
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server error upgrading to premium' });
    }
};

module.exports.upgradePremium = upgradePremium;