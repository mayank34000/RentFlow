'use strict';

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Booking = require('../models/Booking');

exports.getOrCreateConversation = async (req, res) => {
    try {
        const { bookingId } = req.body;

        if (typeof bookingId !== 'string') {
            return res.status(400).json({ success: false, message: 'Invalid bookingId.' });
        }

        if (!mongoose.Types.ObjectId.isValid(bookingId)) {
            return res.status(400).json({ success: false, message: 'Invalid bookingId.' });
        }

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        if (booking.status === 'Cancelled' || booking.status === 'Rejected') {
            return res.status(400).json({ success: false, message: 'Cannot start a conversation for cancelled or rejected bookings.' });
        }

        const userId = String(req.user._id);
        const renterId = String(booking.renter);
        const lenderId = String(booking.lender);

        if (userId !== renterId && userId !== lenderId) {
            return res.status(403).json({ success: false, message: 'Unauthorized. Only the renter or lender can access this conversation.' });
        }

        if (renterId === lenderId) {
            return res.status(400).json({ success: false, message: 'Renter and lender cannot be the same user.' });
        }

        let conversation = await Conversation.findOne({ booking: bookingId })
            .populate('participants', 'username name avatar');

        if (conversation) {
            return res.status(200).json({ success: true, data: conversation });
        }

        try {
            conversation = await Conversation.create({
                booking: bookingId,
                participants: [booking.renter, booking.lender]
            });
            // Fetch again to populate
            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'username name avatar');
            return res.status(201).json({ success: true, data: conversation });
        } catch (createErr) {
            if (createErr.code === 11000) {
                // Duplicate key: Another request just created it.
                conversation = await Conversation.findOne({ booking: bookingId })
                    .populate('participants', 'username name avatar');
                return res.status(200).json({ success: true, data: conversation });
            }
            throw createErr;
        }

    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

exports.getMyConversations = async (req, res) => {
    try {
        const userId = req.user._id;

        const conversations = await Conversation.find({ participants: userId })
            .sort({ lastMessageAt: -1 })
            .populate('booking')
            .populate('participants', 'username name avatar')
            .populate('lastMessage');

        const conversationIds = conversations.map(c => c._id);

        let unreadCountsMap = {};
        if (conversationIds.length > 0) {
            const counts = await Message.aggregate([
                {
                    $match: {
                        conversation: { $in: conversationIds },
                        sender: { $ne: new mongoose.Types.ObjectId(userId) },
                        readAt: null
                    }
                },
                {
                    $group: {
                        _id: "$conversation",
                        count: { $sum: 1 }
                    }
                }
            ]);

            counts.forEach(c => {
                unreadCountsMap[String(c._id)] = c.count;
            });
        }

        const data = conversations.map(doc => {
            const conv = doc.toObject ? doc.toObject() : doc;
            conv.unreadCount = unreadCountsMap[String(conv._id)] || 0;
            return conv;
        });

        return res.status(200).json({ success: true, data });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};

exports.getConversationMessages = async (req, res) => {
    try {
        const conversationId = req.params.id;

        if (typeof conversationId !== 'string' || !mongoose.Types.ObjectId.isValid(conversationId)) {
            return res.status(400).json({ success: false, message: 'Invalid conversation ID.' });
        }

        const conversation = await Conversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ success: false, message: 'Conversation not found.' });
        }

        if (!conversation.participants.some(p => String(p) === String(req.user._id))) {
            return res.status(403).json({ success: false, message: 'Unauthorized. You are not a participant of this conversation.' });
        }

        // Pagination setup
        let page = 1;
        let limit = 50;

        if (req.query.page !== undefined) {
            const parsedPage = Number(req.query.page);
            if (!Number.isInteger(parsedPage) || parsedPage < 1) {
                return res.status(400).json({ success: false, message: 'Invalid page parameter.' });
            }
            page = parsedPage;
        }

        if (req.query.limit !== undefined) {
            const parsedLimit = Number(req.query.limit);
            if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
                return res.status(400).json({ success: false, message: 'Invalid limit parameter. Must be an integer between 1 and 100.' });
            }
            limit = parsedLimit;
        }

        const skip = (page - 1) * limit;

        // Fetch limit + 1
        const messages = await Message.find({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit + 1);

        let hasMore = false;
        if (messages.length > limit) {
            hasMore = true;
            messages.pop(); // remove the extra element
        }

        // Reverse to oldest -> newest
        messages.reverse();

        return res.status(200).json({
            success: true,
            data: messages,
            pagination: {
                page,
                limit,
                hasMore
            }
        });
    } catch (err) {
        if (err.name === 'MissingSchemaError') {
            return res.status(503).json({ success: false, message: 'Referenced model not available yet' });
        }
        return res.status(500).json({ success: false, message: err.message || 'Internal server error' });
    }
};
