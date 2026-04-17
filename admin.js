const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const Event = require('../models/Event');
const User = require('../models/User');
const { authenticate, requireRole } = require('../middleware/auth');

// GET /api/admin/stats - Dashboard statistics
router.get('/stats', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const totalEvents = await Event.countDocuments();
        const totalRegistrations = await Registration.countDocuments();
        const totalStudents = await User.countDocuments({ role: 'student' });

        // Calculate total revenue
        const revenueResult = await Registration.aggregate([
            { $match: { paymentStatus: { $in: ['paid', 'free'] } } },
            { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
        ]);
        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Total tickets used
        const ticketsUsed = await Registration.countDocuments({ qrUsed: true });

        res.json({
            totalEvents,
            totalRegistrations,
            totalStudents,
            totalRevenue,
            ticketsUsed
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to fetch statistics.' });
    }
});

// GET /api/admin/reports/registrations - Download CSV
router.get('/reports/registrations', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const registrations = await Registration.find()
            .populate('eventId', 'title eventDate entryFee')
            .populate('studentId', 'name email phone department username')
            .sort({ createdAt: -1 });

        // Build CSV
        const headers = ['Registration ID', 'Student Name', 'Email', 'Phone', 'Department', 'Event Title', 'Event Date', 'Amount (₹)', 'Payment Status', 'QR Used', 'Registered At'];
        const rows = registrations.map(r => [
            r._id,
            r.studentId?.name || 'N/A',
            r.studentId?.email || 'N/A',
            r.studentId?.phone || 'N/A',
            r.studentId?.department || 'N/A',
            r.eventId?.title || 'N/A',
            r.eventId?.eventDate ? new Date(r.eventId.eventDate).toLocaleDateString('en-IN') : 'N/A',
            r.amount || 0,
            r.paymentStatus,
            r.qrUsed ? 'Yes' : 'No',
            new Date(r.createdAt).toLocaleDateString('en-IN')
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=registrations_report.csv');
        res.send(csv);
    } catch (error) {
        console.error('Report error:', error);
        res.status(500).json({ error: 'Failed to generate report.' });
    }
});

// GET /api/admin/reports/payments - Download payment CSV
router.get('/reports/payments', authenticate, requireRole('admin'), async (req, res) => {
    try {
        const registrations = await Registration.find({ paymentStatus: { $in: ['paid', 'free'] } })
            .populate('eventId', 'title entryFee')
            .populate('studentId', 'name email')
            .sort({ createdAt: -1 });

        const headers = ['Payment ID', 'Order ID', 'Student Name', 'Email', 'Event', 'Amount (₹)', 'Status', 'Date'];
        const rows = registrations.map(r => [
            r.paymentId || 'N/A',
            r.razorpayOrderId || 'N/A',
            r.studentId?.name || 'N/A',
            r.studentId?.email || 'N/A',
            r.eventId?.title || 'N/A',
            r.amount || 0,
            r.paymentStatus,
            new Date(r.createdAt).toLocaleDateString('en-IN')
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=payments_report.csv');
        res.send(csv);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate payment report.' });
    }
});

module.exports = router;
