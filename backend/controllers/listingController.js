'use strict';

const Listing = require('../models/Listing');
const mongoose = require('mongoose');

// @route   GET /api/listings
// @desc    Get all active listings
// @access  Public
exports.getListings = async (req, res, next) => {
    try {
        const query = { status: 'Active' };

        // Basic filtering
        if (req.query.category && req.query.category !== 'All') {
            query.category = req.query.category;
        }

        if (req.query.city) {
            query.city = { $regex: new RegExp(`^${req.query.city}$`, 'i') };
        }

        if (req.query.search) {
            // Escape special regex characters in the search string
            const safeSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const searchRegex = new RegExp(safeSearch, 'i');
            query.$or = [
                { title: { $regex: searchRegex } },
                { description: { $regex: searchRegex } },
                { city: { $regex: searchRegex } }
            ];
        }

        if (req.query.minPrice !== undefined || req.query.maxPrice !== undefined) {
            query.price = {};
            if (req.query.minPrice !== undefined) query.price.$gte = Number(req.query.minPrice);
            if (req.query.maxPrice !== undefined) query.price.$lte = Number(req.query.maxPrice);
        }

        const listings = await Listing.find(query)
            .populate('owner', 'name phone city avatar profileImage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings
        });
    } catch (err) {
        next(err);
    }
};

// @route   GET /api/listings/my
// @desc    Get current user's listings
// @access  Private
exports.getMyListings = async (req, res, next) => {
    try {
        const listings = await Listing.find({ owner: req.user._id })
            .populate('owner', 'name phone city avatar profileImage')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: listings.length,
            data: listings
        });
    } catch (err) {
        next(err);
    }
};

// @route   GET /api/listings/:id
// @desc    Get single listing
// @access  Public
exports.getListing = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid listing ID' });
        }

        const listing = await Listing.findById(req.params.id)
            .populate('owner', 'name phone city avatar profileImage');

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        res.status(200).json({
            success: true,
            data: listing
        });
    } catch (err) {
        next(err);
    }
};

// @route   POST /api/listings
// @desc    Create new listing
// @access  Private
exports.createListing = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Please upload an image' });
        }

        const {
            title, category, condition, price, period, description, amenities, city
        } = req.body;

        // Parse amenities if it's sent as a stringified array
        let parsedAmenities = [];
        if (amenities) {
            try {
                parsedAmenities = JSON.parse(amenities);
            } catch (e) {
                parsedAmenities = typeof amenities === 'string' ? amenities.split(',') : amenities;
            }
        }

        const listing = await Listing.create({
            title,
            category,
            condition,
            price: Number(price),
            period,
            description,
            amenities: parsedAmenities,
            city,
            owner: req.user._id,
            image: `/uploads/listings/${req.file.filename}`,
            status: 'Active'
        });

        res.status(201).json({
            success: true,
            data: listing
        });
    } catch (err) {
        next(err);
    }
};

// @route   PUT /api/listings/:id
// @desc    Update listing
// @access  Private
exports.updateListing = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid listing ID' });
        }

        let listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        // Ownership check
        if (listing.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
        }

        const { title, category, condition, price, period, description, amenities, city } = req.body;

        // Editable fields explicitly mapped (prevents mass assignment of owner/status)
        if (title) listing.title = title;
        if (category) listing.category = category;
        if (condition) listing.condition = condition;
        if (price) listing.price = Number(price);
        if (period) listing.period = period;
        if (description !== undefined) listing.description = description;
        if (city) listing.city = city;

        if (amenities) {
            try {
                listing.amenities = JSON.parse(amenities);
            } catch (e) {
                listing.amenities = typeof amenities === 'string' ? amenities.split(',') : amenities;
            }
        }

        if (req.file) {
            listing.image = `/uploads/listings/${req.file.filename}`;
        }

        await listing.save();

        res.status(200).json({
            success: true,
            data: listing
        });
    } catch (err) {
        next(err);
    }
};

// @route   DELETE /api/listings/:id
// @desc    Soft-delete listing
// @access  Private
exports.deleteListing = async (req, res, next) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Invalid listing ID' });
        }

        let listing = await Listing.findById(req.params.id);

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        // Ownership check
        if (listing.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Not authorized to delete this listing' });
        }

        // Soft delete
        listing.status = 'Deleted';
        await listing.save();

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (err) {
        next(err);
    }
};
