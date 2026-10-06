const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 100,
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
            match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        },

        passwordHash: {
            type: String,
            required: true,
            select: false,
        },

        role: {
            type: String,
            enum: ['user', 'admin'],
            default: 'user',
        },

        phone: {
            type: String,
            trim: true,
            default: '',
        },

        profileImage: {
            type: String,
            default: '',
        },

        dateOfBirth: {
            type: Date,
            default: null,
        },

        country: {
            type: String,
            trim: true,
            default: 'India',
        },

        state: {
            type: String,
            trim: true,
            default: '',
        },

        city: {
            type: String,
            trim: true,
            default: '',
        },

        address: {
            type: String,
            trim: true,
            maxlength: 500,
            default: '',
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model('User', userSchema);