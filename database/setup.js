const { Pool } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'radius',
  port: process.env.DB_PORT || 5432,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

async function setupDatabase() {
  try {
    console.log('🗄️ Setting up database for MikroTik Captive Portal...');

    // Enable UUID extension
    await pool.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✅ UUID extension enabled');

    // Create user_registrations table (matching init.sql schema)
    const createUserRegistrationsTable = `
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
      )
    `;

    // Create admin_users table (matching init.sql schema)
    const createAdminUsersTable = `
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
      )
    `;

    // Create user_sessions table (matching init.sql schema)
    const createUserSessionsTable = `
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
      )
    `;

    // Create system_settings table
    const createSystemSettingsTable = `
      CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(100) UNIQUE NOT NULL,
        setting_value TEXT,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Execute table creation
    await pool.query(createUserRegistrationsTable);
    console.log('✅ User registrations table created');

    await pool.query(createAdminUsersTable);
    console.log('✅ Admin users table created');

    await pool.query(createUserSessionsTable);
    console.log('✅ User sessions table created');

    await pool.query(createSystemSettingsTable);
    console.log('✅ System settings table created');

    // Create indexes for better performance
    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_user_registrations_email ON user_registrations(email)',
      'CREATE INDEX IF NOT EXISTS idx_user_registrations_phone ON user_registrations(phone_number)',
      'CREATE INDEX IF NOT EXISTS idx_user_registrations_active ON user_registrations(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_user_registrations_created ON user_registrations(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username)',
      'CREATE INDEX IF NOT EXISTS idx_admin_users_active ON admin_users(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_email ON user_sessions(user_email)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_start ON user_sessions(session_start)',
      'CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(session_end) WHERE session_end IS NULL',
      'CREATE INDEX IF NOT EXISTS idx_settings_key ON system_settings(setting_key)'
    ];

    for (const indexQuery of createIndexes) {
      await pool.query(indexQuery);
    }
    console.log('✅ Database indexes created');

    // Create function to update updated_at timestamp
    const createUpdateTrigger = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql'
    `;

    await pool.query(createUpdateTrigger);

    // Create triggers to automatically update updated_at
    const createTriggers = [
      'CREATE TRIGGER update_user_registrations_updated_at BEFORE UPDATE ON user_registrations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      'CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()'
    ];

    for (const triggerQuery of createTriggers) {
      await pool.query(triggerQuery);
    }
    console.log('✅ Update triggers created');

    // Insert default system settings
    const insertSystemSettings = `
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
      ON CONFLICT (setting_key) DO NOTHING
    `;

    await pool.query(insertSystemSettings);
    console.log('✅ Default system settings inserted');

    // Create default admin user
    const bcrypt = require('bcryptjs');
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@company.com';
    
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    
    const checkAdminExists = 'SELECT COUNT(*) as count FROM admin_users WHERE username = $1';
    const adminResult = await pool.query(checkAdminExists, [adminUsername]);
    
    if (parseInt(adminResult.rows[0].count) === 0) {
      const insertAdmin = `
        INSERT INTO admin_users (username, password_hash, email, role) VALUES
        ($1, $2, $3, 'super_admin')
      `;
      
      await pool.query(insertAdmin, [adminUsername, hashedPassword, adminEmail]);
      console.log('✅ Default admin user created');
      console.log('⚠️  Default admin credentials:');
      console.log(`   Username: ${adminUsername}`);
      console.log(`   Password: ${adminPassword}`);
      console.log('   ⚠️  Please change these credentials immediately!');
    } else {
      console.log('ℹ️  Admin user already exists');
    }

    console.log('');
    console.log('🎉 Database setup completed successfully!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('   - user_registrations (user accounts)');
    console.log('   - admin_users (admin accounts)');
    console.log('   - user_sessions (session tracking)');
    console.log('   - system_settings (portal configuration)');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Update your .env file with database credentials');
    console.log('   2. Start the server with: npm start');
    console.log('   3. Access the portal at: http://localhost:3000');
    console.log('   4. Access admin panel at: http://localhost:3000/admin');

  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run setup if this file is executed directly
if (require.main === module) {
  setupDatabase();
}

module.exports = { setupDatabase };
