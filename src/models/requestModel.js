const db = require('../config/db');

class RequestModel {
  static async create(resident_id, document_type, purpose) {
    // Generates unique tracking number using PostgreSQL function fn_generate_tracking_number()
    const trackRes = await db.query(`SELECT fn_generate_tracking_number() AS tracking_number;`);
    const trackingNumber = trackRes.rows[0].tracking_number;

    const insertQuery = `
      INSERT INTO document_requests (tracking_number, resident_id, document_type, purpose)
      VALUES ($1, $2, $3, $4)
      RETURNING *;
    `;
    const result = await db.query(insertQuery, [trackingNumber, resident_id, document_type, purpose]);
    return result.rows[0];
  }

  static async updateStatus(requestId, newStatus, processedBy, remarks) {
    // Calls PostgreSQL Stored Procedure: sp_update_request_status
    // This will trigger fn_audit_document_requests() automatically to log in audit_logs!
    const query = `CALL sp_update_request_status($1, $2, $3, $4);`;
    await db.query(query, [requestId, newStatus, processedBy, remarks]);
    return { success: true };
  }

  static async getAll(filter = {}) {
    let query = `
      SELECT dr.*, 
             r.first_name, r.last_name, r.purok_zone, r.contact_number,
             u.email AS processor_email
      FROM document_requests dr
      JOIN residents r ON dr.resident_id = r.id
      LEFT JOIN users u ON dr.processed_by = u.id
    `;
    const params = [];

    if (filter.resident_id) {
      params.push(filter.resident_id);
      query += ` WHERE dr.resident_id = $1`;
    }

    query += ` ORDER BY dr.created_at DESC;`;
    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = RequestModel;