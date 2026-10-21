const router = require('express').Router();
const ResidentController = require('../controllers/residentController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// Protect all resident routes with JWT authentication
router.use(authenticateToken);

// Only Administrator and Barangay Staff can query residents
router.get('/', authorizeRoles('Administrator', 'Barangay Staff'), ResidentController.getAll);
router.get('/:id', authorizeRoles('Administrator', 'Barangay Staff'), ResidentController.getById);

module.exports = router;