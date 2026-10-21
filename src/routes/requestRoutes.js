const router = require('express').Router();
const RequestController = require('../controllers/requestController');
const authenticateToken = require('../middlewares/authMiddleware');
const authorizeRoles = require('../middlewares/roleMiddleware');

// Protect all request routes with JWT authentication
router.use(authenticateToken);

// Residents create document requests
router.post('/', authorizeRoles('Resident'), RequestController.create);

// Residents view own requests; Staff and Admin view all requests
router.get('/', authorizeRoles('Resident', 'Barangay Staff', 'Administrator'), RequestController.list);

// Staff and Admin approve, reject, or release requests
router.patch('/:id/status', authorizeRoles('Barangay Staff', 'Administrator'), RequestController.updateStatus);

module.exports = router;