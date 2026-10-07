'use strict';

const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Ensure destination exists just in case
const uploadDir = path.join(__dirname, '..', 'uploads', 'returns');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// ── Storage Configuration ─────────────────────────────────────────────────────

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate a safe, random filename
        const randomHex = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        // Determine extension safely
        let ext = '';
        if (file.mimetype === 'image/jpeg') ext = '.jpg';
        else if (file.mimetype === 'image/png') ext = '.png';
        else if (file.mimetype === 'image/webp') ext = '.webp';
        else {
            // Fallback, though fileFilter should prevent reaching here for invalid types
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

// Listing Image Upload Configuration
const listingUploadDir = path.join(__dirname, '..', 'uploads', 'listings');
if (!fs.existsSync(listingUploadDir)) {
    fs.mkdirSync(listingUploadDir, { recursive: true });
}

const listingStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, listingUploadDir);
    },
    filename: function (req, file, cb) {
        const randomHex = crypto.randomBytes(8).toString('hex');
        const timestamp = Date.now();
        let ext = '';
        if (file.mimetype === 'image/jpeg') ext = '.jpg';
        else if (file.mimetype === 'image/png') ext = '.png';
        else if (file.mimetype === 'image/webp') ext = '.webp';
        else ext = path.extname(file.originalname).toLowerCase();
        cb(null, `listing-${timestamp}-${randomHex}${ext}`);
    }
});

const listingUpload = multer({
    storage: listingStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    }
});

module.exports = {
    upload,
    profileUpload,
    listingUpload
};
