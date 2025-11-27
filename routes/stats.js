import express from 'express';
import db from '../database/db.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = express.Router();

// Get dashboard statistics
router.get('/', authenticateToken, (req, res) => {
    try {
        const stats = {};

        if (req.user.role === 'employee') {
            // Employee-specific stats
            const employee = db.prepare('SELECT id FROM employees WHERE user_id = ?').get(req.user.id);

            if (employee) {
                // Personal leave requests
                const leaveStats = db.prepare(`
                    SELECT 
                        COUNT(*) as total,
                        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
                    FROM leave_requests WHERE employee_id = ?
                `).get(employee.id);

                // Personal performance
                const perfStats = db.prepare(`
                    SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
                    FROM performance_reviews WHERE employee_id = ?
                `).get(employee.id);

                // Personal attendance this month
                const today = new Date();
                const month = String(today.getMonth() + 1).padStart(2, '0');
                const year = today.getFullYear();

                const attendanceStats = db.prepare(`
                    SELECT 
                        COUNT(*) as days_worked,
                        SUM(total_hours) as total_hours
                    FROM attendance 
                    WHERE employee_id = ? AND strftime('%Y-%m', date) = ?
                `).get(employee.id, `${year}-${month}`);

                stats.leaves = leaveStats;
                stats.performance = {
                    avgRating: perfStats.avg_rating ? Number(perfStats.avg_rating).toFixed(1) : 'N/A',
                    totalReviews: perfStats.total_reviews
                };
                stats.attendance = {
                    daysWorked: attendanceStats.days_worked || 0,
                    totalHours: attendanceStats.total_hours ? Number(attendanceStats.total_hours).toFixed(1) : '0'
                };
            }
        } else {
            // Manager/Admin stats
            const employeeCount = db.prepare('SELECT COUNT(*) as count FROM employees WHERE status = "active"').get();

            const leaveStats = db.prepare(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
                    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
                    SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected
                FROM leave_requests
            `).get();

            const perfStats = db.prepare(`
                SELECT AVG(rating) as avg_rating, COUNT(*) as total_reviews
                FROM performance_reviews
            `).get();

            // Today's attendance
            const today = new Date().toISOString().split('T')[0];
            const attendanceToday = db.prepare(`
                SELECT COUNT(*) as present
                FROM attendance
                WHERE date = ? AND status = 'present'
            `).get(today);

            stats.employees = {
                total: employeeCount.count,
                active: employeeCount.count
            };
            stats.leaves = leaveStats;
            stats.performance = {
                avgRating: perfStats.avg_rating ? Number(perfStats.avg_rating).toFixed(1) : 'N/A',
                totalReviews: perfStats.total_reviews
            };
            stats.attendance = {
                todayPresent: attendanceToday.present || 0,
                totalEmployees: employeeCount.count,
                attendanceRate: employeeCount.count > 0
                    ? ((attendanceToday.present / employeeCount.count) * 100).toFixed(1)
                    : 0
            };
        }

        res.json(stats);
    } catch (error) {
        console.error('Get dashboard stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get department statistics (managers/admins only)
router.get('/departments', authenticateToken, authorizeRole('admin', 'manager'), (req, res) => {
    try {
        const deptStats = db.prepare(`
            SELECT 
                department,
                COUNT(*) as employee_count,
                AVG(salary) as avg_salary
            FROM employees
            WHERE status = 'active'
            GROUP BY department
            ORDER BY employee_count DESC
        `).all();

        res.json(deptStats);
    } catch (error) {
        console.error('Get department stats error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
