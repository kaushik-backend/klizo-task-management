const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

// Import configurations
const { connectToDatabase } = require('./config/database');
const { connectToRedis } = require('./config/redis');
const logger = require('./utils/logger');

// Import routes
// const authRoutes = require('./routes/auth');
const userRoutes= require('./routes/User')
const projectRoutes= require('./routes/project')
const issueRoutes = require('./routes/issues');
const sprintRoutes= require('./routes/sprint');
const bugRoutes= require('./routes/bug');
const backlogRoutes= require('./routes/backlog');
const reportRoutes = require('./routes/reports');
const releaseRoutes = require('./routes/release');
const { connectToAttendanceDatabase,disconnectFromAttendanceDatabase } = require('./config/attendancedb');
const { checkAndRefreshToken } = require('./services/authService');

const app = express();
const PORT = process.env.PORT || 5000;

// Global rate limiting - more lenient for development
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 1000 : 10000, // More lenient in development
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks and API docs
    return req.path === '/health' || req.path.startsWith('/api-docs');
  }
});

// Apply global rate limiting
app.use(globalLimiter);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [
    'http://localhost:3000', 
    'http://localhost:3001',
    'http://localhost:5000',
    'http://localhost:5173',
    'http://192.168.100.150:3000',
    'http://192.168.100.150:3001',
    'http://192.168.100.150:5000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware to handle protocol issues for Swagger
app.use((req, res, next) => {
  if (req.path.startsWith('/api-docs')) {
    // Set headers to prevent automatic HTTPS upgrade
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('X-Frame-Options', 'SAMEORIGIN');
    res.set('X-XSS-Protection', '1; mode=block');
  }
  next();
});

// Compression middleware
app.use(compression());

// Logging middleware
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/public', express.static(path.join(__dirname, '../public')));

// Favicon route to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.set('Content-Type', 'image/x-icon');
  res.send(''); // Empty response
});

// Swagger favicon routes to prevent 404 errors
app.get('/api-docs/favicon-32x32.png', (req, res) => {
  res.set('Content-Type', 'image/png');
  res.send(''); // Empty response
});

app.get('/api-docs/favicon-16x16.png', (req, res) => {
  res.set('Content-Type', 'image/png');
  res.send(''); // Empty response
});

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Klizo Task Management Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    defaultModelExpandDepth: 1,
  }
}));

// Alternative Swagger page with explicit HTTP URLs
app.get('/swagger', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/swagger-fix.html'));
});

// Serve Swagger JSON spec
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json(swaggerSpecs);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// checkAndRefreshToken();

// API routes
// app.use('/api/auth', authRoutes);
app.use('/api/user',userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/sprints',sprintRoutes);
// app.use('/api/bugs', bugRoutes);
app.use('/api/backlogs', backlogRoutes);
app.use('/api/reports',reportRoutes);
// app.use('/api/releases', releaseRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.error('Unhandled error:', error);

  // Handle JSON parsing errors
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON format in request body. Please check your request syntax.',
      error: error.message
    });
  }

  // Handle multer errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large'
    });
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field'
    });
  }

  // Handle validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: Object.values(error.errors).map(err => err.message)
    });
  }

  // Handle MongoDB duplicate key errors
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error response
  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  // Close server if it exists
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
  
  // Close database connections
  try {
    await require('./config/database').disconnectFromDatabase();
    await require('./config/redis').disconnectFromRedis();
    // await require('./config/attendancedb').disconnectFromAttendanceDatabase();
    logger.info('Database connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  // Close server if it exists
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }
  
  // Close database connections
  try {
    await require('./config/database').disconnectFromDatabase();
    await require('./config/redis').disconnectFromRedis();
    // await require('./config/attendancedb').disconnectFromAttendanceDatabase();
    logger.info('Database connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
});

// Global server variable for graceful shutdown
let server;

// Initialize database and start server
const startServer = async () => {
  try {
    logger.info('🚀 Starting Task management Module...');
    
    // Connect to database
    try {
      await connectToDatabase();
      // await connectToAttendanceDatabase(); // currently not using attendance-db
    } catch (dbError) {
      logger.error('❌ Database connection failed. Server cannot start without database.');
      logger.error('🔧 Please ensure MongoDB is running and accessible.');
      logger.error('💡 You can test the connection with: node test-mongodb.js');
      process.exit(1);
    }
    
    // Connect to Redis (optional)
    try {
      await connectToRedis();
    } catch (redisError) {
      logger.warn('⚠️ Redis connection failed. Continuing without Redis (caching disabled).');
    }
    
    
    // Start server - bind to all network interfaces
    server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`✅ Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`🌐 Network Access: http://192.168.100.150:${PORT}/api-docs`);
      logger.info(`🏥 Health Check: http://localhost:${PORT}/health`);
      logger.info('🎉 Task Management is ready!');
    });

    // Initialize Socket.IO
    // try {
    //   const socketService = require('./services/SocketService');
    //   socketService.initialize(server);
    //   logger.info('🔌 Socket.IO service initialized');
    // } catch (socketError) {
    //   logger.warn('⚠️ Socket.IO service failed to start. Continuing without real-time features.');
    // }

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          logger.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          logger.error(`❌ ${bind} is already in use`);
          logger.error('💡 Try using a different port or stop the existing process');
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};


// Start the server
startServer();

module.exports = app; 