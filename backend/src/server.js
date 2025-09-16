const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createServer } = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const connectDB = require('./config/database');
const logger = require('./utils/logger');
const { errorHandler } = require('./middleware/errorHandler');
const authMiddleware = require('./middleware/auth');

// Import routes (minimal)
const authRoutes = require('./routes/auth');
const moderationRoutes = require('./routes/moderation');

// Services trimmed for minimal boot

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

// Connect to database (allow disabling for minimal boot)
if (process.env.DISABLE_DB === 'true') {
  logger.warn('Database connection disabled via DISABLE_DB');
} else {
  connectDB();
}

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
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression middleware
app.use(compression());

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-refresh-token']
}));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root endpoint for platform health checks (Render defaults to "/")
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'InstaBot backend running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Support HEAD on root for lightweight health probes
app.head('/', (req, res) => {
  res.status(200).end();
});

// API routes (minimal)
app.use('/api/auth', authRoutes);
app.use('/api/moderation', moderationRoutes);

// Webhook routes omitted in minimal boot

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);
  
  socket.on('join-room', (userId) => {
    socket.join(`user-${userId}`);
    logger.info(`User ${userId} joined room`);
  });
  
  socket.on('disconnect', () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// Make io available to other modules
app.set('io', io);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

console.log(`🎯 Attempting to start server on port ${PORT}...`);

server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`✅ Server successfully listening on port ${PORT}`);
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  
  // Log successful startup
  console.log('🚀 Server startup complete:');
  console.log(`  - Port: ${PORT}`);
  console.log(`  - Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`  - PID: ${process.pid}`);
  console.log(`  - Platform: ${process.platform}`);
  console.log(`  - Node Version: ${process.version}`);
  
  // Services initialization omitted in minimal boot
});

server.on('error', (error) => {
  console.error('🔴 Server error:', error);
  logger.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  }
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('🔴 SERVER.JS - Uncaught Exception:', err);
  logger.error('Uncaught Exception:', err);
  // Do not exit immediately; let platform logs capture details
});

process.on('unhandledRejection', (err) => {
  console.error('🔴 SERVER.JS - Unhandled Rejection:', err);
  logger.error('Unhandled Rejection:', err);
  // Do not exit immediately; let platform logs capture details
});

module.exports = app;
