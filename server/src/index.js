const express = require('express');
const cors = require('cors');
require('dotenv').config();

const ticketRoutes = require('./routes/ticketRoutes');
const equipmentRoutes = require('./routes/equipmentRoutes');
const userRoutes = require('./routes/userRoutes');
const preventiveRoutes = require('./routes/preventiveRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingRoutes = require('./routes/settingRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'EQUIP-MAINT API', timestamp: new Date().toISOString() });
});

app.use('/api/tickets', ticketRoutes);
app.use('/api/equipment', equipmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/preventive', preventiveRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingRoutes);

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`EQUIP-MAINT API server running on port ${PORT}`);
});

module.exports = app;
