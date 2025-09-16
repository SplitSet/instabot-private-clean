// Enhanced startup for Render with robust diagnostics
console.log('🚀 Starting InstaBot Server...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Node Version:', process.version);
console.log('CWD:', process.cwd());

// Provide JWT refresh secret fallback if missing
if (!process.env.JWT_REFRESH_SECRET && process.env.JWT_SECRET) {
  process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET + '-refresh';
  console.log('⚠️  JWT_REFRESH_SECRET not set, deriving from JWT_SECRET');
}

// Verify required env vars
const requiredVars = ['MONGODB_URI', 'REDIS_URL', 'META_APP_ID', 'META_APP_SECRET', 'JWT_SECRET'];
const missingVars = requiredVars.filter((k) => !process.env[k]);
if (missingVars.length) {
  console.error('❌ Missing environment variables:', missingVars);
  console.error('Known env keys:', Object.keys(process.env).filter(k => !k.startsWith('npm_')).sort());
  process.exit(1);
}

console.log('✅ Environment variables present');

// Patch process.exit to log call sites
const realExit = process.exit.bind(process);
process.exit = (code) => {
  try {
    const err = new Error(`process.exit(${code}) called`);
    console.error('🛑 process.exit intercepted:', code, '\n', err.stack);
  } catch (_) {}
  realExit(code);
};

process.on('beforeExit', (code) => {
  console.log('📥 beforeExit with code:', code);
});
process.on('exit', (code) => {
  console.log('📤 exit with code:', code);
});
process.on('warning', (w) => {
  console.warn('⚠️  Warning:', w.name, w.message); 
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception in startup:', err, '\n', err && err.stack);
});
process.on('unhandledRejection', (reason, p) => {
  console.error('❌ Unhandled Rejection in startup:', reason, '\nPromise:', p);
});

try {
  console.log('📁 Loading server from ../backend/src/server.js...');
  const serverModulePath = require.resolve('../backend/src/server.js');
  console.log('Resolved server module path:', serverModulePath);
  require('../backend/src/server.js');
  console.log('✅ Server started successfully');
} catch (error) {
  console.error('❌ Server startup failed:', error.message);
  console.error('Stack:', error.stack);
  process.exit(1);
}

// Heartbeat to keep logs flowing
setInterval(() => {
  console.log(`💓 Heartbeat - uptime ${Math.round(process.uptime())}s, heap ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB`);
}, 60000);