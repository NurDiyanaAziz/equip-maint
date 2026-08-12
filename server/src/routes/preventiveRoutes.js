const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAllPreventive, createPreventive, completePreventive, escalateDefect, getPreventiveStats, getPreventiveById,
} = require('../controllers/preventiveController');

const router = Router();

router.get('/stats', authenticate, getPreventiveStats);
router.get('/', authenticate, getAllPreventive);
router.get('/:id', authenticate, getPreventiveById);

router.post('/', authenticate, authorize('MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'), createPreventive);

router.patch('/:id/complete', authenticate, authorize('MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'), completePreventive);

router.post('/:id/escalate-defect', authenticate, authorize('MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'), escalateDefect);

module.exports = router;
