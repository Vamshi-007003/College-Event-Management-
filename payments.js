const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { authenticate } = require('../middleware/auth');
const { paymentLimiter } = require('../middleware/rateLimiter');
const Event = require('../models/Event');
const Registration = require('../models/Registration');
const Notification = require('../models/Notification');
const { generateQR } = require('../utils/qrGenerator');
const { sendRegistrationConfirmation } = require('../utils/emailService');

// Initialize Razorpay (only if keys are configured)
let razorpayInstance = null;
function getRazorpay() {
    if (razorpayInstance) return razorpayInstance;
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret || keyId === 'rzp_test_YOUR_KEY_ID') {
        return null;
    }
    razorpayInstance = new Razorpay({ key_id: keyId, key_secret: keySecret });
    return razorpayInstance;
}

// POST /api/payments/create-order
router.post('/create-order', authenticate, paymentLimiter, async (req, res) => {
    try {
        const { eventId } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        if (event.seatsLeft <= 0) {
            return res.status(400).json({ error: 'Event is sold out.' });
        }

        // Check duplicate registration
        const existingReg = await Registration.findOne({ eventId, studentId: req.user._id });
        if (existingReg) {
            return res.status(400).json({ error: 'Already registered for this event.' });
        }

        // Free event - skip payment
        if (event.entryFee === 0) {
            return res.json({
                free: true,
                eventId: event._id,
                message: 'Free event - no payment needed'
            });
        }

        const rzp = getRazorpay();
        if (!rzp) {
            // Razorpay not configured - use mock payment
            return res.json({
                mock: true,
                eventId: event._id,
                amount: event.entryFee * 100,
                currency: 'INR',
                message: 'Razorpay not configured. Using mock payment.'
            });
        }

        // Create Razorpay order
        const order = await rzp.orders.create({
            amount: Math.round(event.entryFee * 100), // Amount in paise
            currency: 'INR',
            receipt: `evt_${event._id}_${req.user._id}`,
            notes: {
                eventId: event._id.toString(),
                studentId: req.user._id.toString(),
                eventTitle: event.title
            }
        });

        res.json({
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            keyId: process.env.RAZORPAY_KEY_ID,
            eventTitle: event.title,
            userName: req.user.name,
            userEmail: req.user.email,
            userPhone: req.user.phone
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create payment order.' });
    }
});

// POST /api/payments/verify
router.post('/verify', authenticate, paymentLimiter, async (req, res) => {
    try {
        const { eventId, paymentId, orderId, signature, mock } = req.body;

        const event = await Event.findById(eventId);
        if (!event) {
            return res.status(404).json({ error: 'Event not found.' });
        }

        // Check duplicate
        const existingReg = await Registration.findOne({ eventId, studentId: req.user._id });
        if (existingReg) {
            return res.status(400).json({ error: 'Already registered for this event.' });
        }

        if (event.seatsLeft <= 0) {
            return res.status(400).json({ error: 'Event is sold out.' });
        }

        let paymentStatus = 'paid';
        let verifiedPaymentId = paymentId || '';

        // Verify Razorpay signature (if not mock/free)
        if (!mock && event.entryFee > 0 && orderId && signature) {
            const rzp = getRazorpay();
            if (rzp) {
                const body = orderId + '|' + paymentId;
                const expectedSignature = crypto
                    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                    .update(body)
                    .digest('hex');

                if (expectedSignature !== signature) {
                    return res.status(400).json({ error: 'Payment verification failed. Invalid signature.' });
                }
            }
        }

        if (event.entryFee === 0) {
            paymentStatus = 'free';
        }

        // Generate QR code
        const { qrCode, qrData } = await generateQR({
            userId: req.user._id.toString(),
            eventId: event._id.toString(),
            registrationId: Date.now().toString(),
            timestamp: Date.now()
        });

        // Create registration
        const registration = new Registration({
            eventId: event._id,
            studentId: req.user._id,
            paymentId: verifiedPaymentId,
            razorpayOrderId: orderId || '',
            paymentStatus,
            amount: event.entryFee,
            qrCode,
            qrData
        });

        await registration.save();

        // Update seats
        event.seatsLeft = Math.max(0, event.seatsLeft - 1);
        await event.save();

        // Create notification if seats are low
        if (event.seatsLeft <= 5 && event.seatsLeft > 0) {
            await Notification.create({
                title: `Low Seats Alert: ${event.title}`,
                message: `Only ${event.seatsLeft} seats remaining!`,
                type: 'warning'
            });
        } else if (event.seatsLeft === 0) {
            await Notification.create({
                title: `Sold Out: ${event.title}`,
                message: `All seats have been filled!`,
                type: 'error'
            });
        }

        // Send email (async, don't wait)
        if (req.user.email) {
            sendRegistrationConfirmation(
                req.user.email,
                req.user.name,
                event.title,
                event.eventDate,
                qrCode
            ).catch(err => console.log('Email send failed:', err.message));
        }

        res.json({
            message: 'Registration successful!',
            registration: registration.toJSON(),
            qrCode
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ error: 'Already registered for this event.' });
        }
        res.status(500).json({ error: 'Payment verification failed.' });
    }
});

module.exports = router;
