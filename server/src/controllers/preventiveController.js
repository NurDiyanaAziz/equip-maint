const { pool } = require('../config/db');

/**
 * GET /api/preventive
 * List with dynamic status (OVERDUE / DUE_SOON / UPCOMING), filters, search
 */
const getAllPreventive = async (req, res) => {
  try {
    const { status, equipment_id, search, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    const whereClauses = [];
    const params = [];
    let paramIndex = 1;

    if (equipment_id) {
      whereClauses.push(`ps.equipment_id = $${paramIndex++}`);
      params.push(equipment_id);
    }

    if (search) {
      whereClauses.push(
        `(ps.task_name ILIKE $${paramIndex} OR e.machine_code ILIKE $${paramIndex} OR e.machine_name ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      if (status === 'OVERDUE') {
        whereClauses.push(`ps.next_service_due < CURRENT_DATE`);
      } else if (status === 'DUE_SOON') {
        whereClauses.push(`ps.next_service_due >= CURRENT_DATE AND ps.next_service_due <= CURRENT_DATE + INTERVAL '3 days'`);
      } else if (status === 'UPCOMING') {
        whereClauses.push(`ps.next_service_due > CURRENT_DATE + INTERVAL '3 days'`);
      }
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const baseSelect = `
      SELECT ps.*,
             e.machine_code, e.machine_name, e.location_zone,
             tech.name AS assigned_tech_name,
             CASE
               WHEN ps.next_service_due < CURRENT_DATE THEN 'OVERDUE'
               WHEN ps.next_service_due <= CURRENT_DATE + INTERVAL '3 days' THEN 'DUE_SOON'
               ELSE 'UPCOMING'
             END AS computed_status
      FROM preventive_schedules ps
      JOIN equipment e ON ps.equipment_id = e.id
      LEFT JOIN users tech ON ps.assigned_technician_id = tech.id
    `;

    const countResult = await pool.query(`SELECT COUNT(*)::int AS total FROM (${baseSelect} ${whereSQL}) sub`, params);
    const total = countResult.rows[0].total;

    const dataQuery = `${baseSelect} ${whereSQL} ORDER BY ps.next_service_due ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    const dataParams = [...params, Number(limit), offset];
    const dataResult = await pool.query(dataQuery, dataParams);

    return res.status(200).json({
      data: dataResult.rows,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
    });
  } catch (err) {
    console.error('getAllPreventive error:', err);
    return res.status(500).json({ error: 'Failed to fetch preventive schedules.' });
  }
};

/**
 * POST /api/preventive
 * Create schedule, auto-calculate next_service_due
 */
const createPreventive = async (req, res) => {
  try {
    const { equipment_id, task_name, frequency_days, last_serviced_date, assigned_technician_id } = req.body;

    const result = await pool.query(
      `INSERT INTO preventive_schedules
         (equipment_id, task_name, frequency_days, last_serviced_date, next_service_due, assigned_technician_id)
       VALUES ($1, $2, $3, $4, $4::DATE + $3 * INTERVAL '1 day', $5)
       RETURNING *`,
      [equipment_id, task_name, frequency_days, last_serviced_date, assigned_technician_id || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createPreventive error:', err);
    return res.status(500).json({ error: 'Failed to create schedule.' });
  }
};

/**
 * PATCH /api/preventive/:id/complete
 * Complete task, rollover dates: last_serviced = TODAY, next_service = TODAY + frequency_days
 */
const completePreventive = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await pool.query('SELECT * FROM preventive_schedules WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Schedule not found.' });
    }

    const result = await pool.query(
      `UPDATE preventive_schedules
       SET last_serviced_date = CURRENT_DATE,
           next_service_due = CURRENT_DATE + (frequency_days * INTERVAL '1 day'),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({ message: 'Task completed. Next service date rolled forward.', schedule: result.rows[0] });
  } catch (err) {
    console.error('completePreventive error:', err);
    return res.status(500).json({ error: 'Failed to complete task.' });
  }
};

/**
 * POST /api/preventive/:id/escalate-defect
 * Transaction: flag task as done, create open ticket, set equipment DOWN
 */
const escalateDefect = async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { issue_description, priority, reported_by_user_id } = req.body;

    const schedule = await client.query('SELECT * FROM preventive_schedules WHERE id = $1 FOR UPDATE', [id]);
    if (schedule.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Schedule not found.' });
    }

    const sched = schedule.rows[0];

    await client.query('BEGIN');

    // Mark schedule as completed (roll over dates)
    await client.query(
      `UPDATE preventive_schedules
       SET last_serviced_date = CURRENT_DATE,
           next_service_due = CURRENT_DATE + (frequency_days * INTERVAL '1 day'),
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    // Create maintenance ticket
    const ticket = await client.query(
      `INSERT INTO maintenance_tickets
         (equipment_id, reported_by_user_id, priority, issue_description, ticket_status)
       VALUES ($1, $2, $3, $4, 'OPEN')
       RETURNING *`,
      [sched.equipment_id, reported_by_user_id, priority || 'HIGH', issue_description]
    );

    // Set equipment DOWN
    await client.query(
      "UPDATE equipment SET status = 'DOWN', updated_at = NOW() WHERE id = $1",
      [sched.equipment_id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      message: 'Defect escalated from preventive inspection. Equipment set to DOWN.',
      ticket: ticket.rows[0],
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('escalateDefect error:', err);
    return res.status(500).json({ error: 'Failed to escalate defect.' });
  } finally {
    client.release();
  }
};

/**
 * GET /api/preventive/stats
 * KPI summary
 */
const getPreventiveStats = async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total,
        SUM(CASE WHEN next_service_due < CURRENT_DATE THEN 1 ELSE 0 END)::int AS overdue,
        SUM(CASE WHEN next_service_due >= CURRENT_DATE AND next_service_due <= CURRENT_DATE + INTERVAL '7 days' THEN 1 ELSE 0 END)::int AS due_this_week,
        ROUND(
          (SUM(CASE WHEN last_serviced_date >= CURRENT_DATE - INTERVAL '90 days' THEN 1 ELSE 0 END)::numeric /
           NULLIF(COUNT(*), 0) * 100), 1
        ) AS completion_rate
      FROM preventive_schedules
    `);
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getPreventiveStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

/**
 * GET /api/preventive/:id
 */
const getPreventiveById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT ps.*, e.machine_code, e.machine_name, e.location_zone, e.status AS equipment_status,
              tech.name AS assigned_tech_name
       FROM preventive_schedules ps
       JOIN equipment e ON ps.equipment_id = e.id
       LEFT JOIN users tech ON ps.assigned_technician_id = tech.id
       WHERE ps.id = $1`,
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found.' });
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getPreventiveById error:', err);
    return res.status(500).json({ error: 'Failed to fetch schedule.' });
  }
};

module.exports = { getAllPreventive, createPreventive, completePreventive, escalateDefect, getPreventiveStats, getPreventiveById };
