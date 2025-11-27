import express from 'express';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all employees (with optional filters)
router.get('/', authenticateToken, (req, res) => {
    try {
        const { department, status, search } = req.query;
        let query = 'SELECT * FROM employees WHERE 1=1';
        const params = [];

        if (department) {
            query += ' AND department = ?';
            params.push(department);
        }

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }

        if (search) {
            query += ' AND (full_name LIKE ? OR position LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const employees = db.prepare(query).all(...params);
        res.json(employees);
    } catch (error) {
        console.error('Get employees error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get single employee
router.get('/:id', authenticateToken, (req, res) => {
    try {
        const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(req.params.id);

        if (!employee) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json(employee);
    } catch (error) {
        console.error('Get employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Create new employee
router.post('/', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const { user_id, full_name, department, position, hire_date, salary, status = 'active' } = req.body;

        if (!full_name || !department || !position || !hire_date) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const result = db.prepare(
            'INSERT INTO employees (user_id, full_name, department, position, hire_date, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
        ).run(user_id || null, full_name, department, position, hire_date, salary || null, status);

        res.status(201).json({
            message: 'Employee created successfully',
            employeeId: result.lastInsertRowid
        });
    } catch (error) {
        console.error('Create employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update employee
router.put('/:id', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const { full_name, department, position, hire_date, salary, status } = req.body;
        const updates = [];
        const params = [];

        if (full_name) {
            updates.push('full_name = ?');
            params.push(full_name);
        }
        if (department) {
            updates.push('department = ?');
            params.push(department);
        }
        if (position) {
            updates.push('position = ?');
            params.push(position);
        }
        if (hire_date) {
            updates.push('hire_date = ?');
            params.push(hire_date);
        }
        if (salary !== undefined) {
            updates.push('salary = ?');
            params.push(salary);
        }
        if (status) {
            updates.push('status = ?');
            params.push(status);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No fields to update' });
        }

        params.push(req.params.id);
        const query = `UPDATE employees SET ${updates.join(', ')} WHERE id = ?`;

        const result = db.prepare(query).run(...params);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ message: 'Employee updated successfully' });
    } catch (error) {
        console.error('Update employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Delete employee
router.delete('/:id', authenticateToken, authorizeRole('admin'), (req, res) => {
    try {
        const result = db.prepare('DELETE FROM employees WHERE id = ?').run(req.params.id);

        if (result.changes === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        console.error('Delete employee error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
