const { pool } = require('../config/db');

/**
 * GET /api/reports/kpis?range=7d|30d|90d|1y
 */
const getKPIs = async (req, res) => {
  try {
    const { range = '30d' } = req.query;

    const rangeMap = {
      '7d': "INTERVAL '7 days'",
      '30d': "INTERVAL '30 days'",
      '90d': "INTERVAL '90 days'",
      '1y': "INTERVAL '365 days'",
    };
    const interval = rangeMap[range] || rangeMap['30d'];

    const prevInterval = range === '1y' ? "INTERVAL '730 days'" : `(${interval} * 2)`;

    // Current period KPIs
    const curr = await pool.query(`
      SELECT
        COALESCE(SUM(mt.downtime_hours), 0) AS total_downtime_hours,
        COALESCE(ROUND(AVG(mt.downtime_hours), 1), 0) AS avg_mttr_hours,
        COUNT(mt.id)::int AS total_tickets
      FROM maintenance_tickets mt
      WHERE mt.created_at >= NOW() - ${interval}
    `);

    // Previous period for comparison
    const prev = await pool.query(`
      SELECT
        COALESCE(SUM(mt.downtime_hours), 0) AS total_downtime_hours
      FROM maintenance_tickets mt
      WHERE mt.created_at >= NOW() - ${prevInterval}
        AND mt.created_at < NOW() - ${interval}
    `);

    // PM compliance: completed vs all scheduled in period
    const pm = await pool.query(`
      SELECT
        COUNT(*)::int AS total_scheduled,
        SUM(CASE WHEN last_serviced_date >= CURRENT_DATE - (${interval}) THEN 1 ELSE 0 END)::int AS completed
      FROM preventive_schedules
    `);

    const downtimeHours = parseFloat(curr.rows[0].total_downtime_hours);
    const prevDowntimeHours = parseFloat(prev.rows[0].total_downtime_hours);
    const downtimeCost = Math.round(downtimeHours * 650);
    const prevDowntimeCost = Math.round(prevDowntimeHours * 650);
    const costChange = prevDowntimeCost > 0
      ? Math.round(((downtimeCost - prevDowntimeCost) / prevDowntimeCost) * 100)
      : 0;
    const pmRate = pm.rows[0].total_scheduled > 0
      ? parseFloat(((pm.rows[0].completed / pm.rows[0].total_scheduled) * 100).toFixed(1))
      : 100;

    return res.status(200).json({
      total_downtime_hours: downtimeHours,
      downtime_cost: downtimeCost,
      downtime_cost_change: costChange,
      avg_mttr_hours: parseFloat(curr.rows[0].avg_mttr_hours),
      total_tickets: curr.rows[0].total_tickets,
      pm_compliance_rate: pmRate,
    });
  } catch (err) {
    console.error('getKPIs error:', err);
    return res.status(500).json({ error: 'Failed to fetch KPIs.' });
  }
};

/**
 * GET /api/reports/downtime-by-category?range=30d
 */
const getDowntimeByCategory = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const rangeMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = rangeMap[range] || 30;

    const result = await pool.query(
      `SELECT
         COALESCE(e.category, 'Uncategorised') AS category,
         COALESCE(SUM(mt.downtime_hours), 0) AS total_downtime_hours,
         COUNT(mt.id)::int AS ticket_count
       FROM maintenance_tickets mt
       JOIN equipment e ON mt.equipment_id = e.id
       WHERE mt.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY e.category
       ORDER BY total_downtime_hours DESC`,
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getDowntimeByCategory error:', err);
    return res.status(500).json({ error: 'Failed to fetch category breakdown.' });
  }
};

/**
 * GET /api/reports/downtime-trends?range=1y
 */
const getDowntimeTrends = async (req, res) => {
  try {
    const { range = '1y' } = req.query;
    const rangeMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = rangeMap[range] || 365;

    // Group by month if >90 days, otherwise by week
    const trunc = days > 90 ? 'month' : 'week';

    const result = await pool.query(
      `SELECT
         DATE_TRUNC('${trunc}', DATE(created_at)) AS period,
         COALESCE(SUM(downtime_hours), 0) AS downtime_hours,
         COUNT(*)::int AS ticket_count
       FROM maintenance_tickets
       WHERE created_at >= NOW() - INTERVAL '${days} days'
         AND downtime_hours IS NOT NULL
       GROUP BY period
       ORDER BY period ASC`,
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getDowntimeTrends error:', err);
    return res.status(500).json({ error: 'Failed to fetch downtime trends.' });
  }
};

/**
 * GET /api/reports/technician-performance?range=30d
 */
const getTechnicianPerformance = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const rangeMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = rangeMap[range] || 30;

    const result = await pool.query(
      `SELECT
         tech.name AS technician_name,
         COUNT(mt.id)::int AS resolved_tickets,
         ROUND(AVG(mt.downtime_hours)::numeric, 1) AS avg_mttr_hours
       FROM maintenance_tickets mt
       JOIN users tech ON mt.assigned_technician_id = tech.id
       WHERE mt.created_at >= NOW() - INTERVAL '${days} days'
         AND mt.ticket_status = 'RESOLVED'
         AND mt.downtime_hours IS NOT NULL
       GROUP BY tech.name
       ORDER BY resolved_tickets DESC`,
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getTechnicianPerformance error:', err);
    return res.status(500).json({ error: 'Failed to fetch technician performance.' });
  }
};

/**
 * GET /api/reports/priority-distribution?range=30d
 */
const getPriorityDistribution = async (req, res) => {
  try {
    const { range = '30d' } = req.query;
    const rangeMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = rangeMap[range] || 30;

    const result = await pool.query(
      `SELECT
         priority,
         COUNT(*)::int AS count
       FROM maintenance_tickets
       WHERE created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY priority
       ORDER BY count DESC`,
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getPriorityDistribution error:', err);
    return res.status(500).json({ error: 'Failed to fetch priority distribution.' });
  }
};

/**
 * GET /api/reports/worst-offenders?range=30d&limit=5
 */
const getWorstOffenders = async (req, res) => {
  try {
    const { range = '30d', limit = 5 } = req.query;
    const rangeMap = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 };
    const days = rangeMap[range] || 30;

    const limitClause = Number(limit) > 0 ? `LIMIT ${Number(limit)}` : '';

    const result = await pool.query(
      `SELECT
         e.machine_code,
         e.machine_name,
         e.location_zone,
         e.category,
         COUNT(mt.id)::int AS failure_count,
         COALESCE(SUM(mt.downtime_hours), 0) AS total_downtime,
         COALESCE(ROUND(SUM(mt.downtime_hours) * 650), 0) AS est_loss
       FROM maintenance_tickets mt
       JOIN equipment e ON mt.equipment_id = e.id
       WHERE mt.created_at >= NOW() - INTERVAL '${days} days'
       GROUP BY e.id, e.machine_code, e.machine_name, e.location_zone, e.category
       ORDER BY total_downtime DESC
       ${limitClause}`,
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getWorstOffenders error:', err);
    return res.status(500).json({ error: 'Failed to fetch worst offenders.' });
  }
};

module.exports = {
  getKPIs,
  getDowntimeByCategory,
  getDowntimeTrends,
  getTechnicianPerformance,
  getPriorityDistribution,
  getWorstOffenders,
};
