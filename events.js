const express = require('express');
const router = express.Router();
const Event = require('../models/Event');
const Notification = require('../models/Notification');
const { authenticate, requireRole } = require('../middleware/auth');
const { validateEvent } = require('../middleware/validate');

// GET /api/events - List all events (public)
router.get('/', async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 }).populate('createdBy', 'name');
        res.json(events);
    } catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({ error: 'Failed to fetch events.' });
    }
});

// GET /api/events/:id - Get single event
router.get('/:id', async (req, res) => {
    try {
        const event = await Event.findById(req.params.id).populate('createdBy', 'name');
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch event.' });
    }
});

// POST /api/events - Create event (admin only)
router.post('/', authenticate, requireRole('admin'), validateEvent, async (req, res) => {
    try {
        const { title, description, eventDate, dueDate, totalSeats, entryFee, imageUrl, additionalImages } = req.body;

        const event = new Event({
            title,
            description,
            eventDate,
            dueDate,
            totalSeats: parseInt(totalSeats),
            seatsLeft: parseInt(totalSeats),
            entryFee: parseFloat(entryFee) || 0,
            imageUrl: imageUrl || '',
            additionalImages: additionalImages || [],
            createdBy: req.user._id
        });

        await event.save();

        // Create notification
        await Notification.create({
            title: `New Event: ${title}`,
            message: `Registrations are open! Due date: ${new Date(dueDate).toLocaleDateString('en-IN')}. Total seats: ${totalSeats}`,
            type: 'info'
        });

        res.status(201).json(event);
    } catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({ error: 'Failed to create event.' });
    }
});

// PUT /api/events/:id - Update event (admin only)
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        const { title, description, eventDate, dueDate, totalSeats, entryFee, imageUrl, additionalImages } = req.body;

        // Recalculate seatsLeft if totalSeats changed
        const oldTotal = event.totalSeats;
        const newTotal = parseInt(totalSeats);
        const seatsDiff = newTotal - oldTotal;
        let newSeatsLeft = event.seatsLeft + seatsDiff;
        if (newSeatsLeft < 0) newSeatsLeft = 0;

        event.title = title || event.title;
        event.description = description || event.description;
        event.eventDate = eventDate || event.eventDate;
        event.dueDate = dueDate || event.dueDate;
        event.totalSeats = newTotal;
        event.seatsLeft = newSeatsLeft;
        event.entryFee = parseFloat(entryFee) >= 0 ? parseFloat(entryFee) : event.entryFee;
        event.imageUrl = imageUrl !== undefined ? imageUrl : event.imageUrl;
        event.additionalImages = additionalImages !== undefined ? additionalImages : event.additionalImages;

        await event.save();
        res.json(event);
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ error: 'Failed to update event.' });
    }
});

// DELETE /api/events/:id - Delete event (admin only)
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const event = await Event.findByIdAndDelete(req.params.id);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }
        res.json({ message: 'Event deleted successfully.' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete event.' });
    }
});

module.exports = router;
