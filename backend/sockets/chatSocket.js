'use strict';

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');

module.exports = function (io) {
    // ── Authentication Middleware ───────────────────────────────────────────────
    // DEV ONLY: This authentication relies on DEV headers/auth payloads.
    // Replace with real JWT or session validation in production.
    io.use((socket, next) => {
        // Primary: auth.userId, Fallback: headers['x-dev-user-id']
        const userId = socket.handshake.auth?.userId || socket.handshake.headers['x-dev-user-id'];

        if (!userId || typeof userId !== 'string') {
            return next(new Error('Unauthorized'));
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return next(new Error('Unauthorized'));
        }

        // Attach authenticated identity to socket
        socket.user = {
            _id: String(userId),
            role: socket.handshake.auth?.role || 'customer'
        };

        next();
    });

    // Helper for masked logging
    const logDev = (msg) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(msg);
        }
    };
    const maskId = (id) => typeof id === 'string' && id.length > 4 ? `***${id.slice(-4)}` : '***';

    // ── Connection Handling ───────────────────────────────────────────────────
    io.on('connection', (socket) => {
        logDev(`[Socket] User connected: ${maskId(socket.user._id)}`);

        // ── Join Conversation Event ───────────────────────────────────────────
        socket.on('join_conversation', async (payload, callback) => {
            // Ensure callback exists to prevent server crashes if client omitted it
            const cb = typeof callback === 'function' ? callback : () => {};

            try {
                // Support both string payload and { conversationId } object payload
                let conversationId;
                if (typeof payload === 'string') {
                    conversationId = payload;
                } else if (payload && typeof payload === 'object' && typeof payload.conversationId === 'string') {
                    conversationId = payload.conversationId;
                }

                if (!conversationId || !mongoose.Types.ObjectId.isValid(conversationId)) {
                    return cb({ success: false, message: 'Invalid conversation ID' });
                }

                if (mongoose.connection.readyState !== 1) {
                    return cb({ success: false, message: 'Database disconnected' });
                }

                // Look up conversation participants
                const conversation = await Conversation.findById(conversationId)
                    .select('participants')
                    .lean()
                    .exec();

                if (!conversation) {
                    return cb({ success: false, message: 'Conversation not found' });
                }

                // Verify the authenticated socket identity is a participant
                const isParticipant = conversation.participants.some(
                    (p) => String(p) === socket.user._id
                );

                if (!isParticipant) {
                    return cb({ success: false, message: 'Unauthorized' });
                }

                // Join the exact authorized room name
                const roomName = `conversation:${conversationId}`;
                socket.join(roomName);

                logDev(`[Socket] User ${maskId(socket.user._id)} joined ${roomName}`);

                return cb({
                    success: true,
                    conversationId: conversationId,
                    room: roomName
                });

            } catch (err) {
                logDev(`[Socket] Error joining conversation: ${err.message}`);
                return cb({ success: false, message: 'Internal server error' });
            }
        });

        // ── Disconnect Handling ───────────────────────────────────────────────
        socket.on('disconnect', (reason) => {
            logDev(`[Socket] User disconnected: ${maskId(socket.user._id)}`);
        });
    });
};
