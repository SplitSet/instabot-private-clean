const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  const primaryURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/instabot';

  // Common driver options (remove deprecated flags for driver >= 4)
  const baseOptions = {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 8000,
    socketTimeoutMS: 45000,
    family: 4, // Prefer IPv4
    autoIndex: false,
    autoCreate: false,
    retryWrites: true,
  };

  const tryConnect = async (uri, label) => {
    const sanitized = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
    console.log(`🔗 MongoDB [${label}]: Attempting connection to ${sanitized}`);
    logger.info(`Attempting to connect to MongoDB [${label}] at ${sanitized}`);
    const conn = await mongoose.connect(uri, baseOptions);
    console.log(`✅ MongoDB [${label}] Connected: ${conn.connection.host}`);
    logger.info(`MongoDB [${label}] Connected: ${conn.connection.host}`);
    return conn;
  };

  try {
    // First attempt: as provided (likely mongodb+srv)
    await tryConnect(primaryURI, 'primary');

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
      // Don't exit process on connection errors, let Mongoose handle reconnection
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected - Mongoose will try to reconnect automatically');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected successfully');
    });

    // Handle process termination
    const gracefulExit = async () => {
      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (err) {
        logger.error('Error during MongoDB connection closure:', err);
        process.exit(1);
      }
    };

    // Handle graceful shutdown
    process.on('SIGINT', gracefulExit);
    process.on('SIGTERM', gracefulExit);

  } catch (error) {
    logger.error('MongoDB connection failed:', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    // Fallback for SRV DNS failure: convert to mongodb:// and force direct + TLS
    const isSrvDnsFailure =
      typeof error?.message === 'string' &&
      /querySrv\s+ENOTFOUND/i.test(error.message) &&
      primaryURI.startsWith('mongodb+srv://');

    if (isSrvDnsFailure) {
      try {
        let fallbackURI = primaryURI.replace('mongodb+srv://', 'mongodb://');
        // Append directConnection & tls if not present
        const hasQuery = fallbackURI.includes('?');
        const sep = hasQuery ? '&' : '?';
        if (!/([?&])directConnection=/.test(fallbackURI)) {
          fallbackURI += `${sep}directConnection=true`;
        }
        if (!/([?&])tls=/.test(fallbackURI)) {
          fallbackURI += `${fallbackURI.includes('?') ? '&' : '?'}tls=true`;
        }

        await tryConnect(fallbackURI, 'fallback-direct');

        // Wire events after successful fallback
        mongoose.connection.on('error', (err) => {
          logger.error('MongoDB connection error:', err);
        });
        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected - Mongoose will try to reconnect automatically');
        });
        mongoose.connection.on('reconnected', () => {
          logger.info('MongoDB reconnected successfully');
        });

        const gracefulExit = async () => {
          try {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed through app termination');
            process.exit(0);
          } catch (err) {
            logger.error('Error during MongoDB connection closure:', err);
            process.exit(1);
          }
        };
        process.on('SIGINT', gracefulExit);
        process.on('SIGTERM', gracefulExit);

        return; // Success via fallback; do not exit
      } catch (fallbackError) {
        logger.error('MongoDB fallback connection failed:', {
          error: fallbackError.message,
          stack: fallbackError.stack,
          code: fallbackError.code,
          name: fallbackError.name
        });
      }
    }

    // If both attempts failed or not an SRV issue, exit only if not connected
    if (!mongoose.connection.readyState) {
      logger.error('Initial MongoDB connection failed - exiting process');
      process.exit(1);
    } else {
      logger.warn('MongoDB error occurred but connection is still alive');
    }
  }
};

module.exports = connectDB;