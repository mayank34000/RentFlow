'use strict';

const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

module.exports = function (io) {
    const presenceMap = new Map();

    // Shared conversation authorization helper
    async function authorizeTask10Event(socket, payload) {
        if (!payload || typeof payload !== 'object') throw new Error('Invalid payload');
        const { conversationId } = payload;
        if (!conversationId || typeof conversationId !== 'string' || !mongoose.Types.ObjectId.isValid(conversationId)) {
            throw new Error('Invalid conversation ID');
        }
        const room = `conversation:${conversationId}`;
        if (!socket.rooms.has(room)) {
            throw new Error('Socket not joined to conversation room');
        }
        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database disconnected');
        }
        const conversation = await Conversation.findById(conversationId).select('participants').lean().exec();
        if (!conversation) throw new Error('Conversation not found');
        const isParticipant = conversation.participants.some(p => String(p) === socket.user._id);
        if (!isParticipant) throw new Error('Unauthorized participant');
        return { conversationId, room, conversation };
    }

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

        const userId = socket.user._id;
        if (!presenceMap.has(userId)) {
            presenceMap.set(userId, new Set());
        }
        presenceMap.get(userId).add(socket.id);


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


                // Task 10: Presence state and user_online on join
                try {
                    const otherParticipant = conversation.participants.find(p => String(p) !== socket.user._id);
                    if (otherParticipant) {
                        const otherIdStr = String(otherParticipant);
                        const isOnline = presenceMap.has(otherIdStr) && presenceMap.get(otherIdStr).size > 0;
                        socket.emit('presence_state', {
                            conversationId,
                            userId: otherIdStr,
                            online: isOnline
                        });
                    }

                    const socketsInRoom = await io.in(roomName).fetchSockets();
                    const otherSocketsForUser = socketsInRoom.filter(
                        s => s.user && s.user._id === socket.user._id && s.id !== socket.id
                    );

                    if (otherSocketsForUser.length === 0) {
                        socket.to(roomName).emit('user_online', {
                            conversationId,
                            userId: socket.user._id
                        });
                    }
                } catch (presenceErr) {
                    logDev('[Socket] presence on join failed');
                }

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

        // ── Send Message Event ────────────────────────────────────────────────
        socket.on('send_message', async (payload, callback) => {
            const cb = typeof callback === 'function' ? callback : () => {};

            try {
                // Payload validation
                if (!payload || typeof payload !== 'object') {
                    return cb({ success: false, message: 'Invalid payload' });
                }

                const { conversationId, text: rawText } = payload;

                if (!conversationId || typeof conversationId !== 'string' || !mongoose.Types.ObjectId.isValid(conversationId)) {
                    return cb({ success: false, message: 'Invalid conversation ID' });
                }

                if (typeof rawText !== 'string') {
                    return cb({ success: false, message: 'Message text must be a string' });
                }

                if (rawText.length > 6000) {
                    return cb({ success: false, message: 'Message text too long' });
                }

                const text = rawText.trim();
                if (!text) {
                    return cb({ success: false, message: 'Message text cannot be empty' });
                }

                // Construct server-side room and verify membership
                const room = `conversation:${conversationId}`;
                if (!socket.rooms.has(room)) {
                    return cb({ success: false, message: 'Socket not joined to conversation room' });
                }

                if (mongoose.connection.readyState !== 1) {
                    return cb({ success: false, message: 'Database disconnected' });
                }

                // Load conversation and verify DB participant membership
                const conversation = await Conversation.findById(conversationId)
                    .select('participants')
                    .lean()
                    .exec();

                if (!conversation) {
                    return cb({ success: false, message: 'Conversation not found' });
                }

                const isParticipant = conversation.participants.some(
                    (p) => String(p) === socket.user._id
                );
                if (!isParticipant) {
                    return cb({ success: false, message: 'Unauthorized participant' });
                }

                // Persist Message
                const message = await Message.create({
                    conversation: conversationId,
                    sender: socket.user._id,
                    text
                });

                // Update conversation metadata
                try {
                    await Conversation.findByIdAndUpdate(
                        conversationId,
                        {
                            $set: {
                                lastMessage: message._id,
                                lastMessageAt: message.createdAt
                            }
                        }
                    );
                } catch (metaErr) {
                    logDev(`[Socket] Safe error: Failed to update conversation metadata: ${metaErr.message}`);
                }

                // Construct payload exactly representing the saved message
                const deliveryPayload = {
                    _id: String(message._id),
                    conversation: String(message.conversation),
                    sender: String(message.sender),
                    text: message.text,
                    createdAt: message.createdAt
                };

                // Emit message
                io.to(room).emit('message', deliveryPayload);

                // Acknowledgement
                return cb({
                    success: true,
                    message: deliveryPayload
                });

            } catch (err) {
                logDev(`[Socket] Error sending message: ${err.message}`);
                if (err.name === 'ValidationError') {
                    return cb({ success: false, message: 'Message validation failed' });
                }
                return cb({ success: false, message: 'Internal server error' });
            }
        });


        // ── Task 10 Events ────────────────────────────────────────────────────
        socket.on('mark_read', async (payload, callback) => {
            const cb = typeof callback === 'function' ? callback : () => {};
            try {
                const { conversationId, room } = await authorizeTask10Event(socket, payload);
                const now = new Date();
                const res = await Message.updateMany(
                    {
                        conversation: new mongoose.Types.ObjectId(conversationId),
                        sender: { $ne: new mongoose.Types.ObjectId(socket.user._id) },
                        readAt: null
                    },
                    {
                        $set: { readAt: now }
                    }
                );

                const modifiedCount = res.modifiedCount;
                if (modifiedCount > 0) {
                    socket.to(room).emit('messages_read', {
                        conversationId,
                        userId: socket.user._id,
                        readAt: now,
                        modifiedCount
                    });
                }

                return cb({
                    success: true,
                    conversationId,
                    modifiedCount
                });
            } catch (err) {
                logDev(`[Socket] Error mark_read: ${err.message}`);
                return cb({ success: false, message: 'Internal server error or invalid request' });
            }
        });

        socket.on('typing_start', async (payload, callback) => {
            const cb = typeof callback === 'function' ? callback : () => {};
            try {
                const { conversationId, room } = await authorizeTask10Event(socket, payload);
                socket.to(room).emit('typing_start', {
                    conversationId,
                    userId: socket.user._id
                });
                return cb({ success: true });
            } catch (err) {
                logDev(`[Socket] Error typing_start: ${err.message}`);
                return cb({ success: false, message: 'Internal server error or invalid request' });
            }
        });

        socket.on('typing_stop', async (payload, callback) => {
            const cb = typeof callback === 'function' ? callback : () => {};
            try {
                const { conversationId, room } = await authorizeTask10Event(socket, payload);
                socket.to(room).emit('typing_stop', {
                    conversationId,
                    userId: socket.user._id
                });
                return cb({ success: true });
            } catch (err) {
                logDev(`[Socket] Error typing_stop: ${err.message}`);
                return cb({ success: false, message: 'Internal server error or invalid request' });
            }
        });

        socket.on('disconnecting', () => {
            const conversationRooms = [];
            for (const r of socket.rooms) {
                if (r.startsWith('conversation:')) {
                    conversationRooms.push(r);
                }
            }

            for (const room of conversationRooms) {
                const convId = room.split(':')[1];
                if (convId) {
                    socket.to(room).emit('typing_stop', {
                        conversationId: convId,
                        userId: socket.user._id
                    });
                }
            }

            const uId = socket.user._id;
            if (presenceMap.has(uId)) {
                const userSockets = presenceMap.get(uId);
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    presenceMap.delete(uId);
                    for (const room of conversationRooms) {
                        const convId = room.split(':')[1];
                        if (convId) {
                            socket.to(room).emit('user_offline', {
                                conversationId: convId,
                                userId: uId
                            });
                        }
                    }
                }
            }
        });

        // ── Disconnect Handling ───────────────────────────────────────────────

        socket.on('disconnect', (reason) => {
            logDev(`[Socket] User disconnected: ${maskId(socket.user._id)}`);
        });
    });
};
