import pg from 'pg';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL environment variable is not defined!');
  process.exit(1);
}

// Create pg connection pool
const pool = new Pool({
  connectionString,
  // Maximum number of clients in the pool
  max: 20,
  // Number of milliseconds a client must sit idle in the pool before being closed
  idleTimeoutMillis: 30000,
  // Number of milliseconds to wait before timing out when connecting a new client
  connectionTimeoutMillis: 5000,
});

// Log pool errors
pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err);
});

export default pool;
