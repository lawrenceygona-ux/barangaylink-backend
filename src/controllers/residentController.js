const ResidentModel = require('../models/residentModel');

class ResidentController {
  static async getAll(req, res) {
    try {
      const { search, purok_zone, status } = req.query;
      const residents = await ResidentModel.getAll({ search, purok_zone, status });
      return res.json({ success: true, count: residents.length, data: residents });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  static async getById(req, res) {
    try {
      const resident = await ResidentModel.getById(req.params.id);
      if (!resident) {
        return res.status(404).json({ success: false, message: 'Resident record not found.' });
      }
      return res.json({ success: true, data: resident });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = ResidentController;