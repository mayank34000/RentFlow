'use strict';

const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');

// POST /api/contact - Public endpoint
router.post('/', contactController.createContactMessage);

module.exports = router;
