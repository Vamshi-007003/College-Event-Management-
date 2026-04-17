const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 200
    },
    description: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000
    },
    eventDate: {
        type: Date,
        required: true
    },
    dueDate: {
        type: Date,
        required: true
    },
    totalSeats: {
        type: Number,
        required: true,
        min: 1
    },
    seatsLeft: {
        type: Number,
        required: true,
        min: 0
    },
    entryFee: {
        type: Number,
        default: 0,
        min: 0
    },
    imageUrl: {
        type: String,
        default: ''
    },
    additionalImages: [{
        type: String
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', eventSchema);
