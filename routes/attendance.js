import express from 'express';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get all attendance records (with role-based filtering)
router.get('/', authenticateToken, (req, res) => {
    try {
        let query = `
      SELECT a.*, e.full_name, e.department
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
    `;
        const params = [];

        // If employee role, only show their own records
        if (req.user.role === 'employee') {
            const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
            if (employee) {
                query += ' WHERE a.employee_id = ?';
                params.push(employee.id);
            }
        }

        // Filter by date if provided
        if (req.query.date) {
            query += params.length > 0 ? ' AND a.date = ?' : ' WHERE a.date = ?';
            params.push(req.query.date);
        }

        query += ' ORDER BY a.date DESC LIMIT 100';

        const records = db.prepare(query).all(...params);
        res.json(records);
    } catch (error) {
        console.error('Get attendance records error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get today's attendance status for current user
router.get('/today', authenticateToken, (req, res) => {
    try {
        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee record not found' });
        }

        const today = new Date().toISOString().split('T')[0];
        const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee.id, today);

        res.json({
            hasRecord: !!record,
            record: record || null,
            canClockIn: !record,
            canClockOut: record && !record.clock_out
        });
    } catch (error) {
        console.error('Get today attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get attendance records for a specific employee
router.get('/employee/:employeeId', authenticateToken, (req, res) => {
    try {
        const { month, year } = req.query;
        let query = 'SELECT * FROM attendance WHERE employee_id = ?';
        const params = [req.params.employeeId];

        if (month && year) {
            query += ` AND strftime('%Y-%m', date) = ?`;
            params.push(`${year}-${month.padStart(2, '0')}`);
        }

        query += ' ORDER BY date DESC';

        const records = db.prepare(query).all(...params);
        res.json(records);
    } catch (error) {
        console.error('Get attendance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clock in
router.post('/clock-in', authenticateToken, (req, res) => {
    try {
        // Get employee ID for current user
        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee record not found' });
        }

        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0];

        // Check if already clocked in today
        const existing = db.prepare('SELECT id FROM attendance WHERE employee_id = ? AND date = ?').get(employee.id, today);
        if (existing) {
            return res.status(400).json({ error: 'Already clocked in today' });
        }

        const result = db.prepare(
            'INSERT INTO attendance (employee_id, date, clock_in) VALUES (?, ?, ?)'
        ).run(employee.id, today, currentTime);

        res.status(201).json({
            message: 'Clocked in successfully',
            attendanceId: result.lastInsertRowid,
            time: currentTime
        });
    } catch (error) {
        console.error('Clock in error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clock out
router.post('/clock-out', authenticateToken, (req, res) => {
    try {
        // Get employee ID for current user
        const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);
        if (!employee) {
            return res.status(404).json({ error: 'Employee record not found' });
        }

        const today = new Date().toISOString().split('T')[0];
        const currentTime = new Date().toTimeString().split(' ')[0];

        // Get today's attendance record
        const record = db.prepare('SELECT * FROM attendance WHERE employee_id = ? AND date = ?').get(employee.id, today);
        if (!record) {
            return res.status(400).json({ error: 'No clock-in record found for today' });
        }

        if (record.clock_out) {
            return res.status(400).json({ error: 'Already clocked out today' });
        }

        // Calculate total hours
        const clockIn = new Date(`${today}T${record.clock_in}`);
        const clockOut = new Date(`${today}T${currentTime}`);
        const totalHours = (clockOut - clockIn) / (1000 * 60 * 60);

        db.prepare('UPDATE attendance SET clock_out = ?, total_hours = ? WHERE id = ?')
            .run(currentTime, totalHours.toFixed(2), record.id);

        res.json({
            message: 'Clocked out successfully',
            time: currentTime,
            totalHours: totalHours.toFixed(2)
        });
    } catch (error) {
        console.error('Clock out error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get monthly attendance report
router.get('/report/:employeeId', authenticateToken, (req, res) => {
    try {
        const { month, year } = req.query;

        if (!month || !year) {
            return res.status(400).json({ error: 'Month and year are required' });
        }

        const records = db.prepare(`
      SELECT * FROM attendance 
      WHERE employee_id = ? AND strftime('%Y-%m', date) = ?
      ORDER BY date ASC
    `).all(req.params.employeeId, `${year}-${month.padStart(2, '0')}`);

        const totalHours = records.reduce((sum, record) => sum + (record.total_hours || 0), 0);
        const daysPresent = records.filter(r => r.status === 'present').length;
        const daysLate = records.filter(r => r.status === 'late').length;
        const daysAbsent = records.filter(r => r.status === 'absent').length;

        // Calculate working days in month (rough estimate: total days - weekends)
        const daysInMonth = new Date(year, month, 0).getDate();
        const workingDays = Math.floor(daysInMonth * 5 / 7); // Approximate working days

        res.json({
            records,
            summary: {
                totalHours: totalHours.toFixed(2),
                daysPresent,
                daysLate,
                daysAbsent,
                totalDays: records.length,
                workingDays,
                attendanceRate: workingDays > 0 ? ((daysPresent / workingDays) * 100).toFixed(1) : 0
            }
        });
    } catch (error) {
        console.error('Get attendance report error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get attendance statistics (for managers/admins)
router.get('/stats/summary', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];

        const todayStats = db.prepare(`
      SELECT 
        COUNT(*) as total_employees_today,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_today,
        SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) as late_today,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_today
      FROM attendance
      WHERE date = ?
    `).get(today);

        const totalEmployees = db.prepare('SELECT COUNT(*) as count FROM employees WHERE status = "active"').get();

        res.json({
            today: todayStats,
            totalActiveEmployees: totalEmployees.count,
            attendanceRate: totalEmployees.count > 0
                ? ((todayStats.present_today / totalEmployees.count) * 100).toFixed(1)
                : 0
        });
    } catch (error) {
        console.error('Get attendance stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
