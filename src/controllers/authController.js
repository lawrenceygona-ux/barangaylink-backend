const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const AuthModel = require('../models/authModel');

class AuthController {
  static async register(req, res) {
    try {
      const {
        email, password, first_name, middle_name,
        last_name, birthdate, gender, purok_zone,
        address_line, contact_number
      } = req.body;

      // Validation
      if (!email || !password || !first_name || !last_name || !birthdate || !purok_zone || !address_line) {
        return res.status(400).json({
          success: false,
          message: 'Please fill all required fields (email, password, first_name, last_name, birthdate, purok_zone, address_line).'
        });
      }

      // Hash password with bcrypt
      const salt = await bcrypt.genSalt(10);
      const password_hash = await bcrypt.hash(password, salt);

      // Call Stored Procedure via Model
      await AuthModel.registerResidentUser({
        email, password_hash, first_name, middle_name,
        last_name, birthdate, gender, purok_zone,
        address_line, contact_number
      });

      return res.status(201).json({
        success: true,
        message: 'Resident account registered successfully!'
      });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  static async login(req, res) {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
      }

      const user = await AuthModel.findUserByEmail(email);
      if (!user || !user.is_active) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Generate JWT Token
      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          resident_id: user.resident_id
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
      );

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          resident_id: user.resident_id,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim()
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = AuthController;