const rateLimit = require('express-rate-limit');

// General API rate limiter
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200,
    message: { error: 'Too many requests. Please try again later.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Strict limiter for auth routes
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Too many login attempts. Please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false
});

// Payment route limiter
const paymentLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: { error: 'Too many payment requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = { generalLimiter, authLimiter, paymentLimiter };
