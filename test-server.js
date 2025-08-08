const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = 3001;

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
  origin: ['http://localhost:3001', 'http://localhost:8080'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'frontend')));
app.use('/portal', express.static(path.join(__dirname, 'frontend')));

// Mock API endpoints for testing
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'MikroTik Captive Portal API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mock auth endpoints
app.post('/api/auth/register', (req, res) => {
  // Simulate registration
  res.json({
    success: true,
    message: 'Registration successful! You can now login with your email and phone number.',
    token: 'mock-jwt-token',
    user: {
      id: 'mock-user-id',
      email: req.body.email,
      first_name: req.body.first_name,
      last_name: req.body.last_name,
      company: req.body.company
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  // Simulate login
  res.json({
    success: true,
    message: 'Login successful! You now have internet access.',
    token: 'mock-jwt-token',
    user: {
      id: 'mock-user-id',
      email: req.body.email,
      first_name: 'Test',
      last_name: 'User',
      company: 'Test Company'
    }
  });
});

// Serve captive portal as default page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/admin.html'));
});

// Catch-all route for captive portal
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/index.html'));
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
  console.log('  GET  /api/health - Health check');
  console.log('');
  console.log('✅ Server is ready to handle requests!');
});
