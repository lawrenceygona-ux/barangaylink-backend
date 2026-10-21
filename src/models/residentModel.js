const db = require('../config/db');

class ResidentModel {
  // Fetches residents and computes their age dynamically via fn_calculate_age()
  static async getAll({ search, purok_zone, status }) {
    let query = `
      SELECT id, first_name, middle_name, last_name, suffix, birthdate,
             fn_calculate_age(birthdate) AS age,
             gender, civil_status, purok_zone, address_line, contact_number, is_archived, created_at
      FROM residents
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      query += ` AND (first_name ILIKE $${params.length} OR last_name ILIKE $${params.length})`;
    }
    if (purok_zone) {
      params.push(purok_zone);
      query += ` AND purok_zone = $${params.length}`;
    }
    if (status !== undefined) {
      params.push(status === 'archived');
      query += ` AND is_archived = $${params.length}`;
    }

    query += ` ORDER BY last_name ASC;`;
    const result = await db.query(query, params);
    return result.rows;
  }

  static async getById(id) {
    const query = `
      SELECT id, first_name, middle_name, last_name, suffix, birthdate,
             fn_calculate_age(birthdate) AS age,
             gender, civil_status, purok_zone, address_line, contact_number, is_archived, created_at
      FROM residents
      WHERE id = $1;
    `;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = ResidentModel;