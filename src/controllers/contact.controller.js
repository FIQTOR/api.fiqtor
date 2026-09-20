const { messagingService } = require('../services/contact.service');

/**
 * POST /api/v1/contact/send
 * Validates the payload and delivers the message via the messaging service
 * (WhatsApp first, email fallback).
 */
async function sendContactMessage(req, res) {
    try {
        const { name, email, message } = req.body || {};
        if (!name || !email || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Name, email, and message are required.',
            });
        }

        const result = await messagingService(req.body);
        return res.status(200).json({
            status: 'success',
            message: `Message sent via ${result.provider}`,
            data: result.info,
        });
    } catch (error) {
        console.error('Contact Form Error:', error.message);
        return res.status(500).json({
            status: 'error',
            message: 'Failed to send message.',
        });
    }
}

module.exports = { sendContactMessage };
