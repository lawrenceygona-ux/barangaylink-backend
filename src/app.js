const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./routes/authRoutes');
const residentRoutes = require('./routes/residentRoutes');
const requestRoutes = require('./routes/requestRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// API Endpoints
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/residents', residentRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'UP',
    message: 'BarangayLink API is running healthy!',
    timestamp: new Date()
  });
});

module.exports = app;