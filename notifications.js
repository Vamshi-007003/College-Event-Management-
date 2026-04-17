const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { authenticate } = require('../middleware/auth');

// GET /api/notifications - Get all notifications
router.get('/', async (req, res) => {
    try {
        const notifications = await Notification.find()
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch notifications.' });
    }
});

// POST /api/notifications - Create notification (admin)
router.post('/', authenticate, async (req, res) => {
    try {
        const { title, message, type } = req.body;
        const notification = await Notification.create({ title, message, type: type || 'info' });
        res.status(201).json(notification);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create notification.' });
    }
});

module.exports = router;
