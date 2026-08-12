const { z } = require('zod');

const createTicketSchema = z.object({
  equipment_id: z.string().uuid('Invalid equipment ID format'),
  reported_by_user_id: z.string().uuid('Invalid user ID format'),
  assigned_technician_id: z.string().uuid('Invalid technician ID format').nullable().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  issue_description: z.string().min(10, 'Issue description must be at least 10 characters').max(2000),
});

const resolveTicketSchema = z.object({
  ticket_id: z.string().uuid('Invalid ticket ID format'),
  resolved_by_user_id: z.string().uuid('Invalid user ID format'),
});

const updateEquipmentStatusSchema = z.object({
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED']),
});

const createEquipmentSchema = z.object({
  machine_code: z.string().min(2, 'Machine code is required').max(50),
  machine_name: z.string().min(2, 'Machine name is required').max(255),
  category: z.string().max(100).nullable().optional(),
  serial_number: z.string().max(100).nullable().optional(),
  location_zone: z.string().min(2, 'Location zone is required').max(100),
  installation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').nullable().optional(),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED']).optional(),
});

const updateEquipmentSchema = z.object({
  machine_code: z.string().min(2).max(50).optional(),
  machine_name: z.string().min(2).max(255).optional(),
  category: z.string().max(100).nullable().optional(),
  serial_number: z.string().max(100).nullable().optional(),
  location_zone: z.string().min(2).max(100).optional(),
  installation_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)').nullable().optional(),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED']).optional(),
});

const equipmentQuerySchema = z.object({
  search: z.string().optional(),
  zone: z.string().optional(),
  status: z.enum(['OPERATIONAL', 'MAINTENANCE', 'DOWN', 'DECOMMISSIONED']).optional(),
  category: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const registerUserSchema = z.object({
  name: z.string().min(2).max(150),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['PLANT_OPERATOR', 'MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER']),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const assignTicketSchema = z.object({
  assigned_technician_id: z.string().uuid('Invalid technician ID format'),
});

const ticketQuerySchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
  equipment_id: z.string().uuid().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

module.exports = {
  createTicketSchema,
  resolveTicketSchema,
  updateEquipmentStatusSchema,
  createEquipmentSchema,
  updateEquipmentSchema,
  equipmentQuerySchema,
  registerUserSchema,
  loginSchema,
  assignTicketSchema,
  ticketQuerySchema,
};
