// Enhanced server startup with comprehensive error logging for Render deployment
console.log('🚀 Starting InstaBot Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Node Version:', process.version);
console.log('Current Directory:', process.cwd());

// Set JWT_REFRESH_SECRET if not present
if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET + '-refresh';
  console.log('⚠️  JWT_REFRESH_SECRET not set, using derived value from JWT_SECRET');
}

// Check all environment variables
const requiredVars = ['MONGODB_URI', 'REDIS_URL', 'META_APP_ID', 'META_APP_SECRET', 'JWT_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing environment variables:', missingVars);
  console.log('Available env vars:', Object.keys(process.env).filter(k => !k.includes('npm_')).sort());
  process.exit(1);
}

console.log('✅ Environment variables present');

// Global error handlers BEFORE loading the server
process.on('uncaughtException', (err) => {
  console.error('❌❌❌ UNCAUGHT EXCEPTION - This is why the server is crashing:');
  console.error('Error Name:', err.name);
  console.error('Error Message:', err.message);
  console.error('Error Code:', err.code);
  console.error('Full Error Object:', err);
  console.error('Stack Trace:', err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌❌❌ UNHANDLED PROMISE REJECTION - This is why the server is crashing:');
  console.error('Rejection Reason:', reason);
  console.error('Promise:', promise);
  if (reason && typeof reason === 'object') {
    console.error('Reason Name:', reason.name);
    console.error('Reason Message:', reason.message);
    console.error('Reason Code:', reason.code);
    console.error('Reason Stack:', reason.stack);
  }
  process.exit(1);
});

process.on('warning', (warning) => {
  console.warn('⚠️  Node.js Warning:', warning.name);
  console.warn('Warning Message:', warning.message);
  console.warn('Warning Stack:', warning.stack);
});

process.on('exit', (code) => {
  console.log(`📤 Process is exiting with code: ${code}`);
  if (code !== 0) {
    console.error(`❌ Non-zero exit code: ${code}`);
  }
});

process.on('SIGTERM', () => {
  console.log('📴 Received SIGTERM signal');
});

process.on('SIGINT', () => {
  console.log('📴 Received SIGINT signal');
});

// Try to start the server
try {
  console.log('📁 Loading server from ../../backend/src/server.js...');
  
  // Wrap the require in a try-catch
  const serverPath = '../../backend/src/server.js';
  console.log('Attempting to load:', require.resolve(serverPath));
  
  const server = require(serverPath);
  console.log('✅ Server module loaded successfully');
  
  // Check if server started properly
  setTimeout(() => {
    console.log('🌐 Server status check after 3 seconds:');
    console.log('  - Process still running: YES');
    console.log('  - Memory usage:', JSON.stringify(process.memoryUsage()));
    console.log('  - Active handles:', process._getActiveHandles ? process._getActiveHandles().length : 'N/A');
    console.log('  - Active requests:', process._getActiveRequests ? process._getActiveRequests().length : 'N/A');
  }, 3000);
  
  // Keep process alive and log periodically
  const keepAlive = setInterval(() => {
    const uptime = Math.floor(process.uptime());
    console.log(`💚 Server healthy - Uptime: ${uptime}s - Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`);
  }, 30000); // Every 30 seconds
  
  // Prevent interval from keeping process alive if it wants to exit
  keepAlive.unref();
  
} catch (error) {
  console.error('❌❌❌ FAILED TO START SERVER:');
  console.error('Error Name:', error.name);
  console.error('Error Message:', error.message);
  console.error('Error Code:', error.code);
  console.error('Stack Trace:', error.stack);
  process.exit(1);
}

console.log('✅ Startup script completed, server should be running...');