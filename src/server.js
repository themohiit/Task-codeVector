import app from './app.js';
import pool from './db/pool.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode.`);
  console.log(`👉 Access Frontend at: http://localhost:${PORT}/`);
});

// Handle graceful shutdown for production readiness
const handleGracefulShutdown = async (signal) => {
  console.log(`Received ${signal}. Starting graceful shutdown...`);
  
  // Stop receiving new connections
  server.close(async () => {
    console.log('HTTP server closed.');
    
    try {
      // Close database connection pool
      await pool.end();
      console.log('Database pool closed.');
      process.exit(0);
    } catch (err) {
      console.error('Error during pool shutdown:', err);
      process.exit(1);
    }
  });

  // Force close after 10 seconds if shutdown hangs
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
