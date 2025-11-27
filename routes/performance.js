import express from 'express';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all performance reviews (with role-based filtering)
router.get('/', authenticateToken, (req, res) => {
    try {
        let query = `
      SELECT pr.*, e.full_name as employee_name, e.department, u.username as reviewer_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN users u ON pr.reviewer_id = u.id
    `;
        const params = [];

        // If employee role, only show their own reviews
        if (req.user.role === 'employee') {
            const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
            if (employee) {
                query += ' WHERE pr.employee_id = ?';
                params.push(employee.id);
            }
        }

        query += ' ORDER BY pr.created_at DESC';

        const reviews = db.prepare(query).all(...params);
        res.json(reviews);
    } catch (error) {
        console.error('Get all performance reviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get performance reviews for a specific employee
router.get('/employee/:employeeId', authenticateToken, (req, res) => {
    try {
        const reviews = db.prepare(`
      SELECT pr.*, e.full_name as employee_name, u.username as reviewer_name
      FROM performance_reviews pr
      JOIN employees e ON pr.employee_id = e.id
      JOIN users u ON pr.reviewer_id = u.id
      WHERE pr.employee_id = ?
      ORDER BY pr.created_at DESC
    `).all(req.params.employeeId);

        res.json(reviews);
    } catch (error) {
        console.error('Get performance reviews error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get performance statistics
router.get('/stats/summary', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_reviews,
        AVG(rating) as avg_rating,
        MAX(rating) as max_rating,
        MIN(rating) as min_rating
      FROM performance_reviews
    `).get();

        res.json(stats);
    } catch (error) {
        console.error('Get performance stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create performance review (manager/admin only)
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const { employee_id, period, rating, goals, feedback } = req.body;

        console.log('Creating performance review:', { employee_id, period, rating, user_id: req.user.id });

        if (!employee_id || !period || !rating) {
            return res.status(400).json({ error: 'Employee ID, period, and rating are required' });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Verify employee exists
        const employee = db.prepare('SELECT id FROM employees WHERE id = ?').get(employee_id);
        if (!employee) {
            console.log('Employee not found:', employee_id);
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Verify reviewer (current user) exists
        const reviewer = db.prepare('SELECT id FROM users WHERE id = ?').get(req.user.id);
        if (!reviewer) {
            console.log('Reviewer user not found:', req.user.id);
            return res.status(404).json({ error: 'Reviewer user not found' });
        }

        // Use the authenticated user's ID as the reviewer
        const reviewer_id = req.user.id;

        console.log('Inserting review with:', { employee_id, reviewer_id, period, rating });

        const result = db.prepare(
            'INSERT INTO performance_reviews (employee_id, reviewer_id, period, rating, goals, feedback) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(employee_id, reviewer_id, period, rating, goals || null, feedback || null);

        res.status(201).json({
            message: 'Performance review created successfully',
            id: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Create performance review error:', error);
        console.error('Request body:', req.body);
        console.error('User:', req.user);
        res.status(500).json({ error: 'Internal server error: ' + error.message });
    }
});

// Update performance review
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const { rating, goals, feedback } = req.body;
        const updates = [];
        const params = [];

        if (rating !== undefined) {
            if (rating < 1 || rating > 5) {
                return res.status(400).json({ error: 'Rating must be between 1 and 5' });
            }
            updates.push('rating = ?');
            params.push(rating);
        }
        if (goals !== undefined) {
            updates.push('goals = ?');
            params.push(goals);
        }
        if (feedback !== undefined) {
            updates.push('feedback = ?');
            params.push(feedback);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(req.params.id);
        const query = `UPDATE performance_reviews SET ${updates.join(', ')} WHERE id = ?`;

        const result = db.prepare(query).run(...params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Performance review not found' });
        }

        res.json({ message: 'Performance review updated successfully' });
    } catch (error) {
        console.error('Update performance review error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
