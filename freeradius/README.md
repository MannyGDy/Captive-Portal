# FreeRADIUS Integration Setup

This directory contains configuration files for integrating the MikroTik Captive Portal with FreeRADIUS.

## Files Description

- `clients.conf` - RADIUS client configuration for MikroTik routers
- `users` - User authentication file for testing
- `README.md` - This documentation file

## Installation Steps

### 1. Install FreeRADIUS

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install freeradius freeradius-mysql

# CentOS/RHEL
sudo yum install freeradius freeradius-mysql
```

### 2. Configure Clients

Copy the `clients.conf` file to your FreeRADIUS configuration:

```bash
sudo cp clients.conf /etc/freeradius/3.0/clients.conf
```

Update the IP addresses and secrets to match your network configuration.

### 3. Configure Users

Copy the `users` file to your FreeRADIUS configuration:

```bash
sudo cp users /etc/freeradius/3.0/mods-config/files/authorize
```

### 4. Configure Database (Optional)

For production use, configure MySQL/PostgreSQL integration:

```bash
# Edit /etc/freeradius/3.0/mods-available/sql
# Set your database connection details
```

### 5. Test Configuration

```bash
# Test FreeRADIUS configuration
sudo freeradius -X

# Test authentication
radtest testuser testpass localhost 0 testing123
```

### 6. Start FreeRADIUS Service

```bash
sudo systemctl enable freeradius
sudo systemctl start freeradius
```

## Security Notes

1. Change default secrets in production
2. Use strong passwords for all users
3. Configure proper firewall rules
4. Enable logging for monitoring
5. Regular security updates

## Troubleshooting

- Check FreeRADIUS logs: `sudo tail -f /var/log/freeradius/radius.log`
- Test client connectivity: `radtest`
- Verify configuration: `sudo freeradius -C`

