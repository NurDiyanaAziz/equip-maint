const { pool } = require('../config/db');
const bcrypt = require('bcrypt');

// ===== USERS =====

const getUsers = async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role, created_at FROM users ORDER BY name ASC'
    );
    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getUsers error:', err);
    return res.status(500).json({ error: 'Failed to fetch users.' });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const valid = ['PLANT_OPERATOR', 'MAINTENANCE_TECHNICIAN', 'PLANT_MANAGER', 'SYSTEM_ADMIN'];
    if (!valid.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${valid.join(', ')}` });
    }

    const result = await pool.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, email, role, created_at',
      [role, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('updateUserRole error:', err);
    return res.status(500).json({ error: 'Failed to update role.' });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at',
      [name, email, hash, role]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('createUser error:', err);
    return res.status(500).json({ error: 'Failed to create user.' });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const count = await pool.query('SELECT COUNT(*)::int FROM users');
    if (count.rows[0].count <= 1) {
      return res.status(400).json({ error: 'Cannot delete the last user.' });
    }
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }
    return res.status(200).json({ message: 'User removed.' });
  } catch (err) {
    console.error('deleteUser error:', err);
    return res.status(500).json({ error: 'Failed to delete user.' });
  }
};

// ===== PLANT CONFIG =====

const getConfig = async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM plant_config WHERE id = 1');
    if (result.rows.length === 0) {
      return res.status(200).json({
        hourly_downtime_rate: 650, target_mttr_hours: 2.0, preventive_buffer_days: 3,
        critical_alert_webhook_url: '', enable_sms_alerts: false, enable_email_alerts: true,
      });
    }
    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('getConfig error:', err);
    return res.status(500).json({ error: 'Failed to fetch config.' });
  }
};

const updateConfig = async (req, res) => {
  try {
    const { hourly_downtime_rate, target_mttr_hours, preventive_buffer_days, critical_alert_webhook_url, enable_sms_alerts, enable_email_alerts } = req.body;

    const result = await pool.query(
      `UPDATE plant_config SET
         hourly_downtime_rate = COALESCE($1, hourly_downtime_rate),
         target_mttr_hours = COALESCE($2, target_mttr_hours),
         preventive_buffer_days = COALESCE($3, preventive_buffer_days),
         critical_alert_webhook_url = COALESCE($4, critical_alert_webhook_url),
         enable_sms_alerts = COALESCE($5, enable_sms_alerts),
         enable_email_alerts = COALESCE($6, enable_email_alerts),
         updated_at = NOW()
       WHERE id = 1
       RETURNING *`,
      [hourly_downtime_rate, target_mttr_hours, preventive_buffer_days, critical_alert_webhook_url, enable_sms_alerts, enable_email_alerts]
    );

    return res.status(200).json({ message: 'Configuration saved.', config: result.rows[0] });
  } catch (err) {
    console.error('updateConfig error:', err);
    return res.status(500).json({ error: 'Failed to update config.' });
  }
};

module.exports = { getUsers, updateUserRole, createUser, deleteUser, getConfig, updateConfig };
