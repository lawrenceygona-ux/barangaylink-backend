const db = require('../config/db');

class DashboardModel {
  static async getSummary() {
    // Calls PostgreSQL function: fn_get_dashboard_analytics()
    const query = `SELECT * FROM fn_get_dashboard_analytics();`;
    const result = await db.query(query);
    return result.rows[0];
  }
}

module.exports = DashboardModel;