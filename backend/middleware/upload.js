'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');

// Ensure destination directories exist
const uploadDir = path.join(__dirname, '..', 'uploads', 'returns');
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('[Upload] Notice: Could not create upload directory (read-only filesystem):', err.message);
}

const listingUploadDir = path.join(__dirname, '..', 'uploads', 'listings');
try {
    if (!fs.existsSync(listingUploadDir)) {
        fs.mkdirSync(listingUploadDir, { recursive: true });
    }
} catch (err) {
    console.warn('[Upload] Notice: Could not create listing upload directory (read-only filesystem):', err.message);
}

// ── Storage Configuration ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
        // Generate a safe, random filename in temp directory
        const randomHex = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        // Determine extension safely
        let ext = '';
        if (file.mimetype === 'image/jpeg') ext = '.jpg';
        else if (file.mimetype === 'image/png') ext = '.png';
        else if (file.mimetype === 'image/webp') ext = '.webp';
        else {
            const originalExt = path.extname(file.originalname).toLowerCase();
            ext = originalExt;
        }
        cb(null, `return-${timestamp}-${randomHex}${ext}`);
    }
});

// ── File Filter (Image Only) ──────────────────────────────────────────────────

const fileFilter = (req, file, cb) => {
    // Check MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    
    // Check extension
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (allowedMimeTypes.includes(file.mimetype) && allowedExtensions.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('INVALID_FILE_TYPE'), false);
    }
};

// ── Multer Instance ───────────────────────────────────────────────────────────

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
        files: 1 // Only 1 file allowed per request
    }
});

// ── Profile Image Upload ──────────────────────────────────────────────────────

const profileStorage = multer.memoryStorage();

const profileUpload = multer({
    storage: profileStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
        files: 1
    }
});

// ── Listing Image & Video Upload ──────────────────────────────────────────────

const DEFAULT_MAX_VIDEO_SIZE_MB = 100;
const MAX_VIDEO_SIZE_MB = parseInt(process.env.MAX_VIDEO_SIZE_MB, 10) || DEFAULT_MAX_VIDEO_SIZE_MB;
const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

const listingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, os.tmpdir());
    },
    filename: function (req, file, cb) {
        const randomHex = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        let ext = '';
        if (file.mimetype === 'image/jpeg') ext = '.jpg';
        else if (file.mimetype === 'image/png') ext = '.png';
        else if (file.mimetype === 'image/webp') ext = '.webp';
        else if (file.mimetype === 'video/mp4') ext = '.mp4';
        else if (file.mimetype === 'video/quicktime') ext = '.mov';
        else {
            const originalExt = path.extname(file.originalname).toLowerCase();
            ext = originalExt;
        }
        const prefix = file.fieldname === 'video' ? 'listing-video' : 'listing';
        cb(null, `${prefix}-${timestamp}-${randomHex}${ext}`);
    }
});

const listingUpload = multer({
    storage: listingStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5 MB
        files: 1
    }
});

const createListingFileFilter = (req, file, cb) => {
    if (file.fieldname === 'image') {
        const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
        const allowedImageExts = ['.jpeg', '.jpg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedImageMimes.includes(file.mimetype) && allowedImageExts.includes(ext)) {
            return cb(null, true);
        }
        return cb(new Error('INVALID_IMAGE_FILE_TYPE'), false);
    }

    if (file.fieldname === 'video') {
        const allowedVideoMimes = ['video/mp4', 'video/quicktime'];
        const allowedVideoExts = ['.mp4', '.mov'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedVideoMimes.includes(file.mimetype) && allowedVideoExts.includes(ext)) {
            return cb(null, true);
        }
        return cb(new Error('INVALID_VIDEO_FILE_TYPE'), false);
    }

    return cb(new Error('UNEXPECTED_FIELD'), false);
};

const createListingUpload = multer({
    storage: listingStorage,
    fileFilter: createListingFileFilter,
    limits: {
        fileSize: MAX_VIDEO_SIZE_BYTES,
        files: 2
    }
});

module.exports = {
    upload,
    profileUpload,
    listingUpload,
    createListingUpload,
    MAX_VIDEO_SIZE_MB,
    MAX_VIDEO_SIZE_BYTES,
    MAX_IMAGE_SIZE_BYTES
};
