# MikroTik RouterOS Configuration for Custom Captive Portal
# This script configures the hotspot with FreeRADIUS integration

# ========================================
# HOTSPOT CONFIGURATION
# ========================================

# Create hotspot server profile
/ip hotspot profile add name="custom-portal" hotspot-address=0.0.0.0 dns-name="" login-cookie="" http-cookie="" split-user-domain=no use-radius=yes radius-accounting=yes radius-interim-update=5m nas-port-type=wireless-802.11

# Configure hotspot server
/ip hotspot server profile set [find name="custom-portal"] \
    hotspot-address=0.0.0.0 \
    dns-name="" \
    login-cookie="" \
    http-cookie="" \
    split-user-domain=no \
    use-radius=yes \
    radius-accounting=yes \
    radius-interim-update=5m \
    nas-port-type=wireless-802.11

# ========================================
# RADIUS CLIENT CONFIGURATION
# ========================================

# Add RADIUS client for authentication
/radius add name="freeradius-auth" service=hotspot address=YOUR_RADIUS_SERVER_IP secret=testing123 timeout=5s

# Add RADIUS client for accounting
/radius add name="freeradius-acct" service=login address=YOUR_RADIUS_SERVER_IP secret=testing123 timeout=5s

# ========================================
# HOTSPOT SERVER SETUP
# ========================================

# Create hotspot server on your LAN interface
# Replace 'ether1' with your actual LAN interface name
/ip hotspot add name="custom-portal" interface=ether1 profile=custom-portal address-pool=hotspot-pool idle-timeout=30m keepalive-timeout=2m login-timeout=1h

# ========================================
# ADDRESS POOL CONFIGURATION
# ========================================

# Create address pool for hotspot users
/ip pool add name="hotspot-pool" ranges=192.168.1.100-192.168.1.200

# ========================================
# DNS CONFIGURATION
# ========================================

# Configure DNS servers for hotspot users
/ip hotspot set [find name="custom-portal"] dns-server=8.8.8.8,8.8.4.4

# ========================================
# CUSTOM HTML FILES
# ========================================

# Upload your custom HTML files to the router
# You'll need to manually upload these files via WinBox or FTP

# Set custom login page
/ip hotspot profile set [find name="custom-portal"] \
    login-page=login.html \
    login-page-error=error.html \
    login-page-timeout=timeout.html

# ========================================
# FIREWALL RULES
# ========================================

# Allow hotspot traffic
/ip firewall filter add chain=input protocol=tcp dst-port=80 src-address=192.168.1.0/24 action=accept comment="Hotspot HTTP"
/ip firewall filter add chain=input protocol=tcp dst-port=443 src-address=192.168.1.0/24 action=accept comment="Hotspot HTTPS"

# Allow RADIUS traffic
/ip firewall filter add chain=input protocol=udp dst-port=1812 action=accept comment="RADIUS Authentication"
/ip firewall filter add chain=input protocol=udp dst-port=1813 action=accept comment="RADIUS Accounting"

# ========================================
# NAT CONFIGURATION
# ========================================

# Configure NAT for hotspot users
/ip firewall nat add chain=srcnat src-address=192.168.1.0/24 action=masquerade comment="Hotspot NAT"

# ========================================
# USER PROFILE (OPTIONAL)
# ========================================

# Create a default user profile for testing
/ip hotspot user profile add name="default" rate-limit=1M/1M session-timeout=1d

# ========================================
# LOGGING CONFIGURATION
# ========================================

# Enable hotspot logging
/system logging add topics=hotspot,info

# ========================================
# SCHEDULER FOR CLEANUP (OPTIONAL)
# ========================================

# Add a scheduler to clean up expired sessions daily
/system scheduler add name="hotspot-cleanup" interval=1d on-event="/ip hotspot active remove [find]"

# ========================================
# SECURITY SETTINGS
# ========================================

# Disable admin access from hotspot network
/ip firewall filter add chain=input src-address=192.168.1.0/24 dst-port=8291 action=drop comment="Block WinBox from hotspot"

# ========================================
# MONITORING AND STATISTICS
# ========================================

# Enable hotspot monitoring
/tool bandwidth-server set enabled=yes

# ========================================
# BACKUP CONFIGURATION
# ========================================

# Create a backup of the configuration
/system backup save name="hotspot-config-backup"

# ========================================
# VERIFICATION COMMANDS
# ========================================

# Commands to verify the configuration:
# /ip hotspot print
# /ip hotspot active print
# /radius print
# /ip pool print
# /ip firewall filter print where comment~"Hotspot"

# ========================================
# TROUBLESHOOTING COMMANDS
# ========================================

# Monitor hotspot activity
# /ip hotspot active monitor [find]

# Check RADIUS connectivity
# /radius test freeradius-auth

# View hotspot logs
# /log print where topics~"hotspot"

# ========================================
# IMPORTANT NOTES
# ========================================

# 1. Replace 'YOUR_RADIUS_SERVER_IP' with your actual FreeRADIUS server IP
# 2. Replace 'ether1' with your actual LAN interface name
# 3. Adjust the IP range in the address pool as needed
# 4. Upload your custom HTML files to the router
# 5. Test the configuration before deploying to production
# 6. Backup your configuration regularly

# ========================================
# CUSTOM HTML FILES TO UPLOAD
# ========================================

# You need to upload these files to your router:
# - login.html (your custom portal page)
# - error.html (error page)
# - timeout.html (timeout page)
# - success.html (success page)

# Upload via WinBox: Files > Upload
# Or via FTP to the router's file system
