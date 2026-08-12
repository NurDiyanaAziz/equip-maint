const { pool } = require('../config/db');

/**
 * GET /api/equipment
 * Search, filter, and paginate equipment records.
 * Query params: search, zone, status, category, page (default 1), limit (default 20)
 */
const getAllEquipment = async (req, res) => {
  try {
    const { search, zone, status, category, page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClauses = [];
    let params = [];
    let paramIndex = 1;

    if (search) {
      whereClauses.push(
        `(e.machine_code ILIKE $${paramIndex} OR e.machine_name ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (zone) {
      whereClauses.push(`e.location_zone = $${paramIndex}`);
      params.push(zone);
      paramIndex++;
    }

    if (status) {
      whereClauses.push(`e.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (category) {
      whereClauses.push(`e.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    // Exclude decommissioned by default unless explicitly filtered by status
    if (!status) {
      whereClauses.push("e.status != 'DECOMMISSIONED'");
    }

    const whereSQL = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countQuery = `SELECT COUNT(*)::int AS total FROM equipment e ${whereSQL}`;
    const countResult = await pool.query(countQuery, params);
    const total = countResult.rows[0].total;

    const dataQuery = `
      SELECT e.*,
             COALESCE(
               (SELECT ps.next_service_due
                FROM preventive_schedules ps
                WHERE ps.equipment_id = e.id
                ORDER BY ps.next_service_due DESC
                LIMIT 1)
             , NULL) AS last_serviced
      FROM equipment e
      ${whereSQL}
      ORDER BY e.machine_code ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
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
    console.error('getAllEquipment error:', err);
    return res.status(500).json({ error: 'Failed to fetch equipment.' });
  }
};

/**
 * GET /api/equipment/:id
 * Fetch machine details with full ticket history and upcoming preventive schedules.
 */
const getEquipmentById = async (req, res) => {
  try {
    const { id } = req.params;

    const equipResult = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const equipment = equipResult.rows[0];

    const ticketsResult = await pool.query(
      `SELECT mt.*,
              reporter.name AS reported_by_name,
              tech.name AS assigned_tech_name
       FROM maintenance_tickets mt
       LEFT JOIN users reporter ON mt.reported_by_user_id = reporter.id
       LEFT JOIN users tech ON mt.assigned_technician_id = tech.id
       WHERE mt.equipment_id = $1
       ORDER BY mt.created_at DESC`,
      [id]
    );

    const preventiveResult = await pool.query(
      `SELECT *
       FROM preventive_schedules
       WHERE equipment_id = $1
       ORDER BY next_service_due ASC`,
      [id]
    );

    return res.status(200).json({
      ...equipment,
      ticket_history: ticketsResult.rows,
      preventive_schedules: preventiveResult.rows,
    });
  } catch (err) {
    console.error('getEquipmentById error:', err);
    return res.status(500).json({ error: 'Failed to fetch equipment details.' });
  }
};

/**
 * POST /api/equipment
 * Register a new asset into equipment.
 */
const createEquipment = async (req, res) => {
  try {
    const { machine_code, machine_name, category, serial_number, location_zone, installation_date, status } = req.body;

    const existing = await pool.query(
      'SELECT id FROM equipment WHERE machine_code = $1',
      [machine_code]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: `Machine code "${machine_code}" already exists.` });
    }

    const result = await pool.query(
      `INSERT INTO equipment (machine_code, machine_name, category, serial_number, location_zone, installation_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        machine_code,
        machine_name,
        category || null,
        serial_number || null,
        location_zone,
        installation_date || null,
        status || 'OPERATIONAL',
      ]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createEquipment error:', err);
    return res.status(500).json({ error: 'Failed to register equipment.' });
  }
};

/**
 * PUT /api/equipment/:id
 * Update asset specs, zone, or status.
 */
const updateEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const equipResult = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    const existing = equipResult.rows[0];
    const {
      machine_code,
      machine_name,
      category,
      serial_number,
      location_zone,
      installation_date,
      status,
    } = req.body;

    if (machine_code && machine_code !== existing.machine_code) {
      const dup = await pool.query(
        'SELECT id FROM equipment WHERE machine_code = $1 AND id != $2',
        [machine_code, id]
      );
      if (dup.rows.length > 0) {
        return res.status(409).json({ error: `Machine code "${machine_code}" already in use.` });
      }
    }

    const result = await pool.query(
      `UPDATE equipment
       SET machine_code     = COALESCE($1, machine_code),
           machine_name     = COALESCE($2, machine_name),
           category         = $3,
           serial_number    = $4,
           location_zone    = COALESCE($5, location_zone),
           installation_date = $6,
           status           = COALESCE($7, status),
           updated_at       = NOW()
       WHERE id = $8
       RETURNING *`,
      [
        machine_code || null,
        machine_name || null,
        category !== undefined ? category : undefined,
        serial_number !== undefined ? serial_number : undefined,
        location_zone || null,
        installation_date !== undefined ? installation_date : undefined,
        status || null,
        id,
      ]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('updateEquipment error:', err);
    return res.status(500).json({ error: 'Failed to update equipment.' });
  }
};

/**
 * DELETE /api/equipment/:id
 * Soft-delete by setting status to DECOMMISSIONED. Preserves ticket history.
 */
const deleteEquipment = async (req, res) => {
  try {
    const { id } = req.params;

    const equipResult = await pool.query('SELECT * FROM equipment WHERE id = $1', [id]);
    if (equipResult.rows.length === 0) {
      return res.status(404).json({ error: 'Equipment not found.' });
    }

    if (equipResult.rows[0].status === 'DECOMMISSIONED') {
      return res.status(400).json({ error: 'Equipment is already decommissioned.' });
    }

    const result = await pool.query(
      `UPDATE equipment
       SET status = 'DECOMMISSIONED', updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );

    return res.status(200).json({
      message: 'Equipment decommissioned successfully.',
      equipment: result.rows[0],
    });
  } catch (err) {
    console.error('deleteEquipment error:', err);
    return res.status(500).json({ error: 'Failed to decommission equipment.' });
  }
};

const getEquipmentStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*)::int AS total_machinery,
        SUM(CASE WHEN status = 'OPERATIONAL' THEN 1 ELSE 0 END)::int AS operational,
        SUM(CASE WHEN status = 'DOWN' THEN 1 ELSE 0 END)::int AS down,
        SUM(CASE WHEN status = 'MAINTENANCE' THEN 1 ELSE 0 END)::int AS maintenance,
        (SELECT COALESCE(ROUND(AVG(downtime_hours), 1), 0) FROM maintenance_tickets WHERE downtime_hours IS NOT NULL) AS avg_mttr_hours
      FROM equipment e
      WHERE e.status != 'DECOMMISSIONED'
    `);
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getEquipmentStats error:', err);
    return res.status(500).json({ error: 'Failed to fetch stats.' });
  }
};

const getUpcomingPreventive = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT ps.*, e.machine_code, e.machine_name, e.location_zone
      FROM preventive_schedules ps
      JOIN equipment e ON ps.equipment_id = e.id
      WHERE ps.next_service_due <= CURRENT_DATE + INTERVAL '7 days'
        AND e.status != 'DECOMMISSIONED'
      ORDER BY ps.next_service_due ASC
      LIMIT 10
    `);
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getUpcomingPreventive error:', err);
    return res.status(500).json({ error: 'Failed to fetch preventive schedules.' });
  }
};

const getEquipmentCategories = async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT category FROM equipment WHERE category IS NOT NULL AND status != 'DECOMMISSIONED' ORDER BY category`
    );
    return res.status(200).json(result.rows.map((r) => r.category));
  } catch (err) {
    console.error('getEquipmentCategories error:', err);
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
};

module.exports = {
  getAllEquipment,
  getEquipmentById,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getEquipmentStats,
  getUpcomingPreventive,
  getEquipmentCategories,
};
