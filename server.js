const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();

const app = express();

// Passport configuration
require('./config/passport')(passport);

// Enhanced CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'https://warehouse-api-bq02.onrender.com',
    process.env.CLIENT_URL
  ].filter(Boolean), // Remove any undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With']
}));

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session middleware (required for OAuth)
app.use(session({
  secret: process.env.SESSION_SECRET || 'warehouse_session_secret_2024',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport middleware (MUST be after session middleware)
app.use(passport.initialize());
app.use(passport.session());

// Database connection
const connectDB = require('./config/database');
connectDB();

// Swagger Documentation
require('./config/swagger')(app);

// Routes
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/auth', require('./routes/auth')); // New authentication routes

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true,
    message: 'Warehouse API is running', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    authentication: 'OAuth & JWT enabled'
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({ 
    success: true,
    message: 'Warehouse Management API',
    version: '1.0.0',
    authentication: {
      googleOAuth: '/api/auth/google',
      register: '/api/auth/register',
      login: '/api/auth/login',
      profile: '/api/auth/me'
    },
    documentation: '/api-docs',
    endpoints: {
      products: '/api/products',
      orders: '/api/orders',
      auth: '/api/auth',
      health: '/api/health'
    }
  });
});

// Root endpoint - redirect to API docs
app.get('/', (req, res) => {
  res.redirect('/api-docs');
});

// OAuth success redirect (optional endpoint for testing)
app.get('/auth/success', (req, res) => {
  res.json({
    success: true,
    message: 'OAuth authentication successful',
    user: req.user || 'No user session'
  });
});

// OAuth failure redirect (optional endpoint for testing)
app.get('/auth/failure', (req, res) => {
  res.status(401).json({
    success: false,
    message: 'OAuth authentication failed'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error Stack:', err.stack);
  
  // Passport authentication errors
  if (err.name === 'AuthenticationError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: err.message
    });
  }
  
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
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `Duplicate ${field} entered`,
      error: `${field} already exists`
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

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default server error
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
      auth: '/api/auth',
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
      console.log(`🔐 Authentication: http://localhost:${PORT}/api/auth`);
      console.log(`🏥 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📍 Production URL: https://warehouse-api-bq02.onrender.com`);
      console.log(`✅ OAuth & JWT Authentication: Enabled`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = app;