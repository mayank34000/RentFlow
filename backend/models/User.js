const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [3, 'Name must be at least 3 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },

    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
    },

    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
    },

    role: {
      type: String,
      enum: ['customer', 'seller', 'admin'],
      default: 'customer',
    },

    isPro: {
      type: Boolean,
      default: false,
    },

    avatar: {
      type: String,
      default: '',
    },

    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt automatically
  }
);

module.exports = mongoose.model('User', userSchema);
