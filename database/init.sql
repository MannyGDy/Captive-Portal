-- Database initialization script for MikroTik Captive Portal (PostgreSQL)
-- This script creates the database schema for PostgreSQL

-- Create database if it doesn't exist (run this as superuser)
-- CREATE DATABASE captive_portal;

-- Connect to the database
-- \c captive_portal;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create user_registrations table
CREATE TABLE IF NOT EXISTS user_registrations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(11) UNIQUE NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    company VARCHAR(200),
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_nigerian_phone CHECK (
      phone_number ~ '^(070|080|081|090|091)[0-9]{8}$'
    )
);

-- Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_email VARCHAR(255) NOT NULL,
    ip_address INET,
    mac_address MACADDR,
    session_start TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_end TIMESTAMP,
    duration INTEGER NULL,
    bytes_in BIGINT DEFAULT 0,
    bytes_out BIGINT DEFAULT 0,
    mikrotik_session_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create admin_users table
CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);

-- Create system_settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id SERIAL PRIMARY KEY,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_registrations_email ON user_registrations(email);
CREATE INDEX IF NOT EXISTS idx_user_registrations_phone ON user_registrations(phone_number);
CREATE INDEX IF NOT EXISTS idx_user_registrations_active ON user_registrations(is_active);
CREATE INDEX IF NOT EXISTS idx_user_registrations_created ON user_registrations(created_at);

CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(user_email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start ON user_sessions(session_start);
CREATE INDEX IF NOT EXISTS idx_user_sessions_end ON user_sessions(session_end);
CREATE INDEX IF NOT EXISTS idx_user_sessions_mikrotik ON user_sessions(mikrotik_session_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(session_end) WHERE session_end IS NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_date_range ON user_sessions(session_start, session_end);

CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active);

CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key);

-- Insert default system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('portal_title', 'Welcome to Our WiFi Network', 'Title displayed on the captive portal'),
('portal_subtitle', 'Please register to access the internet', 'Subtitle displayed on the portal'),
('company_name', 'Your Company Name', 'Company name displayed on the portal'),
('company_logo', '', 'URL to company logo'),
('session_timeout', '86400', 'Session timeout in seconds (24 hours)'),
('max_sessions_per_user', '3', 'Maximum concurrent sessions per user'),
('data_limit_mb', '1024', 'Data usage limit in MB per session'),
('registration_enabled', 'true', 'Whether user registration is enabled'),
('terms_of_service', 'By using this network, you agree to our terms of service.', 'Terms of service text'),
('privacy_policy', 'Your privacy is important to us. Read our privacy policy.', 'Privacy policy text'),
('support_email', 'support@company.com', 'Support email address'),
('support_phone', '+1 (555) 123-4567', 'Support phone number'),
('maintenance_mode', 'false', 'Whether the portal is in maintenance mode'),
('maintenance_message', 'System is under maintenance. Please try again later.', 'Maintenance mode message')
ON CONFLICT (setting_key) DO NOTHING;

-- Create default admin user (password: admin123)
INSERT INTO admin_users (id, username, email, password_hash, role) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@company.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'super_admin')
ON CONFLICT (username) DO NOTHING;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_user_registrations_updated_at BEFORE UPDATE ON user_registrations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO portal_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO portal_user;

-- Show tables
\dt

-- Show default settings
SELECT setting_key, setting_value FROM system_settings;

