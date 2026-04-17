const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate, generateToken } = require('../middleware/auth');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiter');

// POST /api/auth/register
router.post('/register', authLimiter, validateRegister, async (req, res) => {
    try {
        const { username, password, name, email, phone, department, role, secretKey } = req.body;

        // Check if user already exists
        const existing = await User.findOne({ username: username.toLowerCase() });
        if (existing) {
            return res.status(400).json({ error: 'Username already taken.' });
        }

        // Admin registration requires secret key
        if (role === 'admin') {
            const adminSecret = process.env.ADMIN_SECRET_KEY || 'ADMIN123';
            if (secretKey !== adminSecret) {
                return res.status(403).json({ error: 'Invalid admin secret key.' });
            }
        }

        // Create user
        const user = new User({
            username: username.toLowerCase(),
            password,
            name,
            email,
            phone,
            department,
            role: role || 'student'
        });

        await user.save();

        // Generate JWT
        const token = generateToken(user);

        res.status(201).json({
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', authLimiter, validateLogin, async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username: username.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = generateToken(user);

        res.json({
            token,
            user: user.toJSON()
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// GET /api/auth/me - Get current user
router.get('/me', authenticate, async (req, res) => {
    res.json({ user: req.user.toJSON() });
});

module.exports = router;
