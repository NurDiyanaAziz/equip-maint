const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentQuerySchema,
} = require('../utils/validators');
const {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentStats,
  getUpcomingPreventive,
  getEquipmentCategories,
} = require('../controllers/equipmentController');

const router = Router();

// Stats & metadata
router.get('/stats', authenticate, getEquipmentStats);
router.get('/categories', authenticate, getEquipmentCategories);
router.get('/preventive/upcoming', authenticate, getUpcomingPreventive);

// Full list with search/filter/pagination
router.get('/', authenticate, (req, res, next) => {
  const parsed = equipmentQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  req.query = parsed.data;
  next();
}, getAllEquipment);

// Single equipment with ticket history
router.get('/:id', authenticate, getEquipmentById);

// Create new asset
router.post(
  '/',
  authenticate,
  authorize('PLANT_MANAGER', 'MAINTENANCE_TECHNICIAN'),
  (req, res, next) => {
    const parsed = createEquipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }
    next();
  },
  createEquipment
);

// Update asset
router.put(
  '/:id',
  authenticate,
  authorize('PLANT_MANAGER', 'MAINTENANCE_TECHNICIAN'),
  (req, res, next) => {
    const parsed = updateEquipmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }
    next();
  },
  updateEquipment
);

// Decommission (soft-delete)
router.delete(
  '/:id',
  authenticate,
  authorize('PLANT_MANAGER'),
  deleteEquipment
);

module.exports = router;
