// Simple server startup for Render deployment
console.log('🚀 Starting InstaBot Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Check if we have the required environment variables
const requiredVars = ['MONGODB_URI', 'REDIS_URL', 'META_APP_ID', 'META_APP_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars);
  console.log('Available vars:', Object.keys(process.env).filter(k => k.includes('META') || k.includes('MONGO') || k.includes('REDIS')));
  process.exit(1);
}

console.log('✅ Environment variables present');

// Try to start the server
try {
  console.log('📁 Loading server from backend/src/server.js...');
  require('./backend/src/server.js');
  console.log('✅ Server started successfully');
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}
