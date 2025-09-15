// Server startup from src directory
console.log('🚀 Starting InstaBot Server from src directory...');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Check required environment variables
const requiredEnvVars = [
  'MONGODB_URI',
  'REDIS_URL',
  'META_APP_ID',
  'META_APP_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars);
  console.log('Available env vars:', Object.keys(process.env).filter(key => key.includes('META') || key.includes('MONGO') || key.includes('REDIS')));
  process.exit(1);
}

console.log('✅ Environment variables validated');

// Try to start the server
try {
  console.log('📁 Loading server from ../backend/src/server.js...');
  require('../backend/src/server.js');
  console.log('✅ Server loaded successfully');
} catch (error) {
  console.error('❌ Failed to start server:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}
