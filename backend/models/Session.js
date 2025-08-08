const { pool } = require('../config/database');

class Session {
  static async create(sessionData) {
    const {
      user_email,
      ip_address,
      mac_address,
      mikrotik_session_id
    } = sessionData;

    try {
      const query = `
        INSERT INTO user_sessions (
          user_email, ip_address, mac_address, mikrotik_session_id,
          created_at
        ) VALUES ($1, $2, $3, $4, NOW())
        RETURNING id
      `;
      
      const result = await pool.query(query, [
        user_email,
        ip_address,
        mac_address,
        mikrotik_session_id
      ]);

      return {
        success: true,
        sessionId: result.rows[0].id,
        message: 'Session created successfully'
      };
    } catch (error) {
      console.error('Error creating session:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  static async updateSession(sessionId, updateData) {
    try {
      const allowedFields = ['session_end', 'bytes_in', 'bytes_out'];
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

      values.push(sessionId);
      const query = `UPDATE user_sessions SET ${updates.join(', ')} WHERE id = $${paramCount}`;
      await pool.query(query, values);

      return { success: true, message: 'Session updated successfully' };
    } catch (error) {
      console.error('Error updating session:', error);
      return { success: false, message: error.message };
    }
  }

  static async findByUserEmail(userEmail) {
    try {
      const query = `
        SELECT * FROM user_sessions 
        WHERE user_email = $1 
        ORDER BY session_start DESC
      `;
      const result = await pool.query(query, [userEmail]);
      
      return result.rows;
    } catch (error) {
      console.error('Error finding sessions by user email:', error);
      return [];
    }
  }

  static async findActiveSessions() {
    try {
      const query = `
        SELECT s.*, u.first_name, u.last_name, u.company 
        FROM user_sessions s
        JOIN user_registrations u ON s.user_email = u.email
        WHERE s.session_end IS NULL
        ORDER BY s.session_start DESC
      `;
      const result = await pool.query(query);
      
      return result.rows;
    } catch (error) {
      console.error('Error finding active sessions:', error);
      return [];
    }
  }

  static async getAllSessions(limit = 100, offset = 0) {
    try {
      const query = `
        SELECT s.*, u.first_name, u.last_name, u.company 
        FROM user_sessions s
        JOIN user_registrations u ON s.user_email = u.email
        ORDER BY s.session_start DESC
        LIMIT $1 OFFSET $2
      `;
      const result = await pool.query(query, [limit, offset]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting all sessions:', error);
      return [];
    }
  }

  static async getSessionStats() {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN session_end IS NULL THEN 1 END) as active_sessions,
          COALESCE(SUM(bytes_in), 0) as total_bytes_in,
          COALESCE(SUM(bytes_out), 0) as total_bytes_out,
          COALESCE(AVG(EXTRACT(EPOCH FROM (session_end - session_start))), 0) as avg_duration
        FROM user_sessions
        WHERE session_end IS NOT NULL
      `;
      const result = await pool.query(query);
      
      return result.rows[0] || {
        total_sessions: 0,
        active_sessions: 0,
        total_bytes_in: 0,
        total_bytes_out: 0,
        avg_duration: 0
      };
    } catch (error) {
      console.error('Error getting session stats:', error);
      return {
        total_sessions: 0,
        active_sessions: 0,
        total_bytes_in: 0,
        total_bytes_out: 0,
        avg_duration: 0
      };
    }
  }

  static async findByMikrotikSessionId(mikrotikSessionId) {
    try {
      const query = 'SELECT * FROM user_sessions WHERE mikrotik_session_id = $1';
      const result = await pool.query(query, [mikrotikSessionId]);
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding session by MikroTik session ID:', error);
      return null;
    }
  }

  static async endSession(sessionId, endData = {}) {
    try {
      const sessionEnd = endData.session_end || new Date();
      
      const query = `
        UPDATE user_sessions 
        SET session_end = $1, 
            bytes_in = COALESCE($2, bytes_in),
            bytes_out = COALESCE($3, bytes_out)
        WHERE id = $4
      `;
      
      await pool.query(query, [
        sessionEnd, 
        endData.bytes_in, 
        endData.bytes_out, 
        sessionId
      ]);
      
      return { success: true, message: 'Session ended successfully' };
    } catch (error) {
      console.error('Error ending session:', error);
      return { success: false, message: error.message };
    }
  }

  static async getSessionsByDateRange(startDate, endDate) {
    try {
      const query = `
        SELECT s.*, u.first_name, u.last_name, u.company 
        FROM user_sessions s
        JOIN user_registrations u ON s.user_email = u.email
        WHERE s.session_start BETWEEN $1 AND $2
        ORDER BY s.session_start DESC
      `;
      const result = await pool.query(query, [startDate, endDate]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting sessions by date range:', error);
      return [];
    }
  }

  static async getSessionsByIpAddress(ipAddress) {
    try {
      const query = `
        SELECT s.*, u.first_name, u.last_name, u.company 
        FROM user_sessions s
        JOIN user_registrations u ON s.user_email = u.email
        WHERE s.ip_address = $1
        ORDER BY s.session_start DESC
      `;
      const result = await pool.query(query, [ipAddress]);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting sessions by IP address:', error);
      return [];
    }
  }

  static async getDailyStats(days = 7) {
    try {
      const query = `
        SELECT 
          DATE(session_start) as date,
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN session_end IS NULL THEN 1 END) as active_sessions,
          COALESCE(SUM(bytes_in), 0) as total_bytes_in,
          COALESCE(SUM(bytes_out), 0) as total_bytes_out
        FROM user_sessions
        WHERE session_start >= NOW() - INTERVAL '${days} days'
        GROUP BY DATE(session_start)
        ORDER BY date DESC
      `;
      const result = await pool.query(query);
      
      return result.rows;
    } catch (error) {
      console.error('Error getting daily stats:', error);
      return [];
    }
  }
}

module.exports = Session;
