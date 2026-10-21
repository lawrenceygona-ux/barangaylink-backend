const db = require('../config/db');

class AuthModel {
  // Calls PostgreSQL Stored Procedure: sp_register_resident_user
  static async registerResidentUser(userData) {
    const {
      email,
      password_hash,
      first_name,
      middle_name,
      last_name,
      birthdate,
      gender,
      purok_zone,
      address_line,
      contact_number
    } = userData;

    const query = `
      CALL sp_register_resident_user($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL);
    `;
    const values = [
      email,
      password_hash,
      first_name,
      middle_name || null,
      last_name,
      birthdate,
      gender,
      purok_zone,
      address_line,
      contact_number || null
    ];

    const result = await db.query(query, values);
    return result.rows[0];
  }

  static async findUserByEmail(email) {
    const query = `
      SELECT u.id, u.email, u.password_hash, u.role, u.is_active,
             r.id AS resident_id, r.first_name, r.last_name
      FROM users u
      LEFT JOIN residents r ON u.id = r.user_id
      WHERE u.email = $1;
    `;
    const result = await db.query(query, [email]);
    return result.rows[0];
  }
}

module.exports = AuthModel;