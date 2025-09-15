const winston = require('winston');
const path = require('path');

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format for development
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'instabot-api' },
  transports: [
    // Write all logs with level 'error' and below to error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs with level 'info' and below to combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // Write all logs to access.log for request tracking
    new winston.transports.File({
      filename: path.join(logsDir, 'access.log'),
      level: 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
  
  // Handle exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'exceptions.log'),
    }),
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'rejections.log'),
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: consoleFormat,
  }));
}

// Custom logging methods for different contexts
logger.api = (message, meta = {}) => {
  logger.info(message, { context: 'API', ...meta });
};

logger.bot = (message, meta = {}) => {
  logger.info(message, { context: 'BOT', ...meta });
};

logger.payment = (message, meta = {}) => {
  logger.info(message, { context: 'PAYMENT', ...meta });
};

logger.meta = (message, meta = {}) => {
  logger.info(message, { context: 'META_API', ...meta });
};

logger.security = (message, meta = {}) => {
  logger.warn(message, { context: 'SECURITY', ...meta });
};

logger.audit = (action, userId, details = {}) => {
  logger.info('Audit Log', {
    context: 'AUDIT',
    action,
    userId,
    timestamp: new Date().toISOString(),
    ...details
  });
};

// Performance logging
logger.performance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    context: 'PERFORMANCE',
    operation,
    duration,
    ...meta
  });
};

// Database logging
logger.db = (message, meta = {}) => {
  logger.info(message, { context: 'DATABASE', ...meta });
};

module.exports = logger;
