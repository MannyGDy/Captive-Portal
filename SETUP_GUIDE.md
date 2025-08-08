# MikroTik Custom Captive Portal Setup Guide

## Overview
This guide will help you set up a complete custom captive portal system for your MikroTik router with FreeRADIUS integration.

## Prerequisites
- MikroTik router with RouterOS
- FreeRADIUS server (already set up)
- MySQL/PostgreSQL database
- Node.js server (v14 or higher)
- Web server (Apache/Nginx)

## Step 1: Database Setup

### 1.1 Create Database
```sql
CREATE DATABASE captive_portal CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'portal_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON captive_portal.* TO 'portal_user'@'localhost';
FLUSH PRIVILEGES;
```

### 1.2 Configure Environment
Copy `env.example` to `.env` and update with your settings:
```bash
cp env.example .env
```

Edit `.env` with your database credentials:
```env
DB_HOST=localhost
DB_USER=portal_user
DB_PASSWORD=your_secure_password
DB_NAME=captive_portal
```

### 1.3 Run Database Setup
```bash
npm run setup
```

## Step 2: Backend Server Setup

### 2.1 Install Dependencies
```bash
npm install
```

### 2.2 Configure FreeRADIUS Integration
Update your `.env` file with FreeRADIUS settings:
```env
RADIUS_HOST=your_radius_server_ip
RADIUS_PORT=1812
RADIUS_SECRET=your_radius_secret
```

### 2.3 Start the Server
```bash
npm start
```

## Step 3: MikroTik Configuration

### 3.1 Upload Custom HTML Files
Upload the frontend files to your MikroTik router:
- Copy `frontend/index.html` to your router as `login.html`
- Upload CSS and JS files to the router's file system

### 3.2 Apply Router Configuration
1. Open WinBox and connect to your router
2. Go to System > Scripts
3. Create a new script and paste the contents of `mikrotik/configuration.rsc`
4. Update the script with your actual settings:
   - Replace `YOUR_RADIUS_SERVER_IP` with your FreeRADIUS server IP
   - Replace `ether1` with your actual LAN interface name
   - Adjust IP ranges as needed
5. Run the script

### 3.3 Configure Hotspot Profile
```routeros
/ip hotspot profile set [find name="custom-portal"] \
    login-page=login.html \
    login-page-error=error.html \
    login-page-timeout=timeout.html
```

## Step 4: FreeRADIUS Integration

### 4.1 Configure RADIUS Clients
Add your MikroTik router as a RADIUS client in FreeRADIUS:
```bash
# Edit /etc/freeradius/3.0/clients.conf
client mikrotik {
    ipaddr = YOUR_MIKROTIK_IP
    secret = testing123
    shortname = mikrotik
}
```

### 4.2 Configure User Database
Set up your preferred user database (MySQL, PostgreSQL, etc.) in FreeRADIUS.

### 4.3 Test RADIUS Connection
```bash
# Test from your backend server
radtest testuser testpass localhost 0 testing123
```

## Step 5: Testing

### 5.1 Test Backend API
```bash
curl http://localhost:3000/api/health
```

### 5.2 Test User Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "company_name": "Test Company",
    "phone_number": "1234567890",
    "password": "password123"
  }'
```

### 5.3 Test Hotspot
1. Connect to your WiFi network
2. You should be redirected to the custom portal
3. Register or login with credentials
4. Verify internet access is granted

## Step 6: Admin Access

### 6.1 Access Admin Panel
Use the admin token from your `.env` file:
```bash
curl -H "X-Admin-Token: your-admin-token" \
  http://localhost:3000/api/admin/users
```

### 6.2 Download Reports
```bash
# User report
curl -H "X-Admin-Token: your-admin-token" \
  "http://localhost:3000/api/admin/reports/users?format=csv" \
  -o users_report.csv

# Session report
curl -H "X-Admin-Token: your-admin-token" \
  "http://localhost:3000/api/admin/reports/sessions?format=csv" \
  -o sessions_report.csv
```

## Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check database credentials in `.env`
   - Ensure MySQL service is running
   - Verify database exists

2. **RADIUS Authentication Fails**
   - Check RADIUS server connectivity
   - Verify RADIUS secret matches
   - Check user exists in RADIUS database

3. **Hotspot Not Redirecting**
   - Verify hotspot is enabled on correct interface
   - Check firewall rules
   - Ensure custom HTML files are uploaded

4. **Users Can't Access Internet**
   - Check NAT configuration
   - Verify DNS settings
   - Check RADIUS accounting

### Debug Commands

```bash
# Check backend logs
npm run dev

# Test database connection
node -e "require('./backend/config/database').testConnection()"

# Test RADIUS connection
node -e "require('./backend/config/radius').testRadiusConnection()"

# MikroTik commands
/ip hotspot active print
/radius test freeradius-auth
/log print where topics~"hotspot"
```

## Security Considerations

1. **Change Default Passwords**
   - Update admin password
   - Change RADIUS secret
   - Use strong JWT secret

2. **Network Security**
   - Use HTTPS in production
   - Implement proper firewall rules
   - Regular security updates

3. **Data Protection**
   - Encrypt sensitive data
   - Regular backups
   - GDPR compliance

## Production Deployment

1. **Use HTTPS**
   - Obtain SSL certificate
   - Configure reverse proxy (Nginx/Apache)
   - Update MikroTik configuration

2. **Database Optimization**
   - Use connection pooling
   - Implement proper indexing
   - Regular maintenance

3. **Monitoring**
   - Set up logging
   - Monitor system resources
   - Alert on failures

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review logs for error messages
3. Verify all configuration steps
4. Test each component individually

## License

This project is licensed under the MIT License.
