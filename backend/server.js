const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Import configurations
const { testConnection: testDatabase } = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (for serving the captive portal)
app.use('/portal', express.static(path.join(__dirname, '../frontend')));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MikroTik Captive Portal API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Serve captive portal as default page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/admin.html'));
});

// Catch-all route for captive portal
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found'
  });
});

// Initialize server
async function startServer() {
  try {
    // Test database connection
    const dbConnected = await testDatabase();
    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your configuration.');
      process.exit(1);
    }

    // Start server
    app.listen(PORT, () => {
      console.log('🚀 MikroTik Captive Portal Server started successfully!');
      console.log(`📍 Server running on port ${PORT}`);
      console.log(`🌐 API Base URL: http://localhost:${PORT}/api`);
      console.log(`🔐 Captive Portal: http://localhost:${PORT}`);
      console.log(`📊 Admin Panel: http://localhost:${PORT}/admin`);
      console.log('');
      console.log('📋 Available endpoints:');
      console.log('  POST /api/auth/register - User registration');
      console.log('  POST /api/auth/login - User login');
      console.log('  GET  /api/auth/profile - Get user profile');
      console.log('  POST /api/auth/logout - User logout');
      console.log('');
      console.log('🔧 Admin endpoints:');
      console.log('  POST /api/admin/login - Admin login');
      console.log('  GET  /api/admin/users - Get all users');
      console.log('  GET  /api/admin/stats - Get system statistics');
      console.log('  GET  /api/admin/reports/users - Download user report');
      console.log('  GET  /api/admin/reports/sessions - Download session report');
      console.log('');
      console.log('✅ Server is ready to handle requests!');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Start the server
if (require.main === module) {
  startServer();
}

// Export app for testing
module.exports = { app };
