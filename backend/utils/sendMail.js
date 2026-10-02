'use strict';

const nodemailer = require('nodemailer');

/**
 * Sends an email using Nodemailer.
 * 
 * @param {Object} options - Mail options: { to, subject, text }
 * @param {Object} [transporterOverride] - Optional transporter for tests.
 * @returns {Promise<Object>} - { sent: boolean, reason?: string }
 */
let warnedMissingConfig = false;

exports.sendMail = async (options, transporterOverride = null) => {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM } = process.env;

    // Use override if provided; otherwise check config
    if (!transporterOverride) {
        if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS || !MAIL_FROM) {
            if (!warnedMissingConfig) {
                console.warn('[Mail] SMTP configuration is missing. Emails will not be sent.');
                warnedMissingConfig = true;
            }
            return { sent: false, reason: 'not_configured' };
        }
    }

    let transporter = transporterOverride;

    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: SMTP_HOST,
            port: Number(SMTP_PORT),
            secure: Number(SMTP_PORT) === 465,
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASS
            },
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 10000
        });
    }

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || 'no-reply@rentflow.com',
            to: options.to,
            subject: options.subject,
            text: options.text
        });
        return { sent: true };
    } catch (err) {
        console.error('[Mail] Failed to send email (SMTP error).');
        return { sent: false, reason: 'send_failed' };
    }
};
