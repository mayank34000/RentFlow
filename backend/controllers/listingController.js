'use strict';

const Listing = require('../models/Listing');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const cloudinary = require('../config/cloudinary');
const { MAX_VIDEO_SIZE_BYTES, MAX_VIDEO_SIZE_MB, MAX_IMAGE_SIZE_BYTES } = require('../middleware/upload');

function safeUnlink(filePath) {
    if (filePath && fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (_e) {}
    }
}

function checkCloudinaryConfig() {
    return Boolean(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
    );
}

let cachedCatalog = null;

function getCatalogProducts() {
    if (cachedCatalog) return cachedCatalog;
    try {
        const primaryPath = path.resolve(__dirname, '../data/products.json');
        const fallbackPath = path.resolve(__dirname, '../../frontend/react/public/js/products.json');
        const targetPath = fs.existsSync(primaryPath) ? primaryPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

        if (targetPath) {
            const raw = fs.readFileSync(targetPath, 'utf8');
            const data = JSON.parse(raw);
            const CONDITIONS = [
                { condition: 'like-new', conditionLabel: 'Like New' },
                { condition: 'brand-new', conditionLabel: 'Brand New' },
                { condition: 'good', conditionLabel: 'Good Condition' }
            ];

            cachedCatalog = data.map((item, index) => {
                let category = item.category;
                if (category === 'Real Estate' || category === 'Furniture') category = 'Property';
                if (category === 'Equipment') category = 'Tools';
                if (category === 'Party') category = 'Sports';

                const condTier = CONDITIONS[index % CONDITIONS.length];
                const num = parseInt(String(item.id).replace(/\D/g, ''), 10) || (index + 1);
                // 24-character hex ID compatible with ObjectId format
                const mongoHexId = '00000000000000000000' + num.toString(16).padStart(4, '0');

                return {
                    _id: mongoHexId,
                    id: item.id || mongoHexId,
                    title: item.title,
                    category,
                    price: Number(item.price),
                    period: item.period || 'day',
                    description: item.description || '',
                    condition: item.condition || condTier.condition,
                    conditionLabel: item.conditionLabel || condTier.conditionLabel,
                    categorySpecs: item.categorySpecs || {},
                    city: (item.seller && (item.seller.city || item.seller.address)) || 'Delhi NCR',
                    image: (Array.isArray(item.images) && item.images[0]) || item.image || '',
                    images: Array.isArray(item.images) ? item.images : (item.image ? [item.image] : []),
                    seller: item.seller || {
                        name: 'Verified Owner',
                        phone: '+91 98765 43210',
                        city: 'Delhi NCR',
                        address: 'Delhi NCR'
                    },
                    owner: {
                        _id: '000000000000000000000000',
                        name: item.seller?.name || 'Verified Owner',
                        phone: item.seller?.phone || '',
                        city: item.seller?.city || 'Delhi NCR',
                        avatar: ''
                    },
                    status: 'Active',
                    isBooked: !!item.isBooked,
                    viewsCount: item.viewsCount || 0,
                    inquiriesCount: item.inquiriesCount || 0,
                    createdAt: item.createdAt || new Date(Date.now() - (index * 3600000)).toISOString()
                };
            });
            return cachedCatalog;
        }
    } catch (e) {
        console.error('Failed to load catalog products:', e);
    }
    return [];
}

// @route   GET /api/listings
// @desc    Get all active listings
// @access  Public
exports.getListings = async (req, res, next) => {
    try {
        const query = { status: 'Active' };

        // Type coercion / Injection protection
        if (typeof req.query.category === 'object' || typeof req.query.city === 'object' || typeof req.query.search === 'object') {
            return res.status(400).json({ success: false, message: 'Invalid query parameters' });
        }

        const categoryFilter = req.query.category && req.query.category !== 'All' ? req.query.category.trim() : null;

        // Basic filtering for MongoDB
        if (categoryFilter) {
            const catLower = categoryFilter.toLowerCase();
            let matchedCats = [categoryFilter];
            if (catLower === 'property') matchedCats.push('Furniture', 'Real Estate');
            if (catLower === 'tools') matchedCats.push('Equipment');
            if (catLower === 'sports') matchedCats.push('Party');

            const regexList = matchedCats.map(c => new RegExp(`^${c}$`, 'i'));
            query.category = { $in: regexList };
        }

        if (req.query.condition && req.query.condition !== 'All') {
            query.condition = req.query.condition;
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

        // Sorting: User-created listings (isCatalog: false) come first directly in the DB query
        let sortOption = { isCatalog: 1, createdAt: -1 };
        if (req.query.sortBy === 'price_asc' || req.query.sortBy === 'price-low') {
            sortOption = { isCatalog: 1, price: 1 };
        } else if (req.query.sortBy === 'price_desc' || req.query.sortBy === 'price-high') {
            sortOption = { isCatalog: 1, price: -1 };
        } else if (req.query.sortBy === 'oldest') {
            sortOption = { isCatalog: 1, createdAt: 1 };
        }

        let dbListings = [];
        try {
            if (mongoose.connection.readyState === 1) {
                const docs = await Listing.find(query)
                    .populate('owner', 'name phone city avatar profileImage')
                    .sort(sortOption);

                dbListings = docs.map(doc => {
                const listing = doc.toJSON();
                // Lazy normalization of category for display
                if (listing.category === 'Furniture') listing.category = 'Property';
                if (listing.category === 'Equipment') listing.category = 'Tools';
                if (listing.category === 'Party') listing.category = 'Sports';

                const isOwner = req.user && req.user.id === (listing.owner?._id || '').toString();
                const isPro = req.user && req.user.isPro;
                if (!isPro && !isOwner && listing.owner) {
                    delete listing.owner.phone;
                }
                return listing;
                });
            }
        } catch (dbErr) {
            console.error('Error fetching MongoDB listings:', dbErr);
        }

        // Load catalog products
        const catalog = getCatalogProducts();

        // Filter catalog items
        const filteredCatalog = catalog.filter(item => {
            if (categoryFilter) {
                const catLower = categoryFilter.toLowerCase();
                const itemCatLower = (item.category || '').toLowerCase();
                const matchesCat = itemCatLower === catLower ||
                    (catLower === 'property' && (itemCatLower === 'real estate' || itemCatLower === 'furniture')) ||
                    (catLower === 'tools' && itemCatLower === 'equipment') ||
                    (catLower === 'sports' && itemCatLower === 'party');
                if (!matchesCat) return false;
            }

            if (req.query.condition && req.query.condition !== 'All') {
                if (item.condition !== req.query.condition) return false;
            }

            if (req.query.city) {
                const cityQuery = req.query.city.trim().toLowerCase();
                const itemCity = (item.city || (item.seller && item.seller.city) || '').toLowerCase();
                if (!itemCity.includes(cityQuery)) return false;
            }

            if (req.query.search) {
                const s = req.query.search.trim().toLowerCase();
                const title = (item.title || '').toLowerCase();
                const desc = (item.description || '').toLowerCase();
                const city = (item.city || (item.seller && item.seller.city) || '').toLowerCase();
                const cat = (item.category || '').toLowerCase();
                if (!title.includes(s) && !desc.includes(s) && !city.includes(s) && !cat.includes(s)) {
                    return false;
                }
            }

            if (req.query.minPrice !== undefined && item.price < Number(req.query.minPrice)) {
                return false;
            }
            if (req.query.maxPrice !== undefined && item.price > Number(req.query.maxPrice)) {
                return false;
            }

            return true;
        });

        // Phone privacy for catalog items
        const isPro = req.user && req.user.isPro;
        const processedCatalog = filteredCatalog.map(item => {
            const clone = { ...item };
            if (!isPro && clone.seller) {
                clone.seller = { ...clone.seller, phone: '' };
            }
            return clone;
        });

        // Combine and deduplicate: user listings (MongoDB) first, then catalog listings
        const seenSignatures = new Set();
        const combined = [];

        for (const item of dbListings) {
            const sig = `${(item.title || '').trim().toLowerCase()}|${(item.category || '').toLowerCase()}`;
            if (!seenSignatures.has(sig)) {
                seenSignatures.add(sig);
                combined.push(item);
            }
        }

        for (const item of processedCatalog) {
            const sig = `${(item.title || '').trim().toLowerCase()}|${(item.category || '').toLowerCase()}`;
            if (!seenSignatures.has(sig)) {
                seenSignatures.add(sig);
                combined.push(item);
            }
        }

        // Apply sorting to combined results
        if (req.query.sortBy === 'price_asc' || req.query.sortBy === 'price-low') {
            combined.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
        } else if (req.query.sortBy === 'price_desc' || req.query.sortBy === 'price-high') {
            combined.sort((a, b) => (Number(b.price) || 0) - (Number(a.price) || 0));
        } else if (req.query.sortBy === 'oldest') {
            combined.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
        }

        res.status(200).json({
            success: true,
            count: combined.length,
            data: combined
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
        let listing = null;

        if (mongoose.connection.readyState === 1 && mongoose.Types.ObjectId.isValid(req.params.id)) {
            const listingDoc = await Listing.findById(req.params.id)
                .populate('owner', 'name phone city avatar profileImage');

            if (listingDoc) {
                listing = listingDoc.toJSON();
            }
        }

        if (!listing) {
            const catalog = getCatalogProducts();
            const foundCatalog = catalog.find(item => item.id === req.params.id || item._id === req.params.id);
            if (foundCatalog) {
                listing = { ...foundCatalog };
            }
        }

        if (!listing) {
            return res.status(404).json({ success: false, message: 'Listing not found' });
        }

        if (listing.category === 'Furniture') listing.category = 'Property';
        if (listing.category === 'Equipment') listing.category = 'Tools';
        if (listing.category === 'Party') listing.category = 'Sports';

        const isOwner = req.user && listing.owner && req.user.id === (listing.owner._id || '').toString();
        const isPro = req.user && req.user.isPro;
        if (!isPro && !isOwner) {
            if (listing.owner) delete listing.owner.phone;
            if (listing.seller && listing.seller.phone) {
                listing.seller = { ...listing.seller, phone: '' };
            }
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
// Media Storage Architecture Confirmation:
// Uploaded photos and condition videos are hosted on Cloudinary's secure CDN.
// MongoDB stores the direct, public HTTPS URLs ('image' and 'video').
// Anyone copying these URLs from MongoDB into a web browser address bar
// can open and view them immediately and safely over HTTPS without extra auth.
exports.createListing = async (req, res, next) => {
    const imageFile = (req.files && req.files.image && req.files.image[0]) || req.file;
    const videoFile = (req.files && req.files.video && req.files.video[0]) || null;

    let uploadedImagePublicId = null;
    let uploadedVideoPublicId = null;

    try {
        if (!imageFile) {
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(400).json({ success: false, message: 'Please upload an image' });
        }

        // Validate image size (5 MB)
        if (imageFile.size > MAX_IMAGE_SIZE_BYTES) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(400).json({ success: false, message: 'Image file size cannot exceed 5 MB' });
        }

        // Validate video if provided
        if (videoFile) {
            if (videoFile.size > MAX_VIDEO_SIZE_BYTES) {
                safeUnlink(imageFile.path);
                safeUnlink(videoFile.path);
                return res.status(400).json({ success: false, message: `Video size cannot exceed ${MAX_VIDEO_SIZE_MB} MB` });
            }

            const allowedVideoMimes = ['video/mp4', 'video/quicktime'];
            const allowedVideoExts = ['.mp4', '.mov'];
            const videoExt = path.extname(videoFile.originalname || videoFile.filename).toLowerCase();
            if (!allowedVideoMimes.includes(videoFile.mimetype) || !allowedVideoExts.includes(videoExt)) {
                safeUnlink(imageFile.path);
                safeUnlink(videoFile.path);
                return res.status(400).json({ success: false, message: 'Only MP4 and MOV videos are allowed' });
            }
        }

        const {
            title, category, condition, conditionLabel, categorySpecs, price, period, description, amenities, city
        } = req.body;

        if (!title || !title.trim()) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(400).json({ success: false, message: 'Listing title is required' });
        }

        if (!category || !category.trim()) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(400).json({ success: false, message: 'Category is required' });
        }

        if (!condition || !condition.trim()) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(400).json({ success: false, message: 'Condition is required' });
        }

        if (price === undefined || isNaN(Number(price)) || Number(price) < 10) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(400).json({ success: false, message: 'Price must be a valid number of at least 10' });
        }

        if (req.body.phone) {
            const cleanPhone = String(req.body.phone).replace(/\D/g, '');
            if (cleanPhone.length !== 10) {
                safeUnlink(imageFile.path);
                if (videoFile) safeUnlink(videoFile.path);
                return res.status(400).json({ success: false, message: 'Contact phone number must be of exactly 10 digits, not more or less than that' });
            }
            if (req.user && req.user._id) {
                await User.findByIdAndUpdate(req.user._id, { phone: cleanPhone });
            }
        }

        // Parse amenities if it's sent as a stringified array
        let parsedAmenities = [];
        if (amenities) {
            try {
                parsedAmenities = JSON.parse(amenities);
            } catch (e) {
                parsedAmenities = typeof amenities === 'string' ? amenities.split(',') : amenities;
            }
        }

        // Parse categorySpecs if provided
        let parsedSpecs = {};
        if (categorySpecs) {
            try {
                parsedSpecs = typeof categorySpecs === 'string' ? JSON.parse(categorySpecs) : categorySpecs;
            } catch (e) {
                parsedSpecs = {};
            }
        }

        // Duplicate prevention: check for existing active listing with identical specifications
        const trimmedTitle = (title || '').trim();
        const safeTitle = trimmedTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const existingDuplicate = await Listing.findOne({
            status: 'Active',
            category: { $regex: new RegExp(`^${(category || '').trim()}$`, 'i') },
            price: Number(price),
            title: { $regex: new RegExp(`^${safeTitle}$`, 'i') }
        });

        if (existingDuplicate) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(409).json({
                success: false,
                message: 'A listing with the same specifications (title, category, and price) already exists.'
            });
        }

        // Verify Cloudinary configuration exists
        if (!checkCloudinaryConfig()) {
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(500).json({
                success: false,
                message: 'Cloudinary configuration is missing on server. Unable to upload listing media.'
            });
        }

        // Upload image to Cloudinary
        let imageUploadResult;
        try {
            imageUploadResult = await cloudinary.uploader.upload(imageFile.path, {
                folder: 'rentflow/listings/images',
                resource_type: 'image'
            });
            uploadedImagePublicId = imageUploadResult.public_id;
        } catch (imgErr) {
            console.error('[Listing] Image upload error:', imgErr);
            safeUnlink(imageFile.path);
            if (videoFile) safeUnlink(videoFile.path);
            return res.status(500).json({
                success: false,
                message: 'Failed to upload image to cloud storage. Please try again.'
            });
        }

        // Upload video to Cloudinary if provided
        let videoUploadResult = null;
        if (videoFile) {
            try {
                videoUploadResult = await cloudinary.uploader.upload(videoFile.path, {
                    resource_type: 'video',
                    folder: 'rentflow/listings/videos',
                });
                uploadedVideoPublicId = videoUploadResult.public_id;
            } catch (uploadErr) {
                console.error('[Listing] Video upload error:', uploadErr);
                safeUnlink(imageFile.path);
                safeUnlink(videoFile.path);
                // Rollback uploaded image immediately
                if (uploadedImagePublicId) {
                    try {
                        await cloudinary.uploader.destroy(uploadedImagePublicId, { resource_type: 'image' });
                    } catch (destroyErr) {
                        console.error('[Listing] Failed to rollback image asset:', destroyErr);
                    }
                }
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload video to cloud storage. Please try again.'
                });
            }
        }

        // Create listing in database
        let listing;
        try {
            listing = await Listing.create({
                title,
                category,
                condition,
                conditionLabel: conditionLabel || '',
                categorySpecs: parsedSpecs,
                price: Number(price),
                period: period || 'day',
                description: description || '',
                amenities: parsedAmenities,
                city,
                owner: req.user._id,
                image: imageUploadResult.secure_url,
                imagePublicId: imageUploadResult.public_id,
                video: videoUploadResult ? videoUploadResult.secure_url : null,
                videoPublicId: videoUploadResult ? videoUploadResult.public_id : null,
                videoFormat: videoUploadResult ? videoUploadResult.format : null,
                videoDuration: videoUploadResult ? (videoUploadResult.duration || null) : null,
                status: 'Active'
            });
        } catch (dbErr) {
            console.error('[Listing] Database create error:', dbErr);
            // Rollback: delete uploaded assets from Cloudinary
            if (uploadedImagePublicId) {
                try {
                    await cloudinary.uploader.destroy(uploadedImagePublicId, { resource_type: 'image' });
                } catch (destroyErr) {
                    console.error('[Listing] Failed to delete rolled-back image asset:', destroyErr);
                }
            }
            if (uploadedVideoPublicId) {
                try {
                    await cloudinary.uploader.destroy(uploadedVideoPublicId, { resource_type: 'video' });
                } catch (destroyErr) {
                    console.error('[Listing] Failed to delete rolled-back video asset:', destroyErr);
                }
            }
            return next(dbErr);
        }

        res.status(201).json({
            success: true,
            data: listing
        });
    } catch (err) {
        next(err);
    } finally {
        if (imageFile) safeUnlink(imageFile.path);
        if (videoFile) safeUnlink(videoFile.path);
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

        const { title, category, condition, conditionLabel, categorySpecs, price, period, description, amenities, city } = req.body;

        // Editable fields explicitly mapped (prevents mass assignment of owner/status)
        if (title) listing.title = title;
        if (category) listing.category = category;
        if (condition) listing.condition = condition;
        if (conditionLabel !== undefined) listing.conditionLabel = conditionLabel;
        if (price) listing.price = Number(price);
        if (period) listing.period = period;
        if (description !== undefined) listing.description = description;
        if (city) listing.city = city;

        if (categorySpecs !== undefined) {
            try {
                listing.categorySpecs = typeof categorySpecs === 'string' ? JSON.parse(categorySpecs) : categorySpecs;
            } catch (e) {
                // Keep existing specs if unparseable
            }
        }

        if (amenities) {
            try {
                listing.amenities = JSON.parse(amenities);
            } catch (e) {
                listing.amenities = typeof amenities === 'string' ? amenities.split(',') : amenities;
            }
        }

        const imageFile = (req.files && req.files.image && req.files.image[0]) || req.file;
        if (imageFile) {
            if (!checkCloudinaryConfig()) {
                safeUnlink(imageFile.path);
                return res.status(500).json({
                    success: false,
                    message: 'Cloudinary configuration is missing on server. Unable to upload listing image.'
                });
            }
            try {
                const imageUploadResult = await cloudinary.uploader.upload(imageFile.path, {
                    folder: 'rentflow/listings/images',
                    resource_type: 'image'
                });
                listing.image = imageUploadResult.secure_url;
                listing.imagePublicId = imageUploadResult.public_id;
            } catch (imgErr) {
                console.error('[Listing] Update image upload error:', imgErr);
                safeUnlink(imageFile.path);
                return res.status(500).json({
                    success: false,
                    message: 'Failed to upload image to cloud storage. Please try again.'
                });
            } finally {
                safeUnlink(imageFile.path);
            }
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
