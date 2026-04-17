const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');
const { decrypt } = require('../utils/crypto');

// POST /api/qr/verify - Scan and verify a QR code
router.post('/verify', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const { qrData } = req.body;

        if (!qrData) {
            return res.status(400).json({ 
                valid: false, 
                error: 'No QR data provided.' 
            });
        }

        // Decrypt QR data
        const decrypted = decrypt(qrData);
        if (!decrypted) {
            return res.status(400).json({ 
                valid: false, 
                error: 'Invalid QR code. Could not decrypt data.' 
            });
        }

        let payload;
        try {
            payload = JSON.parse(decrypted);
        } catch {
            return res.status(400).json({ 
                valid: false, 
                error: 'Invalid QR code format.' 
            });
        }

        // Find registration by QR data
        const registration = await Registration.findOne({ qrData })
            .populate('eventId', 'title eventDate')
            .populate('studentId', 'name email department');

        if (!registration) {
            return res.status(404).json({ 
                valid: false, 
                error: 'Ticket not found in system.' 
            });
        }

        // Check if already used (duplicate entry prevention)
        if (registration.qrUsed) {
            return res.status(400).json({
                valid: false,
                error: 'Ticket already used!',
                duplicate: true,
                usedAt: registration.qrUsedAt,
                student: registration.studentId?.name || 'Unknown',
                event: registration.eventId?.title || 'Unknown'
            });
        }

        // Check payment status
        if (registration.paymentStatus !== 'paid' && registration.paymentStatus !== 'free') {
            return res.status(400).json({
                valid: false,
                error: 'Payment not completed for this ticket.',
                paymentStatus: registration.paymentStatus
            });
        }

        // Mark QR as used
        registration.qrUsed = true;
        registration.qrUsedAt = new Date();
        await registration.save();

        res.json({
            valid: true,
            message: 'Ticket verified successfully! Entry granted.',
            student: {
                name: registration.studentId?.name,
                email: registration.studentId?.email,
                department: registration.studentId?.department
            },
            event: {
                title: registration.eventId?.title,
                date: registration.eventId?.eventDate
            },
            paymentStatus: registration.paymentStatus,
            registeredAt: registration.createdAt
        });
    } catch (error) {
        console.error('QR verify error:', error);
        res.status(500).json({ valid: false, error: 'Verification failed.' });
    }
});

// GET /api/qr/download/:registrationId - Download QR code image
router.get('/download/:registrationId', authenticate, async (req, res) => {
    try {
        const registration = await Registration.findById(req.params.registrationId);

        if (!registration) {
            return res.status(404).json({ error: 'Registration not found.' });
        }

        // User can only download their own QR, admins can download any
        if (req.user.role !== 'admin' && registration.studentId.toString() !== req.user._id.toString()) {
            return res.status(403).json({ error: 'Access denied.' });
        }

        if (!registration.qrCode) {
            return res.status(404).json({ error: 'QR code not found.' });
        }

        // Send QR code as base64 JSON (frontend handles download)
        res.json({ qrCode: registration.qrCode });
    } catch (error) {
        res.status(500).json({ error: 'Failed to download QR code.' });
    }
});

module.exports = router;
