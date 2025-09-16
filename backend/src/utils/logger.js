const winston = require('winston');
const path = require('path');

// Define log directory based on environment
const getLogsDir = () => {
  if (process.env.RENDER) {
    // On Render, use the /var/log directory which is writable
    return '/var/log/instabot';
  }
  // Locally, use the logs directory in the project
  return path.join(__dirname, '../../logs');
};

// Create logs directory if it doesn't exist and is not on Render
const fs = require('fs');
const logsDir = getLogsDir();
if (!process.env.RENDER && !fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.prettyPrint()
);

// Define console format
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

// Create transports based on environment
const getTransports = () => {
  const transports = [];

  // Always add console transport in production for Render logs
  transports.push(new winston.transports.Console({
    format: consoleFormat,
  }));

  // Only add file transports if not on Render
  if (!process.env.RENDER) {
    transports.push(
      new winston.transports.File({
        filename: path.join(logsDir, 'error.log'),
        level: 'error',
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'combined.log'),
        maxsize: 5242880,
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logsDir, 'access.log'),
        level: 'info',
        maxsize: 5242880,
        maxFiles: 10,
      })
    );
  }

  return transports;
};

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  defaultMeta: { service: 'instabot-api' },
  transports: getTransports(),
  
  // Handle exceptions and rejections (only for local development)
  ...(process.env.RENDER ? {} : {
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
  })
});

// Custom logging methods
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

logger.performance = (operation, duration, meta = {}) => {
  logger.info(`Performance: ${operation} took ${duration}ms`, {
    context: 'PERFORMANCE',
    operation,
    duration,
    ...meta
  });
};

logger.db = (message, meta = {}) => {
  logger.info(message, { context: 'DATABASE', ...meta });
};

module.exports = logger;