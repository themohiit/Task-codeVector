import * as productService from '../src/services/productService.js';
import pool from '../src/db/pool.js';

async function generateTestCursors() {
  console.log('Fetching active database products to generate test cursors...\n');

  try {
    // 1. Get first page of global products
    const globalResult = await productService.getProducts({ limit: 5 });
    console.log('============================================================');
    console.log('GLOBAL PRODUCTS CURSOR (All Categories)');
    console.log('============================================================');
    console.log(`First page returned: ${globalResult.count} products.`);
    console.log(`Last item on first page:`);
    console.log(`  - Name: "${globalResult.data[4]?.name}"`);
    console.log(`  - Category: "${globalResult.data[4]?.category}"`);
    console.log(`  - Created At: ${globalResult.data[4]?.created_at}`);
    console.log(`\n👉 NEXT PAGE CURSOR TO COPY & TEST:`);
    console.log(`\x1b[32m${globalResult.nextCursor}\x1b[0m`);
    console.log('============================================================\n');

    // 2. Get first page of 'electronics' products
    const categoryResult = await productService.getProducts({ category: 'electronics', limit: 5 });
    console.log('============================================================');
    console.log('ELECTRONICS PRODUCTS CURSOR');
    console.log('============================================================');
    console.log(`First page returned: ${categoryResult.count} products.`);
    console.log(`Last item on first page:`);
    console.log(`  - Name: "${categoryResult.data[4]?.name}"`);
    console.log(`  - Category: "${categoryResult.data[4]?.category}"`);
    console.log(`  - Created At: ${categoryResult.data[4]?.created_at}`);
    console.log(`\n👉 NEXT PAGE CURSOR TO COPY & TEST (implicit category electronics):`);
    console.log(`\x1b[32m${categoryResult.nextCursor}\x1b[0m`);
    console.log('============================================================\n');

  } catch (err) {
    console.error('Error generating cursors:', err.message);
  } finally {
    await pool.end();
  }
}

generateTestCursors();
