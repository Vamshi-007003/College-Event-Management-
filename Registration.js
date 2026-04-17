const mongoose = require('mongoose');

const registrationSchema = new mongoose.Schema({
    eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        required: true
    },
    studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    paymentId: {
        type: String,
        default: ''
    },
    razorpayOrderId: {
        type: String,
        default: ''
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'failed', 'free'],
        default: 'pending'
    },
    amount: {
        type: Number,
        default: 0
    },
    qrCode: {
        type: String,  // base64 PNG
        default: ''
    },
    qrData: {
        type: String,  // encrypted data string
        default: ''
    },
    qrUsed: {
        type: Boolean,
        default: false
    },
    qrUsedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Prevent duplicate registrations
registrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
