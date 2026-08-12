const { Router } = require('express');
const { createTicketSchema, assignTicketSchema, ticketQuerySchema } = require('../utils/validators');
const { authenticate, authorize } = require('../middleware/auth');
const {
  createTicket,
  assignTicket,
  resolveTicket,
  getAllTickets,
  getTicketById,
  getTicketStats,
  getTechnicians,
} = require('../controllers/ticketController');

const router = Router();

// Stats and metadata — must come before /:id routes
router.get('/stats', authenticate, getTicketStats);
router.get('/technicians', authenticate, getTechnicians);

// Full list with search/filter/pagination
router.get('/', authenticate, (req, res, next) => {
  const parsed = ticketQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
  }
  req.query = parsed.data;
  next();
}, getAllTickets);

// Create ticket
router.post(
  '/',
  authenticate,
  authorize('PLANT_OPERATOR', 'MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'),
  (req, res, next) => {
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }
    next();
  },
  createTicket
);

// Assign technician
router.patch(
  '/:id/assign',
  authenticate,
  authorize('MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'),
  (req, res, next) => {
    const parsed = assignTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ errors: parsed.error.flatten().fieldErrors });
    }
    next();
  },
  assignTicket
);

// Resolve ticket
router.patch(
  '/:id/resolve',
  authenticate,
  authorize('MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER'),
  resolveTicket
);

// Single ticket detail
router.get('/:id', authenticate, getTicketById);

module.exports = router;
