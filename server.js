const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Enhanced CORS configuration
app.use(cors({
  origin: ['http://localhost:3000', 'https://warehouse-api-bq02.onrender.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
const connectDB = require('./config/database');
connectDB();

// Swagger Documentation
require('./config/swagger')(app);

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Warehouse API is running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({ 
    success: true,
    message: 'Warehouse Management API',
    version: '1.0.0',
    documentation: '/api-docs',
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      health: '/api/health'
    }
  });
});

// Root endpoint - redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field value entered',
      error: err.message
    });
  }
  
  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Resource not found',
      error: 'Invalid ID format'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - MUST be last middleware
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    availableEndpoints: {
      documentation: '/api-docs',
      products: '/api/products',
      orders: '/api/orders',
      health: '/api/health',
      apiInfo: '/api'
    }
  });
});

const PORT = process.env.PORT || 3000;

// Enhanced server startup
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/warehouse');
    console.log('✅ Connected to MongoDB');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Production URL: https://warehouse-api-bq02.onrender.com`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;