'use strict';

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const chatAuth = require('../middleware/chatAuth');

// Apply auth to all chat routes
router.use(chatAuth);

router.post('/conversations', chatController.getOrCreateConversation);
router.get('/conversations', chatController.getMyConversations);
router.get('/conversations/:id/messages', chatController.getConversationMessages);

module.exports = router;
