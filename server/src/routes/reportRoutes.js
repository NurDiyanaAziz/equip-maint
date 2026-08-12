const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const {
  getKPIs, getDowntimeByCategory, getDowntimeTrends, getTechnicianPerformance,
  getPriorityDistribution, getWorstOffenders,
} = require('../controllers/reportController');

const router = Router();

router.get('/kpis', authenticate, getKPIs);
router.get('/downtime-by-category', authenticate, getDowntimeByCategory);
router.get('/downtime-trends', authenticate, getDowntimeTrends);
router.get('/technician-performance', authenticate, getTechnicianPerformance);
router.get('/priority-distribution', authenticate, getPriorityDistribution);
router.get('/worst-offenders', authenticate, getWorstOffenders);

module.exports = router;
