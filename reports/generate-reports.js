const { pool } = require('../backend/config/database');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const moment = require('moment');
const fs = require('fs');
const path = require('path');

class ReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, 'generated');
    this.ensureReportsDirectory();
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async generateUserReport(format = 'csv') {
    try {
      console.log('📊 Generating user report...');

      const query = `
        SELECT 
          u.id,
          u.username,
          u.email,
          u.company_name,
          u.phone_number,
          u.is_active,
          u.created_at,
          u.last_login,
          COUNT(s.id) as total_sessions,
          SUM(s.duration) as total_duration,
          SUM(s.bytes_in + s.bytes_out) as total_data_usage
        FROM users u
        LEFT JOIN sessions s ON u.id = s.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `;

      const [rows] = await pool.execute(query);

      if (format === 'csv') {
        return await this.exportToCSV(rows, 'users', [
          { id: 'id', title: 'User ID' },
          { id: 'username', title: 'Username' },
          { id: 'email', title: 'Email' },
          { id: 'company_name', title: 'Company' },
          { id: 'phone_number', title: 'Phone' },
          { id: 'is_active', title: 'Active' },
          { id: 'created_at', title: 'Created' },
          { id: 'last_login', title: 'Last Login' },
          { id: 'total_sessions', title: 'Total Sessions' },
          { id: 'total_duration', title: 'Total Duration (sec)' },
          { id: 'total_data_usage', title: 'Total Data (bytes)' }
        ]);
      }

      return rows;
    } catch (error) {
      console.error('❌ Error generating user report:', error);
      throw error;
    }
  }

  async generateSessionReport(format = 'csv', startDate = null, endDate = null) {
    try {
      console.log('📊 Generating session report...');

      let query = `
        SELECT 
          s.id,
          u.username,
          u.email,
          u.company_name,
          s.ip_address,
          s.mac_address,
          s.session_start,
          s.session_end,
          s.duration,
          s.bytes_in,
          s.bytes_out,
          (s.bytes_in + s.bytes_out) as total_bytes,
          s.mikrotik_session_id
        FROM sessions s
        JOIN users u ON s.user_id = u.id
      `;

      const params = [];
      if (startDate && endDate) {
        query += ' WHERE s.session_start BETWEEN ? AND ?';
        params.push(startDate, endDate);
      }

      query += ' ORDER BY s.session_start DESC';

      const [rows] = await pool.execute(query, params);

      if (format === 'csv') {
        return await this.exportToCSV(rows, 'sessions', [
          { id: 'id', title: 'Session ID' },
          { id: 'username', title: 'Username' },
          { id: 'email', title: 'Email' },
          { id: 'company_name', title: 'Company' },
          { id: 'ip_address', title: 'IP Address' },
          { id: 'mac_address', title: 'MAC Address' },
          { id: 'session_start', title: 'Start Time' },
          { id: 'session_end', title: 'End Time' },
          { id: 'duration', title: 'Duration (sec)' },
          { id: 'bytes_in', title: 'Bytes In' },
          { id: 'bytes_out', title: 'Bytes Out' },
          { id: 'total_bytes', title: 'Total Bytes' },
          { id: 'mikrotik_session_id', title: 'MikroTik Session ID' }
        ]);
      }

      return rows;
    } catch (error) {
      console.error('❌ Error generating session report:', error);
      throw error;
    }
  }

  async generateUsageReport(format = 'csv', period = 'daily') {
    try {
      console.log('📊 Generating usage report...');

      let groupBy, dateFormat;
      switch (period) {
        case 'hourly':
          groupBy = 'DATE_FORMAT(session_start, "%Y-%m-%d %H:00:00")';
          dateFormat = '%Y-%m-%d %H:00:00';
          break;
        case 'daily':
          groupBy = 'DATE(session_start)';
          dateFormat = '%Y-%m-%d';
          break;
        case 'weekly':
          groupBy = 'YEARWEEK(session_start)';
          dateFormat = '%Y-%u';
          break;
        case 'monthly':
          groupBy = 'DATE_FORMAT(session_start, "%Y-%m")';
          dateFormat = '%Y-%m';
          break;
        default:
          groupBy = 'DATE(session_start)';
          dateFormat = '%Y-%m-%d';
      }

      const query = `
        SELECT 
          ${groupBy} as period,
          COUNT(DISTINCT s.user_id) as unique_users,
          COUNT(s.id) as total_sessions,
          SUM(s.duration) as total_duration,
          SUM(s.bytes_in + s.bytes_out) as total_data_usage,
          AVG(s.duration) as avg_session_duration
        FROM sessions s
        GROUP BY ${groupBy}
        ORDER BY period DESC
      `;

      const [rows] = await pool.execute(query);

      if (format === 'csv') {
        return await this.exportToCSV(rows, `usage_${period}`, [
          { id: 'period', title: 'Period' },
          { id: 'unique_users', title: 'Unique Users' },
          { id: 'total_sessions', title: 'Total Sessions' },
          { id: 'total_duration', title: 'Total Duration (sec)' },
          { id: 'total_data_usage', title: 'Total Data (bytes)' },
          { id: 'avg_session_duration', title: 'Avg Session Duration (sec)' }
        ]);
      }

      return rows;
    } catch (error) {
      console.error('❌ Error generating usage report:', error);
      throw error;
    }
  }

  async exportToCSV(data, filename, headers) {
    const timestamp = moment().format('YYYY-MM-DD_HH-mm-ss');
    const filePath = path.join(this.reportsDir, `${filename}_${timestamp}.csv`);

    const csvWriter = createCsvWriter({
      path: filePath,
      header: headers
    });

    await csvWriter.writeRecords(data);
    console.log(`✅ Report saved to: ${filePath}`);
    return filePath;
  }

  async generateAllReports() {
    try {
      console.log('🚀 Generating all reports...');

      const reports = {
        users: await this.generateUserReport('csv'),
        sessions: await this.generateSessionReport('csv'),
        usage_daily: await this.generateUsageReport('csv', 'daily'),
        usage_weekly: await this.generateUsageReport('csv', 'weekly'),
        usage_monthly: await this.generateUsageReport('csv', 'monthly')
      };

      console.log('✅ All reports generated successfully!');
      return reports;
    } catch (error) {
      console.error('❌ Error generating reports:', error);
      throw error;
    }
  }
}

// CLI usage
if (require.main === module) {
  const generator = new ReportGenerator();
  
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'users':
      generator.generateUserReport('csv');
      break;
    case 'sessions':
      generator.generateSessionReport('csv');
      break;
    case 'usage':
      const period = args[1] || 'daily';
      generator.generateUsageReport('csv', period);
      break;
    case 'all':
      generator.generateAllReports();
      break;
    default:
      console.log('Usage: node generate-reports.js [users|sessions|usage|all] [period]');
      console.log('Periods: hourly, daily, weekly, monthly');
  }
}

module.exports = ReportGenerator;

