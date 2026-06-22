import pool from '../src/db/pool.js';

async function runExplain() {
  console.log('--- Analyzing Database Query Execution Plans --- \n');
  
  try {
    // 1. Global pagination cursor check
    console.log('Analyzing Global pagination query (with cursor)...');
    const globalExplain = await pool.query(`
      EXPLAIN ANALYZE
      SELECT id, name, category, price, created_at, updated_at
      FROM products
      WHERE (
        created_at < '2026-06-22T17:00:00.000Z'
        OR (
          created_at = '2026-06-22T17:00:00.000Z'
          AND id < '00000000-0000-0000-0000-000000000000'
        )
      )
      ORDER BY created_at DESC, id DESC
      LIMIT 21;
    `);
    
    globalExplain.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });

    console.log('\n------------------------------------------------------------\n');

    // 2. Category pagination cursor check
    console.log('Analyzing Category-specific pagination query (with cursor)...');
    const categoryExplain = await pool.query(`
      EXPLAIN ANALYZE
      SELECT id, name, category, price, created_at, updated_at
      FROM products
      WHERE category = 'electronics'
        AND (
          created_at < '2026-06-22T17:00:00.000Z'
          OR (
            created_at = '2026-06-22T17:00:00.000Z'
            AND id < '00000000-0000-0000-0000-000000000000'
          )
        )
      ORDER BY created_at DESC, id DESC
      LIMIT 21;
    `);

    categoryExplain.rows.forEach(row => {
      console.log(row['QUERY PLAN']);
    });

  } catch (err) {
    console.error('Explain plan failed:', err.message);
  } finally {
    await pool.end();
  }
}

runExplain();
