const RequestModel = require('../models/requestModel');

class RequestController {
  // Resident submits a document request
  static async create(req, res) {
    try {
      const residentId = req.user.resident_id;
      if (!residentId) {
        return res.status(400).json({
          success: false,
          message: 'No resident profile linked to this user account.'
        });
      }

      const { document_type, purpose } = req.body;
      if (!document_type || !purpose) {
        return res.status(400).json({
          success: false,
          message: 'document_type and purpose are required.'
        });
      }

      const request = await RequestModel.create(residentId, document_type, purpose);
      return res.status(201).json({
        success: true,
        message: 'Document request submitted successfully.',
        data: request
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Staff / Admin updates status (e.g., 'Approved', 'Rejected', 'Released')
  static async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status, remarks } = req.body;

      if (!status) {
        return res.status(400).json({ success: false, message: 'Status is required.' });
      }

      await RequestModel.updateStatus(id, status, req.user.id, remarks);
      return res.json({
        success: true,
        message: `Request status successfully updated to '${status}'.`
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // List requests: Residents see their own; Staff/Admin see all
  static async list(req, res) {
    try {
      const filter = {};
      if (req.user.role === 'Resident') {
        filter.resident_id = req.user.resident_id;
      }
      const data = await RequestModel.getAll(filter);
      return res.json({ success: true, count: data.length, data });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = RequestController;