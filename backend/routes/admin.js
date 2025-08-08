const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');
const Admin = require('../models/Admin');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const path = require('path');
const fs = require('fs');
const moment = require('moment');

const router = express.Router();

// Admin authentication middleware
const verifyAdmin = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Admin token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.adminId = decoded.adminId;
    req.adminUsername = decoded.adminUsername;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired admin token'
    });
  }
};

// Admin login
router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, password } = req.body;

    const authResult = await Admin.authenticate(username, password);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    // Generate admin JWT token
    const token = jwt.sign(
      { 
        adminId: authResult.admin.id, 
        adminUsername: authResult.admin.username,
        role: authResult.admin.role 
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      token,
      admin: authResult.admin
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all users
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    let users = await User.getAllUsers();
    
    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user => 
        user.first_name.toLowerCase().includes(searchLower) ||
        user.last_name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower) ||
        user.company.toLowerCase().includes(searchLower) ||
        user.phone_number.includes(search)
      );
    }
    
    // Apply pagination
    const totalUsers = users.length;
    const paginatedUsers = users.slice(offset, offset + parseInt(limit));
    
    res.json({
      success: true,
      users: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalUsers,
        pages: Math.ceil(totalUsers / limit)
      }
    });
    
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get user details
router.get('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByEmail(req.params.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get user sessions
    const sessions = await Session.findByUserEmail(user.email);
    
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        phone_number: user.phone_number,
        first_name: user.first_name,
        last_name: user.last_name,
        company: user.company,
        registration_date: user.registration_date,
        last_login: user.last_login,
        is_active: user.is_active
      },
      sessions: sessions
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Update user
router.put('/users/:userId', verifyAdmin, [
  body('first_name').optional().isLength({ min: 2, max: 100 }),
  body('last_name').optional().isLength({ min: 2, max: 100 }),
  body('company').optional().isLength({ min: 2, max: 200 }),
  body('is_active').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const user = await User.findByEmail(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const updateResult = await User.updateUser(user.id, req.body);
    
    if (!updateResult.success) {
      return res.status(400).json({
        success: false,
        message: updateResult.message
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully'
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Delete user
router.delete('/users/:userId', verifyAdmin, async (req, res) => {
  try {
    const user = await User.findByEmail(req.params.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const deleteResult = await User.deleteUser(user.id);
    
    if (!deleteResult.success) {
      return res.status(400).json({
        success: false,
        message: deleteResult.message
      });
    }

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get system statistics
router.get('/stats', verifyAdmin, async (req, res) => {
  try {
    const userStats = await User.getUserStats();
    const sessionStats = await Session.getSessionStats();
    
    res.json({
      success: true,
      userStats,
      sessionStats
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all sessions
router.get('/sessions', verifyAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    
    const sessions = await Session.getAllSessions(parseInt(limit), offset);
    
    res.json({
      success: true,
      sessions: sessions
    });
    
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Download users report
router.get('/reports/users', verifyAdmin, async (req, res) => {
  try {
    const users = await User.getAllUsers();
    
    const csvWriter = createCsvWriter({
      path: path.join(__dirname, '../../reports/users_report.csv'),
      header: [
        { id: 'id', title: 'ID' },
        { id: 'first_name', title: 'First Name' },
        { id: 'last_name', title: 'Last Name' },
        { id: 'email', title: 'Email' },
        { id: 'phone_number', title: 'Phone Number' },
        { id: 'company', title: 'Company' },
        { id: 'registration_date', title: 'Registration Date' },
        { id: 'last_login', title: 'Last Login' },
        { id: 'is_active', title: 'Active' }
      ]
    });

    await csvWriter.writeRecords(users);
    
    res.download(path.join(__dirname, '../../reports/users_report.csv'), 
      `users_report_${moment().format('YYYY-MM-DD')}.csv`);
    
  } catch (error) {
    console.error('Download users report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

// Download sessions report
router.get('/reports/sessions', verifyAdmin, async (req, res) => {
  try {
    const sessions = await Session.getAllSessions(10000, 0); // Get all sessions
    
    const csvWriter = createCsvWriter({
      path: path.join(__dirname, '../../reports/sessions_report.csv'),
      header: [
        { id: 'id', title: 'Session ID' },
        { id: 'user_email', title: 'User Email' },
        { id: 'first_name', title: 'First Name' },
        { id: 'last_name', title: 'Last Name' },
        { id: 'company', title: 'Company' },
        { id: 'ip_address', title: 'IP Address' },
        { id: 'mac_address', title: 'MAC Address' },
        { id: 'session_start', title: 'Session Start' },
        { id: 'session_end', title: 'Session End' },
        { id: 'bytes_in', title: 'Bytes In' },
        { id: 'bytes_out', title: 'Bytes Out' }
      ]
    });

    await csvWriter.writeRecords(sessions);
    
    res.download(path.join(__dirname, '../../reports/sessions_report.csv'), 
      `sessions_report_${moment().format('YYYY-MM-DD')}.csv`);
    
  } catch (error) {
    console.error('Download sessions report error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating report'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Admin service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
