'use strict';

const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const Conversation = require('../models/Conversation');
const Message = require('../models/Message');

module.exports = function (io) {
    const presenceMap = new Map();

    // ─────────────────────────────────────────────────────────────────────────────
    // JWT Authentication Middleware
    // ─────────────────────────────────────────────────────────────────────────────

    io.use((socket, next) => {
        try {
            // Frontend should send:
            // io(url, { auth: { token } })

            const token = socket.handshake.auth?.token;

            if (!token || typeof token !== 'string') {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET
            );

            if (!decoded.userId) {
                return next(new Error('Invalid authentication token'));
            }

            if (!mongoose.Types.ObjectId.isValid(decoded.userId)) {
                return next(new Error('Invalid authentication token'));
            }

            // Keep compatibility with the existing chat code.
            socket.user = {
                _id: String(decoded.userId),
                role: decoded.role || 'user'
            };

            next();

        } catch (error) {
            return next(new Error('Invalid or expired authentication token'));
        }
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────────

    const logDev = (msg) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(msg);
        }
    };

    const maskId = (id) =>
        typeof id === 'string' && id.length > 4
            ? `***${id.slice(-4)}`
            : '***';

    // Shared conversation authorization helper
    async function authorizeTask10Event(socket, payload) {
        if (!payload || typeof payload !== 'object') {
            throw new Error('Invalid payload');
        }

        const { conversationId } = payload;

        if (
            !conversationId ||
            typeof conversationId !== 'string' ||
            !mongoose.Types.ObjectId.isValid(conversationId)
        ) {
            throw new Error('Invalid conversation ID');
        }

        const room = `conversation:${conversationId}`;

        if (!socket.rooms.has(room)) {
            throw new Error('Socket not joined to conversation room');
        }

        if (mongoose.connection.readyState !== 1) {
            throw new Error('Database disconnected');
        }

        const conversation = await Conversation.findById(conversationId)
            .select('participants')
            .lean()
            .exec();

        if (!conversation) {
            throw new Error('Conversation not found');
        }

        const isParticipant = conversation.participants.some(
            (p) => String(p) === socket.user._id
        );

        if (!isParticipant) {
            throw new Error('Unauthorized participant');
        }

        return {
            conversationId,
            room,
            conversation
        };
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // Connection Handling
    // ─────────────────────────────────────────────────────────────────────────────

    io.on('connection', (socket) => {
        logDev(
            `[Socket] User connected: ${maskId(socket.user._id)}`
        );

        const userId = socket.user._id;

        // Track user's active socket connections
        if (!presenceMap.has(userId)) {
            presenceMap.set(userId, new Set());
        }

        presenceMap.get(userId).add(socket.id);

        // ─────────────────────────────────────────────────────────────────────────
        // Join Conversation
        // ─────────────────────────────────────────────────────────────────────────

        socket.on('join_conversation', async (payload, callback) => {
            const cb =
                typeof callback === 'function'
                    ? callback
                    : () => {};

            try {
                // Support:
                // join_conversation("conversationId")
                //
                // OR:
                // join_conversation({ conversationId })

                let conversationId;

                if (typeof payload === 'string') {
                    conversationId = payload;
                } else if (
                    payload &&
                    typeof payload === 'object' &&
                    typeof payload.conversationId === 'string'
                ) {
                    conversationId = payload.conversationId;
                }

                if (
                    !conversationId ||
                    !mongoose.Types.ObjectId.isValid(conversationId)
                ) {
                    return cb({
                        success: false,
                        message: 'Invalid conversation ID'
                    });
                }

                if (mongoose.connection.readyState !== 1) {
                    return cb({
                        success: false,
                        message: 'Database disconnected'
                    });
                }

                // Find conversation
                const conversation =
                    await Conversation.findById(conversationId)
                        .select('participants')
                        .lean()
                        .exec();

                if (!conversation) {
                    return cb({
                        success: false,
                        message: 'Conversation not found'
                    });
                }

                // Verify user is a participant
                const isParticipant =
                    conversation.participants.some(
                        (p) => String(p) === socket.user._id
                    );

                if (!isParticipant) {
                    return cb({
                        success: false,
                        message: 'Unauthorized'
                    });
                }

                // Join authorized room
                const roomName =
                    `conversation:${conversationId}`;

                socket.join(roomName);

                logDev(
                    `[Socket] User ${maskId(
                        socket.user._id
                    )} joined ${roomName}`
                );

                // ─────────────────────────────────────────────────────────────
                // Presence
                // ─────────────────────────────────────────────────────────────

                try {
                    const otherParticipant =
                        conversation.participants.find(
                            (p) =>
                                String(p) !== socket.user._id
                        );

                    if (otherParticipant) {
                        const otherIdStr =
                            String(otherParticipant);

                        const isOnline =
                            presenceMap.has(otherIdStr) &&
                            presenceMap.get(otherIdStr).size > 0;

                        socket.emit('presence_state', {
                            conversationId,
                            userId: otherIdStr,
                            online: isOnline
                        });
                    }

                    const socketsInRoom =
                        await io
                            .in(roomName)
                            .fetchSockets();

                    const otherSocketsForUser =
                        socketsInRoom.filter(
                            (s) =>
                                s.user &&
                                s.user._id ===
                                    socket.user._id &&
                                s.id !== socket.id
                        );

                    if (
                        otherSocketsForUser.length === 0
                    ) {
                        socket
                            .to(roomName)
                            .emit('user_online', {
                                conversationId,
                                userId: socket.user._id
                            });
                    }

                } catch (presenceErr) {
                    logDev(
                        '[Socket] presence on join failed'
                    );
                }

                return cb({
                    success: true,
                    conversationId,
                    room: roomName
                });

            } catch (err) {
                logDev(
                    `[Socket] Error joining conversation: ${err.message}`
                );

                return cb({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });

        // ─────────────────────────────────────────────────────────────────────────
        // Send Message
        // ─────────────────────────────────────────────────────────────────────────

        socket.on('send_message', async (payload, callback) => {
            const cb =
                typeof callback === 'function'
                    ? callback
                    : () => {};

            try {
                if (!payload || typeof payload !== 'object') {
                    return cb({
                        success: false,
                        message: 'Invalid payload'
                    });
                }

                const {
                    conversationId,
                    text: rawText
                } = payload;

                if (
                    !conversationId ||
                    typeof conversationId !== 'string' ||
                    !mongoose.Types.ObjectId.isValid(
                        conversationId
                    )
                ) {
                    return cb({
                        success: false,
                        message: 'Invalid conversation ID'
                    });
                }

                if (typeof rawText !== 'string') {
                    return cb({
                        success: false,
                        message: 'Message text must be a string'
                    });
                }

                if (rawText.length > 6000) {
                    return cb({
                        success: false,
                        message: 'Message text too long'
                    });
                }

                const text = rawText.trim();

                if (!text) {
                    return cb({
                        success: false,
                        message: 'Message text cannot be empty'
                    });
                }

                // Verify socket joined the room
                const room =
                    `conversation:${conversationId}`;

                if (!socket.rooms.has(room)) {
                    return cb({
                        success: false,
                        message:
                            'Socket not joined to conversation room'
                    });
                }

                if (mongoose.connection.readyState !== 1) {
                    return cb({
                        success: false,
                        message: 'Database disconnected'
                    });
                }

                // Verify conversation
                const conversation =
                    await Conversation.findById(conversationId)
                        .select('participants')
                        .lean()
                        .exec();

                if (!conversation) {
                    return cb({
                        success: false,
                        message: 'Conversation not found'
                    });
                }

                // Verify participant
                const isParticipant =
                    conversation.participants.some(
                        (p) =>
                            String(p) === socket.user._id
                    );

                if (!isParticipant) {
                    return cb({
                        success: false,
                        message: 'Unauthorized participant'
                    });
                }

                // Save message
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
                                lastMessageAt:
                                    message.createdAt
                            }
                        }
                    );
                } catch (metaErr) {
                    logDev(
                        `[Socket] Safe error: Failed to update conversation metadata: ${metaErr.message}`
                    );
                }

                // Message payload
                const deliveryPayload = {
                    _id: String(message._id),
                    conversation: String(
                        message.conversation
                    ),
                    sender: String(message.sender),
                    text: message.text,
                    createdAt: message.createdAt
                };

                // Send message to everyone in room
                io.to(room).emit(
                    'message',
                    deliveryPayload
                );

                // Acknowledge sender
                return cb({
                    success: true,
                    message: deliveryPayload
                });

            } catch (err) {
                logDev(
                    `[Socket] Error sending message: ${err.message}`
                );

                if (
                    err.name === 'ValidationError'
                ) {
                    return cb({
                        success: false,
                        message:
                            'Message validation failed'
                    });
                }

                return cb({
                    success: false,
                    message: 'Internal server error'
                });
            }
        });

        // ─────────────────────────────────────────────────────────────────────────
        // Mark Messages Read
        // ─────────────────────────────────────────────────────────────────────────

        socket.on('mark_read', async (payload, callback) => {
            const cb =
                typeof callback === 'function'
                    ? callback
                    : () => {};

            try {
                const {
                    conversationId,
                    room
                } = await authorizeTask10Event(
                    socket,
                    payload
                );

                const now = new Date();

                const res =
                    await Message.updateMany(
                        {
                            conversation:
                                new mongoose.Types.ObjectId(
                                    conversationId
                                ),
                            sender: {
                                $ne:
                                    new mongoose.Types.ObjectId(
                                        socket.user._id
                                    )
                            },
                            readAt: null
                        },
                        {
                            $set: {
                                readAt: now
                            }
                        }
                    );

                const modifiedCount =
                    res.modifiedCount;

                if (modifiedCount > 0) {
                    socket
                        .to(room)
                        .emit('messages_read', {
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
                logDev(
                    `[Socket] Error mark_read: ${err.message}`
                );

                return cb({
                    success: false,
                    message:
                        'Internal server error or invalid request'
                });
            }
        });

        // ─────────────────────────────────────────────────────────────────────────
        // Typing Start
        // ─────────────────────────────────────────────────────────────────────────

        socket.on(
            'typing_start',
            async (payload, callback) => {
                const cb =
                    typeof callback === 'function'
                        ? callback
                        : () => {};

                try {
                    const {
                        conversationId,
                        room
                    } = await authorizeTask10Event(
                        socket,
                        payload
                    );

                    socket
                        .to(room)
                        .emit('typing_start', {
                            conversationId,
                            userId:
                                socket.user._id
                        });

                    return cb({
                        success: true
                    });

                } catch (err) {
                    logDev(
                        `[Socket] Error typing_start: ${err.message}`
                    );

                    return cb({
                        success: false,
                        message:
                            'Internal server error or invalid request'
                    });
                }
            }
        );

        // ─────────────────────────────────────────────────────────────────────────
        // Typing Stop
        // ─────────────────────────────────────────────────────────────────────────

        socket.on(
            'typing_stop',
            async (payload, callback) => {
                const cb =
                    typeof callback === 'function'
                        ? callback
                        : () => {};

                try {
                    const {
                        conversationId,
                        room
                    } = await authorizeTask10Event(
                        socket,
                        payload
                    );

                    socket
                        .to(room)
                        .emit('typing_stop', {
                            conversationId,
                            userId:
                                socket.user._id
                        });

                    return cb({
                        success: true
                    });

                } catch (err) {
                    logDev(
                        `[Socket] Error typing_stop: ${err.message}`
                    );

                    return cb({
                        success: false,
                        message:
                            'Internal server error or invalid request'
                    });
                }
            }
        );

        // ─────────────────────────────────────────────────────────────────────────
        // Disconnecting
        // ─────────────────────────────────────────────────────────────────────────

        socket.on('disconnecting', () => {
            const conversationRooms = [];

            for (const room of socket.rooms) {
                if (
                    room.startsWith(
                        'conversation:'
                    )
                ) {
                    conversationRooms.push(room);
                }
            }

            // Stop typing when user disconnects
            for (const room of conversationRooms) {
                const convId =
                    room.split(':')[1];

                if (convId) {
                    socket
                        .to(room)
                        .emit('typing_stop', {
                            conversationId: convId,
                            userId:
                                socket.user._id
                        });
                }
            }

            // Update presence
            const uId = socket.user._id;

            if (presenceMap.has(uId)) {
                const userSockets =
                    presenceMap.get(uId);

                userSockets.delete(socket.id);

                // User is offline only when
                // all their sockets disconnect
                if (userSockets.size === 0) {
                    presenceMap.delete(uId);

                    for (
                        const room of conversationRooms
                    ) {
                        const convId =
                            room.split(':')[1];

                        if (convId) {
                            socket
                                .to(room)
                                .emit(
                                    'user_offline',
                                    {
                                        conversationId:
                                            convId,
                                        userId: uId
                                    }
                                );
                        }
                    }
                }
            }
        });

        // ─────────────────────────────────────────────────────────────────────────
        // Disconnect
        // ─────────────────────────────────────────────────────────────────────────

        socket.on('disconnect', (reason) => {
            logDev(
                `[Socket] User disconnected: ${maskId(
                    socket.user._id
                )}`
            );
        });
    });
};