const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error Handler:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: req.userId || 'anonymous',
    timestamp: new Date().toISOString()
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = { message, statusCode: 400 };
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors).map(val => val.message).join(', ');
    error = { message, statusCode: 400 };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = { message, statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = { message, statusCode: 401 };
  }

  // Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    const message = err.message || 'Payment processing error';
    error = { message, statusCode: 402 };
  }

  // Rate limiting errors
  if (err.status === 429) {
    const message = 'Too many requests, please try again later';
    error = { message, statusCode: 429 };
  }

  // File upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    const message = 'File too large';
    error = { message, statusCode: 413 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    const message = 'Unexpected file field';
    error = { message, statusCode: 400 };
  }

  // Meta API errors
  if (err.response && err.response.data && err.response.data.error) {
    const metaError = err.response.data.error;
    let message = 'Meta API error';
    let statusCode = 500;

    switch (metaError.code) {
      case 190: // Invalid access token
        message = 'Instagram/Facebook access token is invalid or expired';
        statusCode = 401;
        break;
      case 100: // Invalid parameter
        message = 'Invalid request to Instagram/Facebook API';
        statusCode = 400;
        break;
      case 200: // Permission denied
        message = 'Insufficient permissions for Instagram/Facebook API';
        statusCode = 403;
        break;
      case 4: // Rate limit exceeded
        message = 'Instagram/Facebook API rate limit exceeded';
        statusCode = 429;
        break;
      default:
        message = metaError.message || 'Meta API error';
    }

    error = { message, statusCode, metaError };
  }

  // Database connection errors
  if (err.name === 'MongoError' || err.name === 'MongooseError') {
    const message = 'Database connection error';
    error = { message, statusCode: 503 };
  }

  // Redis connection errors
  if (err.code === 'ECONNREFUSED' && err.port === 6379) {
    const message = 'Cache service unavailable';
    error = { message, statusCode: 503 };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal Server Error';

  // Prepare error response
  const errorResponse = {
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  };

  // Add additional error info for specific cases
  if (error.metaError) {
    errorResponse.code = error.metaError.code;
    errorResponse.type = error.metaError.type;
  }

  // Don't expose sensitive information in production
  if (process.env.NODE_ENV === 'production') {
    if (statusCode === 500) {
      errorResponse.message = 'Internal Server Error';
    }
  }

  // Send error response
  res.status(statusCode).json(errorResponse);
};

// Not found handler
const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};

// Async error handler wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
  errorHandler,
  notFound,
  asyncHandler
};
