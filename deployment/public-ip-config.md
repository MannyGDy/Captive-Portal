# Public IP Deployment Configuration

## Environment Variables for Public IP Setup

Create a `.env` file with these settings:

```bash
# Server Configuration
PORT=3000
NODE_ENV=production
SERVER_URL=http://your-public-ip:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mikrotik_portal
DB_USER=portal_user
DB_PASSWORD=your_secure_password

# FreeRADIUS Configuration
RADIUS_HOST=localhost
RADIUS_PORT=1812
RADIUS_SECRET=your_radius_secret
RADIUS_NAS_IDENTIFIER=mikrotik_hotspot

# JWT Configuration
JWT_SECRET=your_super_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# Admin Configuration
ADMIN_TOKEN=your_secure_admin_token_here

# CORS Configuration (for public access)
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true

# Session Configuration
SESSION_SECRET=your_session_secret_here
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true

# Rate Limiting (important for public access)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security Headers
HELMET_ENABLED=true
CONTENT_SECURITY_POLICY=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *  # Daily at 2 AM
BACKUP_RETENTION_DAYS=30
```

## Security Setup Steps

### 1. Firewall Configuration
```bash
# Install UFW if not already installed
sudo apt update
sudo apt install ufw

# Configure firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (change port if needed)
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow your application port
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

### 2. SSL/HTTPS Setup (Recommended)
```bash
# Install Certbot for Let's Encrypt
sudo apt install certbot

# Get SSL certificate
sudo certbot certonly --standalone -d your-domain.com

# Configure nginx as reverse proxy
sudo apt install nginx
```

### 3. Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/mikrotik-portal`:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. Process Management with PM2
```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start backend/server.js --name "mikrotik-portal"

# Save PM2 configuration
pm2 save
pm2 startup
```

## MikroTik Configuration Updates

Update your MikroTik configuration to point to your public IP:

```rsc
# Update the hotspot profile to use your public IP
/ip hotspot profile set [find name="custom_portal"] \
    login-page=http://your-public-ip:3000 \
    login-page-https=https://your-domain.com
```

## Monitoring and Maintenance

### 1. Log Monitoring
```bash
# View application logs
pm2 logs mikrotik-portal

# View nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 2. Security Monitoring
```bash
# Monitor failed login attempts
grep "Failed login" /var/log/auth.log

# Monitor application access
tail -f logs/app.log | grep "ERROR\|WARN"
```

### 3. Backup Strategy
```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
mkdir -p $BACKUP_DIR

# Database backup
mysqldump -u portal_user -p mikrotik_portal > $BACKUP_DIR/db_backup_$DATE.sql

# Application backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /path/to/your/app

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.sql" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
EOF

chmod +x backup.sh
```

## Troubleshooting

### Common Issues:
1. **Port not accessible**: Check firewall and MikroTik configuration
2. **SSL errors**: Verify certificate paths and nginx configuration
3. **Database connection**: Ensure MySQL is running and accessible
4. **FreeRADIUS issues**: Check radius client configuration

### Health Check Commands:
```bash
# Check if application is running
pm2 status

# Test database connection
node -e "require('./backend/config/database.js').testConnection()"

# Test RADIUS connection
node -e "require('./backend/config/radius.js').testRadiusConnection()"

# Check network connectivity
curl -I http://localhost:3000/health
```
