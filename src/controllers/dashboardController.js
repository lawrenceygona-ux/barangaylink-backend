const DashboardModel = require('../models/dashboardModel');

class DashboardController {
  static async getSummary(req, res) {
    try {
      const analytics = await DashboardModel.getSummary();
      return res.json({ success: true, data: analytics });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = DashboardController;