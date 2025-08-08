const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

class Admin {
  static async authenticate(username, password) {
    try {
      const query = `
        SELECT * FROM admin_users 
        WHERE username = $1 AND is_active = true
      `;
      const result = await pool.query(query, [username]);
      
      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid credentials or account is inactive'
        };
      }

      const admin = result.rows[0];
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);
      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      return {
        success: true,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          role: admin.role
        }
      };
    } catch (error) {
      console.error('Error authenticating admin:', error);
      return {
        success: false,
        message: 'Authentication failed'
      };
    }
  }

  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM admin_users WHERE username = $1';
      const result = await pool.query(query, [username]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding admin by username:', error);
      return null;
    }
  }

  static async create(adminData) {
    const {
      username,
      password,
      email,
      role = 'admin'
    } = adminData;

    try {
      // Check if username already exists
      const existingAdmin = await this.findByUsername(username);
      if (existingAdmin) {
        return {
          success: false,
          message: 'Username already exists'
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const query = `
        INSERT INTO admin_users (username, password_hash, email, role)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        username,
        hashedPassword,
        email,
        role
      ]);

      return {
        success: true,
        adminId: result.rows[0].id,
        message: 'Admin user created successfully'
      };
    } catch (error) {
      console.error('Error creating admin:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  static async updatePassword(adminId, newPassword) {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      
      const query = 'UPDATE admin_users SET password_hash = $1 WHERE id = $2';
      await pool.query(query, [hashedPassword, adminId]);
      
      return { success: true, message: 'Password updated successfully' };
    } catch (error) {
      console.error('Error updating admin password:', error);
      return { success: false, message: error.message };
    }
  }

  static async getAllAdmins() {
    try {
      const query = `
        SELECT id, username, email, role, is_active, created_at
        FROM admin_users 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting all admins:', error);
      return [];
    }
  }

  static async updateAdmin(adminId, updateData) {
    try {
      const allowedFields = ['email', 'role', 'is_active'];
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

      values.push(adminId);
      const query = `UPDATE admin_users SET ${updates.join(', ')} WHERE id = $${paramCount}`;
      await pool.query(query, values);

      return { success: true, message: 'Admin updated successfully' };
    } catch (error) {
      console.error('Error updating admin:', error);
      return { success: false, message: error.message };
    }
  }

  static async deleteAdmin(adminId) {
    try {
      const query = 'DELETE FROM admin_users WHERE id = $1';
      await pool.query(query, [adminId]);
      
      return { success: true, message: 'Admin deleted successfully' };
    } catch (error) {
      console.error('Error deleting admin:', error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = Admin;
