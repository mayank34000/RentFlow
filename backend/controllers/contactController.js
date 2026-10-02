'use strict';

const ContactMessage = require('../models/ContactMessage');

exports.createContactMessage = async (req, res) => {
    try {
        const { name, email, message } = req.body;

        // Validate name
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return res.status(400).json({ success: false, message: 'Name is required and cannot be empty.' });
        }
        if (name.trim().length > 100) {
            return res.status(400).json({ success: false, message: 'Name cannot exceed 100 characters.' });
        }

        // Validate email
        if (!email || typeof email !== 'string' || email.trim() === '') {
            return res.status(400).json({ success: false, message: 'Email is required.' });
        }
        const emailRegex = /^\S+@\S+\.\S+$/;
        if (!emailRegex.test(email.trim().toLowerCase())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }
        if (email.trim().length > 255) {
            return res.status(400).json({ success: false, message: 'Email cannot exceed 255 characters.' });
        }

        // Validate message
        if (!message || typeof message !== 'string' || message.trim() === '') {
            return res.status(400).json({ success: false, message: 'Message is required and cannot be empty.' });
        }
        if (message.trim().length > 2000) {
            return res.status(400).json({ success: false, message: 'Message cannot exceed 2000 characters.' });
        }

        // Create ContactMessage (only uses name, email, and message)
        const newContactMessage = new ContactMessage({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            message: message.trim()
        });

        const savedMessage = await newContactMessage.save();

        return res.status(201).json({
            success: true,
            data: savedMessage
        });
    } catch (error) {
        // Do not expose stack traces or Mongo internals
        return res.status(500).json({
            success: false,
            message: 'Failed to submit contact message'
        });
    }
};
