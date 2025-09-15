// Root server.js - redirects to backend with error handling
try {
  console.log('Starting InstaBot server...');
  require('./backend/src/server.js');
} catch (error) {
  console.error('Failed to start server:', error);
  process.exit(1);
}
