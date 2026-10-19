'use strict';

const mongoose = require('mongoose');

const listingSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: [true, 'Title is required'],
            trim: true,
            minlength: [5, 'Title must be at least 5 characters'],
            maxlength: [100, 'Title cannot exceed 100 characters'],
        },
        category: {
            type: String,
            required: [true, 'Category is required'],
            enum: ['Electronics', 'Vehicles', 'Fashion', 'Property', 'Sports', 'Tools', 'Furniture', 'Equipment', 'Party'],
        },
        condition: {
            type: String,
            required: [true, 'Condition is required'],
            enum: ['brand-new', 'like-new', 'good', 'fair'],
        },
        conditionLabel: {
            type: String,
            trim: true,
            default: '',
        },
        categorySpecs: {
            type: mongoose.Schema.Types.Mixed,
            default: {},
        },
        price: {
            type: Number,
            required: [true, 'Price is required'],
            min: [10, 'Price must be at least 10'],
        },
        period: {
            type: String,
            required: [true, 'Pricing period is required'],
            enum: ['day', 'week', 'month'],
            default: 'day',
        },
        description: {
            type: String,
            trim: true,
            maxlength: [1000, 'Description cannot exceed 1000 characters'],
            default: '',
        },
        // ── Media Storage Architecture Confirmation ─────────────────────────────
        // Both listing photos ('image') and condition videos ('video') are stored
        // on Cloudinary's secure CDN. In MongoDB, 'image' and 'video' store their
        // full, authoritative HTTPS URLs (e.g., https://res.cloudinary.com/...).
        //
        // Safe Direct Browser Access:
        // When inspecting MongoDB, copying the 'image' or 'video' URL and pasting
        // it directly into any web browser address bar will immediately and safely
        // open the image or play the video over HTTPS without needing authentication
        // tokens, cookies, or backend proxying, completely in line with backend logic.
        // Legacy image paths starting with '/uploads/...' are also supported.
        image: {
            type: String,
            required: [true, 'Item image is required'],
        },
        imagePublicId: {
            type: String,
            default: null,
        },
        video: {
            type: String,
            default: null,
        },
        videoPublicId: {
            type: String,
            default: null,
        },
        videoFormat: {
            type: String,
            default: null,
        },
        videoDuration: {
            type: Number,
            default: null,
        },
        amenities: {
            type: [String],
            default: [],
        },
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        city: {
            type: String,
            required: [true, 'City/Location is required'],
            trim: true,
        },
        status: {
            type: String,
            enum: ['Active', 'Hidden', 'Deleted'],
            default: 'Active',
        },
        viewsCount: {
            type: Number,
            default: 0,
        },
        isCatalog: {
            type: Boolean,
            default: false,
            index: true,
        }
    },
    {
        timestamps: true,
    }
);

// Compound index: user-created listings first, then newest first
listingSchema.index({ isCatalog: 1, createdAt: -1 });

// Virtual for backward-compatible array representation of image
listingSchema.virtual('images').get(function () {
    return this.image ? [this.image] : [];
});

// Virtuals for computed payouts
listingSchema.virtual('commission').get(function () {
    return Math.round(this.price * 0.02);
});

listingSchema.virtual('securityDeposit').get(function () {
    return Math.round(this.price * 0.10);
});

listingSchema.set('toJSON', { virtuals: true });
listingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema);
