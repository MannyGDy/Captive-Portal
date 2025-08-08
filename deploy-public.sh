#!/bin/bash

# MikroTik Captive Portal - Public IP Deployment Script
# This script sets up the backend server for public IP access

set -e

echo "🚀 Starting Public IP Deployment for MikroTik Captive Portal..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root. Please run as a regular user with sudo privileges."
   exit 1
fi

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
print_status "Installing required packages..."
sudo apt install -y curl wget git ufw nginx certbot python3-certbot-nginx

# Install Node.js if not already installed
if ! command -v node &> /dev/null; then
    print_status "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally
print_status "Installing PM2 process manager..."
sudo npm install -g pm2

# Create logs directory
mkdir -p logs

# Install application dependencies
print_status "Installing application dependencies..."
npm install

# Setup database
print_status "Setting up database..."
node database/setup.js

# Configure firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw --force enable

print_status "Firewall configured. Current status:"
sudo ufw status

# Create nginx configuration
print_status "Creating nginx configuration..."
sudo tee /etc/nginx/sites-available/mikrotik-portal > /dev/null << 'EOF'
server {
    listen 80;
    server_name _;
    
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
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/mikrotik-portal /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Create environment file template
print_status "Creating environment configuration template..."
cat > .env.template << 'EOF'
# Server Configuration
PORT=3000
NODE_ENV=production
SERVER_URL=http://YOUR_PUBLIC_IP:3000

# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=mikrotik_portal
DB_USER=portal_user
DB_PASSWORD=CHANGE_THIS_PASSWORD

# FreeRADIUS Configuration
RADIUS_HOST=localhost
RADIUS_PORT=1812
RADIUS_SECRET=CHANGE_THIS_SECRET
RADIUS_NAS_IDENTIFIER=mikrotik_hotspot

# JWT Configuration
JWT_SECRET=CHANGE_THIS_JWT_SECRET
JWT_EXPIRES_IN=24h

# Admin Configuration
ADMIN_TOKEN=CHANGE_THIS_ADMIN_TOKEN

# CORS Configuration
CORS_ORIGIN=*
CORS_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_CREDENTIALS=true

# Session Configuration
SESSION_SECRET=CHANGE_THIS_SESSION_SECRET
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTPONLY=true

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security Headers
HELMET_ENABLED=true
CONTENT_SECURITY_POLICY=true

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log
EOF

print_warning "Please configure your .env file:"
echo "1. Copy .env.template to .env"
echo "2. Update all the CHANGE_THIS_* values with secure passwords/keys"
echo "3. Update SERVER_URL with your actual public IP"
echo "4. Configure your FreeRADIUS settings"

# Start application with PM2
print_status "Starting application with PM2..."
pm2 start backend/server.js --name "mikrotik-portal"
pm2 save
pm2 startup

print_status "Deployment completed successfully!"
echo ""
print_status "Next steps:"
echo "1. Configure your .env file with secure values"
echo "2. Test the application: curl http://localhost:3000/health"
echo "3. Update your MikroTik configuration to point to your public IP"
echo "4. Consider setting up SSL with Let's Encrypt"
echo ""
print_status "Useful commands:"
echo "- View logs: pm2 logs mikrotik-portal"
echo "- Restart app: pm2 restart mikrotik-portal"
echo "- Check status: pm2 status"
echo "- Monitor: pm2 monit"
