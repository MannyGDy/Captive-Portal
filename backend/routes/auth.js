const express = require('express');
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Session = require('../models/Session');

const router = express.Router();

// Validation middleware
const validateRegistration = [
  body('first_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('First name must be between 2 and 100 characters')
    .trim(),
  body('last_name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Last name must be between 2 and 100 characters')
    .trim(),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone_number')
    .matches(/^(070|080|081|090|091)\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number (e.g., 08012345678)'),
  body('company')
    .isLength({ min: 2, max: 200 })
    .withMessage('Company name must be between 2 and 200 characters')
    .trim()
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone_number')
    .matches(/^(070|080|081|090|091)\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number')
];

// Generate JWT token
const generateToken = (userId, email) => {
  return jwt.sign(
    { userId, email },
    process.env.JWT_SECRET || 'your-secret-key',
    { expiresIn: '24h' }
  );
};

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { first_name, last_name, email, phone_number, company } = req.body;

    // Create user in database
    const userResult = await User.create({
      first_name,
      last_name,
      email,
      phone_number,
      company
    });

    if (!userResult.success) {
      return res.status(400).json({
        success: false,
        message: userResult.message
      });
    }

    // Generate JWT token
    const token = generateToken(userResult.userId, email);

    res.status(201).json({
      success: true,
      message: 'Registration successful! You can now login with your email and phone number.',
      token,
      user: {
        id: userResult.userId,
        email,
        first_name,
        last_name,
        company
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, phone_number } = req.body;

    // Authenticate user
    const authResult = await User.authenticate(email, phone_number);
    
    if (!authResult.success) {
      return res.status(401).json({
        success: false,
        message: authResult.message
      });
    }

    // Generate JWT token
    const token = generateToken(authResult.user.id, authResult.user.email);

    // Create session record
    const sessionData = {
      user_email: authResult.user.email,
      ip_address: req.ip || req.connection.remoteAddress,
      mac_address: req.headers['x-mac-address'] || null,
      mikrotik_session_id: req.headers['x-mikrotik-session'] || null
    };

    await Session.create(sessionData);

    res.json({
      success: true,
      message: 'Login successful! You now have internet access.',
      token,
      user: authResult.user
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Verify token middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access token required'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Get current user profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const user = await User.findByEmail(req.userEmail);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

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
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Logout (end session)
router.post('/logout', verifyToken, async (req, res) => {
  try {
    // Find active session for user
    const sessions = await Session.findByUserEmail(req.userEmail);
    const activeSession = sessions.find(s => !s.session_end);
    
    if (activeSession) {
      await Session.endSession(activeSession.id);
    }

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication service is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
