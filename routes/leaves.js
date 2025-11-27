import express from 'express';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get leave requests (filtered by role)
router.get('/', authenticateToken, (req, res) => {
    try {
        let query = 'SELECT lr.*, e.full_name, e.department FROM leave_requests lr JOIN employees e ON lr.employee_id = e.id';
        const params = [];

        // If employee role, only show their own requests
        if (req.user.role === 'employee') {
            const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
            if (employee) {
                query += ' WHERE lr.employee_id = ?';
                params.push(employee.id);
            }
        }

        // Filter by status if provided
        if (req.query.status) {
            query += params.length > 0 ? ' AND lr.status = ?' : ' WHERE lr.status = ?';
            params.push(req.query.status);
        }

        query += ' ORDER BY lr.created_at DESC';

        const leaves = db.prepare(query).all(...params);
        res.json(leaves);
    } catch (error) {
        console.error('Get leaves error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Submit leave request
router.post('/', authenticateToken, (req, res) => {
    try {
        const { leave_type, start_date, end_date, reason } = req.body;

        if (!leave_type || !start_date || !end_date) {
            return res.status(400).json({ error: 'Leave type, start date, and end date are required' });
        }

        // Get employee ID for current user
        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee record not found' });
        }

        const result = db.prepare(
            'INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)'
        ).run(employee.id, leave_type, start_date, end_date, reason || null);

        res.status(201).json({
            message: 'Leave request submitted successfully',
            leaveId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Submit leave error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update leave status (approve/reject)
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const { status } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
        }

        const result = db.prepare('UPDATE leave_requests SET status = ? WHERE id = ?').run(status, req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        res.json({ message: `Leave request ${status} successfully` });
    } catch (error) {
        console.error('Update leave error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete leave request (admin only)
router.delete('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    try {
        const result = db.prepare('DELETE FROM leave_requests WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }

        res.json({ message: 'Leave request deleted successfully' });
    } catch (error) {
        console.error('Delete leave error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
