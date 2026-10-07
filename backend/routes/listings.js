const express = require('express');
const {
    getListings,
    getMyListings,
    getListing,
    createListing,
    updateListing,
    deleteListing
} = require('../controllers/listingController');

const auth = require('../middleware/auth');
const { listingUpload } = require('../middleware/upload');

const router = express.Router();

router.route('/')
    .get(getListings)
    .post(auth, listingUpload.single('image'), createListing);

router.route('/my')
    .get(auth, getMyListings);

router.route('/:id')
    .get(getListing)
    .put(auth, listingUpload.single('image'), updateListing)
    .delete(auth, deleteListing);

module.exports = router;
