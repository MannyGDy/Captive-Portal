# MikroTik Captive Portal

A complete, production-ready captive portal solution for MikroTik routers with FreeRADIUS integration, user management, and comprehensive reporting.

## 🚀 Features

- **Custom Branded Portal**: Beautiful, responsive captive portal interface
- **User Registration & Authentication**: Email and phone number-based authentication
- **FreeRADIUS Integration**: Seamless integration with FreeRADIUS for authentication
- **Admin Dashboard**: Complete user and session management
- **Session Tracking**: Monitor user sessions, data usage, and connection times
- **Reporting System**: Generate CSV reports for users and sessions
- **Docker Support**: Containerized deployment for easy setup
- **Security Features**: JWT authentication, rate limiting, input validation
- **Mobile Responsive**: Works perfectly on all devices

## 📋 Prerequisites

- Node.js 14+ and npm
- PostgreSQL 12+
- Docker and Docker Compose (optional)
- MikroTik router with hotspot functionality
- FreeRADIUS server (optional)

## 🛠️ Quick Setup

### 1. Clone and Install

```bash
git clone <repository-url>
cd mikrotik-portal
npm install
```

### 2. Environment Configuration

Copy the environment template and configure it:

```bash
cp env.example .env
```

Edit `.env` with your configuration:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=captive_portal
DB_PORT=5432

# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Admin Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
ADMIN_EMAIL=admin@company.com
```

### 3. Database Setup

```bash
# Create PostgreSQL database
createdb captive_portal

# Run database setup
npm run setup
```

### 4. Start the Application

```bash
# Development mode
npm run dev

# Production mode
npm start
```

### 5. Access the Application

- **Captive Portal**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **API Documentation**: http://localhost:3000/api/health

## 🐳 Docker Deployment

### Quick Start with Docker

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production Deployment

```bash
# Use production profile
docker-compose --profile production up -d
```

## 🔧 MikroTik Configuration

### 1. Router Setup

Import the MikroTik configuration:

```bash
# Connect to your MikroTik router
ssh admin@your-router-ip

# Import configuration
/system script add name="setup-portal" source=[/file get portal-config.txt contents]
/system script run setup-portal
```

### 2. Hotspot Configuration

Configure the hotspot to use your portal:

```
/ip hotspot profile add name=portal-profile login-page=http://your-server-ip:3000
/ip hotspot add profile=portal-profile interface=wlan1
```

## 📊 Admin Dashboard

### Access Admin Panel

1. Navigate to http://localhost:3000/admin
2. Login with default credentials:
   - Username: `admin`
   - Password: `admin123`

### Features Available

- **Dashboard**: System statistics and overview
- **User Management**: View, edit, and manage user accounts
- **Session Monitoring**: Track active and historical sessions
- **Reports**: Generate CSV reports for users and sessions
- **System Settings**: Configure portal appearance and behavior

## 🔌 API Endpoints

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `POST /api/auth/logout` - User logout

### Admin

- `POST /api/admin/login` - Admin login
- `GET /api/admin/users` - Get all users
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/reports/users` - Download user report
- `GET /api/admin/reports/sessions` - Download session report

### Health Check

- `GET /api/health` - System health status

## 🧪 Testing

Run the test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- auth.test.js
```

## 📈 Monitoring & Maintenance

### Health Checks

The application includes comprehensive health monitoring:

- Database connectivity
- FreeRADIUS server status
- System resource usage
- API endpoint availability

### Logging

Logs are available in:

- **Development**: Console output
- **Production**: Docker logs or PM2 logs
- **File logs**: `/var/log/captive-portal/`

### Backup

Automated database backups:

```bash
# Manual backup
./deploy.sh backup

# Restore from backup
./deploy.sh restore backups/captive_portal_20240101_120000.sql
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: Prevent abuse with request limiting
- **Input Validation**: Comprehensive input sanitization
- **CORS Protection**: Cross-origin request security
- **Helmet Security**: HTTP security headers
- **Password Hashing**: bcrypt password encryption
- **SQL Injection Prevention**: Parameterized queries

## 🎨 Customization

### Portal Branding

Update the portal appearance in the admin dashboard or modify:

- `frontend/index.html` - Main portal page
- `frontend/css/style.css` - Styling
- System settings in the database

### Company Information

Update company details in the `.env` file:

```env
PORTAL_TITLE=Welcome to Our WiFi Network
PORTAL_SUBTITLE=Please register to access the internet
COMPANY_NAME=Your Company Name
```

## 🚨 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check PostgreSQL is running
   - Verify database credentials in `.env`
   - Ensure database exists

2. **Portal Not Loading**
   - Check server is running on correct port
   - Verify firewall settings
   - Check MikroTik hotspot configuration

3. **Authentication Issues**
   - Verify JWT secret is set
   - Check user credentials
   - Review FreeRADIUS configuration

### Debug Mode

Enable debug logging:

```bash
# Set debug environment
export DEBUG=*

# Start with debug
npm run dev
```

## 📚 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Detailed setup instructions
- [API Documentation](docs/api.md) - Complete API reference
- [Deployment Guide](docs/deployment.md) - Production deployment
- [Troubleshooting](docs/troubleshooting.md) - Common issues and solutions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:

- **Email**: support@company.com
- **Documentation**: [Project Wiki](wiki-url)
- **Issues**: [GitHub Issues](issues-url)

## 🎉 What's Next?

The application is now **COMPLETE** and ready for production use! Here's what you can do next:

1. **Deploy to Production**: Use the Docker deployment for production
2. **Configure MikroTik**: Set up your router with the provided configuration
3. **Customize Branding**: Update the portal with your company branding
4. **Monitor Usage**: Use the admin dashboard to monitor user activity
5. **Generate Reports**: Create regular reports for business insights

The system includes everything needed for a professional captive portal solution with comprehensive user management, security, and monitoring capabilities.
