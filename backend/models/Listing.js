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
            enum: ['Electronics', 'Vehicles', 'Furniture', 'Equipment', 'Party'],
        },
        condition: {
            type: String,
            required: [true, 'Condition is required'],
            enum: ['brand-new', 'like-new', 'good', 'fair'],
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
        image: {
            type: String,
            required: [true, 'Item image is required'],
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
        }
    },
    {
        timestamps: true,
    }
);

// Virtuals for computed payouts
listingSchema.virtual('commission').get(function() {
    return Math.round(this.price * 0.02);
});

listingSchema.virtual('securityDeposit').get(function() {
    return Math.round(this.price * 0.10);
});

listingSchema.set('toJSON', { virtuals: true });
listingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Listing', listingSchema);
