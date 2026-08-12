const { pool } = require('../config/db');

/**
 * CREATE TICKET
 * POST /api/tickets
 * Transaction: inserts ticket + sets equipment.status = 'DOWN'.
 */
const createTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    const { equipment_id, reported_by_user_id, assigned_technician_id, priority, issue_description } = req.body;

    await client.query('BEGIN');

    const equipResult = await client.query(
      'SELECT id, status FROM equipment WHERE id = $1 FOR UPDATE',
      [equipment_id]
    );
    if (equipResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const ticketResult = await client.query(
      `INSERT INTO maintenance_tickets
         (equipment_id, reported_by_user_id, assigned_technician_id, priority, issue_description, ticket_status)
       VALUES ($1, $2, $3, $4, $5, 'OPEN')
       RETURNING *`,
      [equipment_id, reported_by_user_id, assigned_technician_id, priority, issue_description]
    );

    await client.query(
      'UPDATE equipment SET status = $1, updated_at = NOW() WHERE id = $2',
      ['DOWN', equipment_id]
    );

    await client.query('COMMIT');

    // Fetch full joined data for the response
    const full = await pool.query(
      `SELECT mt.*, e.machine_code, e.machine_name, e.location_zone,
              reporter.name AS reported_by_name,
              tech.name AS assigned_tech_name
       FROM maintenance_tickets mt
       JOIN equipment e ON mt.equipment_id = e.id
       LEFT JOIN users reporter ON mt.reported_by_user_id = reporter.id
       LEFT JOIN users tech ON mt.assigned_technician_id = tech.id
       WHERE mt.id = $1`,
      [ticketResult.rows[0].id]
    );

    return res.status(201).json({
      message: 'Defect ticket created. Equipment status set to DOWN.',
      ticket: full.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createTicket error:', err);
    return res.status(500).json({ error: 'Failed to create ticket.' });
  } finally {
    client.release();
  }
};

/**
 * ASSIGN TICKET
 * PATCH /api/tickets/:id/assign
 * Sets assigned_technician_id and updates status to IN_PROGRESS.
 */
const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_technician_id } = req.body;

    const ticket = await pool.query('SELECT * FROM maintenance_tickets WHERE id = $1', [id]);
    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    if (ticket.rows[0].ticket_status === 'RESOLVED') {
      return res.status(400).json({ error: 'Cannot assign a resolved ticket.' });
    }

    const result = await pool.query(
      `UPDATE maintenance_tickets
       SET assigned_technician_id = $1, ticket_status = 'IN_PROGRESS'
       WHERE id = $2
       RETURNING *`,
      [assigned_technician_id, id]
    );

    // Set equipment to MAINTENANCE if not already DOWN
    const eq = await pool.query('SELECT id, status FROM equipment WHERE id = $1', [ticket.rows[0].equipment_id]);
    if (eq.rows[0].status !== 'DOWN') {
      await pool.query("UPDATE equipment SET status = 'MAINTENANCE', updated_at = NOW() WHERE id = $1", [eq.rows[0].id]);
    }

    return res.status(200).json({
      message: 'Ticket assigned. Status set to IN_PROGRESS.',
      ticket: result.rows[0],
    });
  } catch (err) {
    console.error('assignTicket error:', err);
    return res.status(500).json({ error: 'Failed to assign ticket.' });
  }
};

/**
 * RESOLVE TICKET
 * PATCH /api/tickets/:id/resolve
 * Transaction: computes downtime_hours via SQL, marks RESOLVED, restores equipment to OPERATIONAL.
 */
const resolveTicket = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const ticketResult = await client.query(
      'SELECT * FROM maintenance_tickets WHERE id = $1 FOR UPDATE',
      [id]
    );
    if (ticketResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    const ticket = ticketResult.rows[0];
    if (ticket.ticket_status === 'RESOLVED') {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Ticket is already resolved.' });
    }

    // Compute downtime via SQL for accuracy
    const updatedTicket = await client.query(
      `UPDATE maintenance_tickets
       SET ticket_status = 'RESOLVED',
           resolved_at = NOW(),
           downtime_hours = ROUND(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600.0, 2)
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    await client.query(
      "UPDATE equipment SET status = 'OPERATIONAL', updated_at = NOW() WHERE id = $1",
      [ticket.equipment_id]
    );

    await client.query('COMMIT');

    return res.status(200).json({
      message: 'Ticket resolved. Equipment restored to OPERATIONAL.',
      ticket: updatedTicket.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('resolveTicket error:', err);
    return res.status(500).json({ error: 'Failed to resolve ticket.' });
  } finally {
    client.release();
  }
};

/**
 * GET ALL TICKETS
 * GET /api/tickets
 * Supports: status, priority, equipment_id, search (ticket id, machine code, issue), page, limit
 */
const getAllTickets = async (req, res) => {
  try {
    const { status, priority, equipment_id, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (status) {
      whereClauses.push(`mt.ticket_status = $${paramIndex++}`);
      params.push(status);
    }
    if (priority) {
      whereClauses.push(`mt.priority = $${paramIndex++}`);
      params.push(priority);
    }
    if (equipment_id) {
      whereClauses.push(`mt.equipment_id = $${paramIndex++}`);
      params.push(equipment_id);
    }
    if (search) {
      whereClauses.push(
        `(mt.id::text ILIKE $${paramIndex} OR e.machine_code ILIKE $${paramIndex} OR mt.issue_description ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const baseSelect = `
      SELECT mt.*,
             e.machine_code, e.machine_name, e.location_zone,
             reporter.name AS reported_by_name,
             tech.name AS assigned_tech_name
      FROM maintenance_tickets mt
      JOIN equipment e ON mt.equipment_id = e.id
      LEFT JOIN users reporter ON mt.reported_by_user_id = reporter.id
      LEFT JOIN users tech ON mt.assigned_technician_id = tech.id
    `;

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM (${baseSelect} ${whereSQL}) sub`, params);
    const total = countResult.rows[0].total;

    const dataQuery = `${baseSelect} ${whereSQL} ORDER BY mt.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const dataParams = [...params, Number(limit), offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    return res.status(200).json({
      data: dataResult.rows,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('getAllTickets error:', err);
    return res.status(500).json({ error: 'Failed to fetch tickets.' });
  }
};

/**
 * GET TICKET BY ID
 * GET /api/tickets/:id
 */
const getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT mt.*,
              e.machine_code, e.machine_name, e.location_zone, e.serial_number, e.category,
              reporter.name AS reported_by_name,
              tech.name AS assigned_tech_name
       FROM maintenance_tickets mt
       JOIN equipment e ON mt.equipment_id = e.id
       LEFT JOIN users reporter ON mt.reported_by_user_id = reporter.id
       LEFT JOIN users tech ON mt.assigned_technician_id = tech.id
       WHERE mt.id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getTicketById error:', err);
    return res.status(500).json({ error: 'Failed to fetch ticket.' });
  }
};

/**
 * GET TICKET STATS
 * GET /api/tickets/stats
 * Returns KPI counts for the dashboard cards.
 */
const getTicketStats = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        SUM(CASE WHEN ticket_status IN ('OPEN', 'IN_PROGRESS') THEN 1 ELSE 0 END)::int AS open_total,
        SUM(CASE WHEN ticket_status IN ('OPEN', 'IN_PROGRESS') AND priority = 'CRITICAL' THEN 1 ELSE 0 END)::int AS critical,
        SUM(CASE WHEN ticket_status = 'IN_PROGRESS' THEN 1 ELSE 0 END)::int AS in_progress,
        SUM(CASE WHEN ticket_status = 'RESOLVED' AND resolved_at::date = CURRENT_DATE THEN 1 ELSE 0 END)::int AS resolved_today
      FROM maintenance_tickets
    `);
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getTicketStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch ticket stats.' });
  }
};

/**
 * GET TECHNICIANS
 * GET /api/tickets/technicians
 * Returns list of maintenance technicians for assignment dropdown.
 */
const getTechnicians = async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM users WHERE role = 'MAINTENANCE_TECHNICIAN' ORDER BY name"
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getTechnicians error:', err);
    return res.status(500).json({ error: 'Failed to fetch technicians.' });
  }
};

module.exports = {
  createTicket,
  assignTicket,
  resolveTicket,
  getAllTickets,
  getTicketById,
  getTicketStats,
  getTechnicians,
};
