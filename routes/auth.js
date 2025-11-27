import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import db from '../database/db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Register new user
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role = 'employee', full_name, department, position } = req.body;

        // Validation
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Username, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE email = ? OR username = ?').get(email, username);
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email or username already exists' });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);

        // Insert user
        const userResult = db.prepare(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)'
        ).run(username, email, passwordHash, role);

        const userId = userResult.lastInsertRowid;

        // Create employee record automatically
        const employeeName = full_name || username;
        const employeeDept = department || 'General';
        const employeePos = position || 'Employee';
        const hireDate = new Date().toISOString().split('T')[0]; // Today's date

        db.prepare(
            'INSERT INTO employees (user_id, full_name, department, position, hire_date, status) VALUES (?, ?, ?, ?, ?, ?)'
        ).run(userId, employeeName, employeeDept, employeePos, hireDate, 'active');

        res.status(201).json({
            message: 'User registered successfully',
            userId: userId
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Get employee info to fetch full name
        const employee = db.prepare('SELECT full_name FROM employees WHERE user_id = ?').get(user.id);

        // Generate JWT token
        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                fullName: employee?.full_name || user.username
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get current user info
router.get('/me', authenticateToken, (req, res) => {
    try {
        const user = db.prepare('SELECT id, username, email, role, created_at FROM users WHERE id = ?').get(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get employee full name
        const employee = db.prepare('SELECT full_name FROM employees WHERE user_id = ?').get(user.id);

        res.json({
            ...user,
            fullName: employee?.full_name || user.username
        });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
