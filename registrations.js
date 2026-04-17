const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/registrations/my - Get current student's registrations
router.get('/my', authenticate, async (req, res) => {
    try {
        const registrations = await Registration.find({ studentId: req.user._id })
            .populate('eventId')
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        console.error('Get my registrations error:', error);
        res.status(500).json({ error: 'Failed to fetch registrations.' });
    }
});

// GET /api/registrations/event/:eventId - Admin: get registrations for an event
router.get('/event/:eventId', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const registrations = await Registration.find({ eventId: req.params.eventId })
            .populate('studentId', 'name email phone department username')
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch registrations.' });
    }
});

// GET /api/registrations/all - Admin: get all registrations
router.get('/all', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const registrations = await Registration.find()
            .populate('eventId', 'title eventDate entryFee')
            .populate('studentId', 'name email phone department username')
            .sort({ createdAt: -1 });

        res.json(registrations);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch registrations.' });
    }
});

// GET /api/registrations/check/:eventId - Check if current user is registered
router.get('/check/:eventId', authenticate, async (req, res) => {
    try {
        const reg = await Registration.findOne({
            eventId: req.params.eventId,
            studentId: req.user._id
        });
        res.json({ registered: !!reg });
    } catch (error) {
        res.status(500).json({ error: 'Check failed.' });
    }
});

module.exports = router;
