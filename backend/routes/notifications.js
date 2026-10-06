'use strict';

const express = require('express');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const authenticateToken = require('../middleware/authMiddleware');

/*
 * All notification routes require authentication.
 */
router.use(authenticateToken);

/*
 * Get notifications for the logged-in user
 */
router.get('/', notificationController.getMyNotifications);

/*
 * Mark all notifications as read
 */
router.put('/read-all', notificationController.markAllRead);

/*
 * Mark one notification as read
 */
router.put('/:id/read', notificationController.markRead);

module.exports = router;