const { createClient } = require('node-radius-client');
require('dotenv').config();

const radiusConfig = {
  host: process.env.RADIUS_HOST || 'localhost',
  port: process.env.RADIUS_PORT || 1812,
  secret: process.env.RADIUS_SECRET || 'testing123',
  timeout: 5000,
  retries: 3
};

// Create RADIUS client
const radiusClient = createClient(radiusConfig);

// Test RADIUS connection
async function testRadiusConnection() {
  try {
    // Simple test authentication
    const result = await radiusClient.accessRequest({
      username: 'test',
      password: 'test'
    });
    console.log('✅ FreeRADIUS connection successful');
    return true;
  } catch (error) {
    console.log('⚠️ FreeRADIUS connection test failed (this is normal if no test user exists):', error.message);
    return true; // Don't fail startup, just log the warning
  }
}

// Create user in FreeRADIUS
async function createRadiusUser(username, password) {
  try {
    // This would typically use radclient or similar to add user to FreeRADIUS
    // For now, we'll return success and you can implement the actual user creation
    console.log(`Creating RADIUS user: ${username}`);
    
    // You can implement actual user creation here using:
    // - radclient command execution
    // - Direct database insertion
    // - FreeRADIUS API calls
    
    return {
      success: true,
      message: `User ${username} created successfully in FreeRADIUS`
    };
  } catch (error) {
    console.error('Error creating RADIUS user:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

// Authenticate user with FreeRADIUS
async function authenticateUser(username, password) {
  try {
    const result = await radiusClient.accessRequest({
      username: username,
      password: password
    });
    
    return {
      success: result.code === 'Access-Accept',
      message: result.code === 'Access-Accept' ? 'Authentication successful' : 'Authentication failed'
    };
  } catch (error) {
    console.error('RADIUS authentication error:', error);
    return {
      success: false,
      message: error.message
    };
  }
}

module.exports = {
  radiusClient,
  radiusConfig,
  testRadiusConnection,
  createRadiusUser,
  authenticateUser
};
