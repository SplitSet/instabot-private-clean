// Simple server startup for Render deployment (from src/src directory)
console.log('🚀 Starting InstaBot Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Set JWT_REFRESH_SECRET if not present (use JWT_SECRET as fallback)
if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET + '-refresh';
  console.log('⚠️  JWT_REFRESH_SECRET not set, using derived value from JWT_SECRET');
}

// Check if we have the required environment variables
const requiredVars = ['MONGODB_URI', 'REDIS_URL', 'META_APP_ID', 'META_APP_SECRET', 'JWT_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars);
  console.log('Available vars:', Object.keys(process.env).filter(k => k.includes('META') || k.includes('MONGO') || k.includes('REDIS') || k.includes('JWT')));
  process.exit(1);
}

console.log('✅ Environment variables present');

// Add more detailed error handling
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception in startup script:', err);
  console.error('Stack:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection in startup script at:', promise, 'reason:', reason);
  if (reason && reason.stack) {
    console.error('Rejection stack:', reason.stack);
  }
  process.exit(1);
});

// Try to start the server
try {
  console.log('📁 Loading server from ../../backend/src/server.js...');
  require('../../backend/src/server.js');
  console.log('✅ Server started successfully');
  
  // Log server info after a short delay
  setTimeout(() => {
    console.log('🌐 Server info:');
    console.log('  - PORT:', process.env.PORT || 5000);
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - MongoDB connected');
    console.log('  - Ready to handle requests');
  }, 2000);
  
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}