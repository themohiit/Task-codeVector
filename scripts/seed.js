import { faker } from '@faker-js/faker';
import pool from '../src/db/pool.js';

const TOTAL_PRODUCTS = 200000;
const BATCH_SIZE = 5000;
const CATEGORIES = [
  'electronics',
  'fashion',
  'books',
  'sports',
  'toys',
  'home',
  'beauty',
  'automotive'
];

async function seed() {
  console.log('Starting product database seeding...');
  const startTime = Date.now();

  // Test connection first
  try {
    await pool.query('SELECT 1');
    console.log('Database connection successful.');
  } catch (err) {
    console.error('Failed to connect to database during seeding:', err.message);
    process.exit(1);
  }

  // Clear existing products
  console.log('Clearing existing product data...');
  await pool.query('TRUNCATE TABLE products CASCADE;');

  const totalBatches = Math.ceil(TOTAL_PRODUCTS / BATCH_SIZE);
  console.log(`Generating and inserting ${TOTAL_PRODUCTS} products in ${totalBatches} batches of ${BATCH_SIZE}...`);

  // To simulate realistic "newest first" ordering, we'll assign timestamps 
  // that decrease sequentially, ensuring older records are further in the past.
  const baseTime = Date.now();

  for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
    const batchStartTime = Date.now();
    const valuesPlaceholders = [];
    const queryParams = [];

    const currentBatchSize = Math.min(BATCH_SIZE, TOTAL_PRODUCTS - (batchIndex * BATCH_SIZE));

    for (let i = 0; i < currentBatchSize; i++) {
      const globalIndex = batchIndex * BATCH_SIZE + i;
      
      const id = faker.string.uuid();
      const name = faker.commerce.productName();
      const category = CATEGORIES[globalIndex % CATEGORIES.length]; // Even distribution of categories
      const price = parseFloat(faker.commerce.price({ min: 5, max: 1000, dec: 2 }));
      
      // Ensure monotonic created_at dates decreasing in the past. 
      // Subtracting 10 seconds for each product.
      const createdAt = new Date(baseTime - globalIndex * 10000);
      const updatedAt = new Date(createdAt.getTime() + Math.floor(Math.random() * 5000)); // slightly after created_at

      const paramOffset = i * 6;
      valuesPlaceholders.push(`($${paramOffset + 1}, $${paramOffset + 2}, $${paramOffset + 3}, $${paramOffset + 4}, $${paramOffset + 5}, $${paramOffset + 6})`);
      
      queryParams.push(id, name, category, price, createdAt, updatedAt);
    }

    const insertQuery = `
      INSERT INTO products (id, name, category, price, created_at, updated_at)
      VALUES ${valuesPlaceholders.join(',\n')};
    `;

    await pool.query(insertQuery, queryParams);
    
    const batchDuration = Date.now() - batchStartTime;
    const progressPercent = (((batchIndex + 1) / totalBatches) * 100).toFixed(0);
    console.log(`[Batch ${batchIndex + 1}/${totalBatches}] ${progressPercent}% complete in ${batchDuration}ms`);
  }

  const totalDuration = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`\nSuccess! Seeded ${TOTAL_PRODUCTS} products in ${totalDuration} seconds.`);
}

seed()
  .then(() => {
    console.log('Seeding process finished.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Seeding process failed with error:', err);
    process.exit(1);
  });
