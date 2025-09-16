const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/instabot';
    
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
      autoIndex: false, // Disable automatic index building to prevent duplicate warnings
      autoCreate: false, // Don't auto-create collections
      retryWrites: true,
    };

    // Log connection attempt
    const sanitizedURI = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
    console.log(`🔗 MongoDB: Attempting connection to ${sanitizedURI}`);
    logger.info(`Attempting to connect to MongoDB at ${sanitizedURI}`);

    const conn = await mongoose.connect(mongoURI, options);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

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

    // Only exit if it's the initial connection that failed
    if (!mongoose.connection.readyState) {
      logger.error('Initial MongoDB connection failed - exiting process');
      process.exit(1);
    } else {
      logger.warn('MongoDB error occurred but connection is still alive');
    }
  }
};

module.exports = connectDB;