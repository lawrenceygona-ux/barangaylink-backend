const router = require('express').Router();
const DashboardController = require('../controllers/dashboardController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// Dashboard summary counts (Admin & Staff only)
router.get('/', authenticateToken, authorizeRoles('Administrator', 'Barangay Staff'), DashboardController.getSummary);

module.exports = router;