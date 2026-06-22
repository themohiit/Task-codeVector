import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function setup() {
  const dbUrlStr = process.env.DATABASE_URL;
  if (!dbUrlStr) {
    console.error('DATABASE_URL is not defined in environment variables.');
    process.exit(1);
  }

  let dbUrl;
  try {
    dbUrl = new URL(dbUrlStr);
  } catch (err) {
    console.error('Invalid DATABASE_URL format:', err.message);
    process.exit(1);
  }

  const targetDbName = dbUrl.pathname.slice(1) || 'product_catalog';
  
  // 1. Connect to the default 'postgres' database to check/create the target database
  dbUrl.pathname = '/postgres';
  const systemDbUrl = dbUrl.toString();

  console.log(`Connecting to database system to verify database '${targetDbName}'...`);
  const client = new Client({ connectionString: systemDbUrl });
  
  try {
    await client.connect();
    
    const dbCheckResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [targetDbName]
    );

    if (dbCheckResult.rowCount === 0) {
      console.log(`Database '${targetDbName}' does not exist. Creating...`);
      try {
        console.log('Terminating active connections to template1 to prevent locks...');
        await client.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = 'template1' AND pid <> pg_backend_pid();
        `);
      } catch (termErr) {
        console.log('Warning: could not terminate active template1 connections:', termErr.message);
      }
      // CREATE DATABASE cannot run inside a transaction block, so we execute it directly
      await client.query(`CREATE DATABASE "${targetDbName}";`);
      console.log(`Database '${targetDbName}' created successfully.`);
    } else {
      console.log(`Database '${targetDbName}' already exists.`);
    }
  } catch (err) {
    console.error('Error during database check/creation:', err.message);
    console.error('Make sure PostgreSQL is running and credentials in .env are correct.');
    process.exit(1);
  } finally {
    await client.end();
  }

  // 2. Connect to the target database and execute schema.sql
  console.log(`Connecting to '${targetDbName}' to execute schema.sql...`);
  const targetClient = new Client({ connectionString: dbUrlStr });

  try {
    await targetClient.connect();

    const schemaPath = path.resolve('sql', 'schema.sql');
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }

    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    console.log('Applying schema migrations (creating tables and indexes)...');
    await targetClient.query(schemaSql);
    console.log('Schema migration applied successfully.');
  } catch (err) {
    console.error('Error executing schema.sql:', err.message);
    process.exit(1);
  } finally {
    await targetClient.end();
  }
}

setup();
