const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  static async create(userData) {
    const {
      email,
      phone_number,
      first_name,
      last_name,
      company
    } = userData;

    try {
      // Clean phone number (remove spaces, dashes, etc.)
      const cleanPhone = phone_number.replace(/[\s\-\(\)]/g, '');
      
      // Validate Nigerian phone number
      const nigerianPattern = /^(070|080|081|090|091)\d{8}$/;
      if (!nigerianPattern.test(cleanPhone)) {
        return {
          success: false,
          message: 'Invalid Nigerian phone number format. Use format: 08012345678'
        };
      }

      // Check if email already exists
      const existingEmail = await this.findByEmail(email);
      if (existingEmail) {
        return {
          success: false,
          message: 'Email already registered'
        };
      }

      // Check if phone number already exists
      const existingPhone = await this.findByPhone(cleanPhone);
      if (existingPhone) {
        return {
          success: false,
          message: 'Phone number already registered'
        };
      }

      const query = `
        INSERT INTO user_registrations (
          email, phone_number, first_name, last_name, company,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        email,
        cleanPhone,
        first_name,
        last_name,
        company
      ]);

      return {
        success: true,
        userId: result.rows[0].id,
        message: 'User registered successfully'
      };
    } catch (error) {
      console.error('Error creating user:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  static async findByEmail(email) {
    try {
      const query = 'SELECT * FROM user_registrations WHERE email = $1';
      const result = await pool.query(query, [email]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by email:', error);
      return null;
    }
  }

  static async findByPhone(phoneNumber) {
    try {
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      const query = 'SELECT * FROM user_registrations WHERE phone_number = $1';
      const result = await pool.query(query, [cleanPhone]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding user by phone:', error);
      return null;
    }
  }

  static async authenticate(email, phoneNumber) {
    try {
      const cleanPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
      
      const query = `
        SELECT * FROM user_registrations 
        WHERE email = $1 AND phone_number = $2 AND is_active = true
      `;
      const result = await pool.query(query, [email, cleanPhone]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid credentials or account is inactive'
        };
      }

      const user = result.rows[0];
      
      // Update last login
      await this.updateLastLogin(user.id);

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          phone_number: user.phone_number,
          first_name: user.first_name,
          last_name: user.last_name,
          company: user.company
        }
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  static async updateLastLogin(userId) {
    try {
      const query = 'UPDATE user_registrations SET last_login = NOW() WHERE id = $1';
      await pool.query(query, [userId]);
      return true;
    } catch (error) {
      console.error('Error updating last login:', error);
      return false;
    }
  }

  static async getAllUsers() {
    try {
      const query = `
        SELECT id, email, phone_number, first_name, last_name, company, 
               registration_date, last_login, is_active, created_at
        FROM user_registrations 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting all users:', error);
      return [];
    }
  }

  static async getUserStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_users,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
          COUNT(CASE WHEN last_login IS NOT NULL THEN 1 END) as users_with_login,
          COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as recent_logins
        FROM user_registrations
      `;
      const result = await pool.query(query);
      
      return result.rows[0];
    } catch (error) {
      console.error('Error getting user stats:', error);
      return null;
    }
  }

  static async updateUser(userId, updateData) {
    try {
      const allowedFields = ['first_name', 'last_name', 'company', 'is_active'];
      const updates = [];
      const values = [];
      let paramCount = 1;

      for (const [field, value] of Object.entries(updateData)) {
        if (allowedFields.includes(field)) {
          updates.push(`${field} = $${paramCount}`);
          values.push(value);
          paramCount++;
        }
      }

      if (updates.length === 0) {
        return { success: false, message: 'No valid fields to update' };
      }

      values.push(userId);
      const query = `UPDATE user_registrations SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramCount}`;
      await pool.query(query, values);

      return { success: true, message: 'User updated successfully' };
    } catch (error) {
      console.error('Error updating user:', error);
      return { success: false, message: error.message };
    }
  }

  static async deleteUser(userId) {
    try {
      const query = 'DELETE FROM user_registrations WHERE id = $1';
      await pool.query(query, [userId]);
      
      return { success: true, message: 'User deleted successfully' };
    } catch (error) {
      console.error('Error deleting user:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = User;
