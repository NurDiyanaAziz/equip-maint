const { Router } = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getUsers, updateUserRole, createUser, deleteUser, getConfig, updateConfig } = require('../controllers/settingController');

const router = Router();

const adminOnly = authorize('SYSTEM_ADMIN');
const managerPlus = authorize('SYSTEM_ADMIN', 'PLANT_MANAGER');

// User management — SYSTEM_ADMIN only
router.get('/users', authenticate, adminOnly, getUsers);
router.post('/users', authenticate, adminOnly, createUser);
router.put('/users/:id/role', authenticate, adminOnly, updateUserRole);
router.delete('/users/:id', authenticate, adminOnly, deleteUser);

// Plant config & alerts — SYSTEM_ADMIN + PLANT_MANAGER
router.get('/config', authenticate, managerPlus, getConfig);
router.put('/config', authenticate, managerPlus, updateConfig);

module.exports = router;
