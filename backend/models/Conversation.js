'use strict';

const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
    {
        participants: {
            type: [{
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
                required: true
            }],
            required: true,
            validate: {
                validator: function (val) {
                    if (!val || val.length !== 2) return false;
                    const id1 = val[0].toString();
                    const id2 = val[1].toString();
                    return id1 !== id2;
                },
                message: 'A conversation must have exactly two distinct participants.'
            }
        },
        booking: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Booking',
            required: true,
            unique: true
        },
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            default: null
        },
        lastMessageAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

conversationSchema.index({ participants: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
