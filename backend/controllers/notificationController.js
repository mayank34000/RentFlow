const mongoose = require('mongoose');
const Notification = require('../models/Notification');

/*
 * GET /api/notifications
 * Get notifications for the logged-in user
 */
exports.getMyNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({
            user: req.user._id,
        })
            .sort({ createdAt: -1 })
            .limit(50)
            .lean();

        return res.status(200).json({
            success: true,
            data: notifications,
        });
    } catch (err) {
        console.error('[Notifications] Get error:', err);

        return res.status(500).json({
            success: false,
            message: 'Unable to load notifications.',
        });
    }
};


/*
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
exports.markAllRead = async (req, res) => {
    try {
        await Notification.updateMany(
            {
                user: req.user._id,
                read: false,
            },
            {
                $set: {
                    read: true,
                },
            }
        );

        return res.status(200).json({
            success: true,
            message: 'All notifications marked as read.',
        });
    } catch (err) {
        console.error('[Notifications] Mark all read error:', err);

        return res.status(500).json({
            success: false,
            message: 'Unable to mark notifications as read.',
        });
    }
};


/*
 * PUT /api/notifications/:id/read
 * Mark one notification as read
 */
exports.markRead = async (req, res) => {
    try {
        const notificationId = req.params.id;

        if (
            !mongoose.Types.ObjectId.isValid(notificationId)
        ) {
            return res.status(400).json({
                success: false,
                message: 'Invalid notification ID.',
            });
        }

        const notification = await Notification.findOne({
            _id: notificationId,
            user: req.user._id,
        });

        if (!notification) {
            return res.status(404).json({
                success: false,
                message: 'Notification not found.',
            });
        }

        notification.read = true;
        await notification.save();

        return res.status(200).json({
            success: true,
            message: 'Notification marked as read.',
        });
    } catch (err) {
        console.error('[Notifications] Mark read error:', err);

        return res.status(500).json({
            success: false,
            message: 'Unable to mark notification as read.',
        });
    }
};


/*
 * Helper used by other backend controllers
 * to create a notification.
 */
exports.createNotification = async ({
    userId,
    type,
    title,
    text,
    link = '',
}) => {
    try {
        if (!userId || !type || !title || !text) {
            throw new Error('Missing notification fields.');
        }

        return await Notification.create({
            user: userId,
            type,
            title,
            text,
            link,
        });
    } catch (err) {
        console.error('[Notifications] Create error:', err);
        throw err;
    }
};