const { body, validationResult } = require('express-validator');

// Check validation results
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ 
            error: 'Validation failed',
            details: errors.array().map(e => ({ field: e.path, message: e.msg }))
        });
    }
    next();
};

// Registration validation
const validateRegister = [
    body('username')
        .trim()
        .isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
        .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores')
        .escape(),
    body('password')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name')
        .trim()
        .isLength({ min: 1, max: 100 }).withMessage('Name is required (max 100 chars)')
        .escape(),
    body('email')
        .optional({ values: 'falsy' })
        .isEmail().withMessage('Invalid email address')
        .normalizeEmail(),
    body('phone')
        .optional({ values: 'falsy' })
        .trim()
        .escape(),
    body('department')
        .optional({ values: 'falsy' })
        .trim()
        .escape(),
    handleValidationErrors
];

// Login validation
const validateLogin = [
    body('username').trim().notEmpty().withMessage('Username is required').escape(),
    body('password').notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

// Event validation
const validateEvent = [
    body('title')
        .trim()
        .isLength({ min: 1, max: 200 }).withMessage('Title is required (max 200 chars)')
        .escape(),
    body('description')
        .trim()
        .isLength({ min: 1, max: 5000 }).withMessage('Description is required (max 5000 chars)'),
    body('eventDate')
        .notEmpty().withMessage('Event date is required'),
    body('dueDate')
        .notEmpty().withMessage('Due date is required'),
    body('totalSeats')
        .isInt({ min: 1 }).withMessage('Total seats must be at least 1'),
    body('entryFee')
        .isFloat({ min: 0 }).withMessage('Entry fee must be 0 or more'),
    handleValidationErrors
];

module.exports = { validateRegister, validateLogin, validateEvent, handleValidationErrors };
