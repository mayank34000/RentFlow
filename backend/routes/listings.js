const express = require('express');
const {
    getListings,
    getMyListings,
    getListing,
    createListing,
    updateListing,
    deleteListing
} = require('../controllers/listingController');

const authenticateToken = require('../middleware/authMiddleware');
const optionalAuth = require('../middleware/optionalAuth');
const { listingUpload } = require('../middleware/upload');

const router = express.Router();

router.route('/')
    .get(optionalAuth, getListings)
    .post(authenticateToken, listingUpload.single('image'), createListing);

router.route('/my')
    .get(authenticateToken, getMyListings);

router.route('/:id')
    .get(optionalAuth, getListing)
    .put(authenticateToken, listingUpload.single('image'), updateListing)
    .delete(authenticateToken, deleteListing);

module.exports = router;
