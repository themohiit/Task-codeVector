import app from '../src/app.js';
import pool from '../src/db/pool.js';

const PORT = 5050;
const BASE_URL = `http://localhost:${PORT}/api/products`;

async function testAPI() {
  console.log('--- Starting API Integration Tests ---');
  
  // 1. Start Express server
  const server = app.listen(PORT, () => {
    console.log(`Test server listening on port ${PORT}`);
  });

  try {
    // Test 1: Fetch first page (default limit)
    console.log('\n[Test 1] Fetching first page with default limit (20)...');
    let res = await fetch(BASE_URL);
    let json = await res.json();
    
    if (res.status !== 200 || !json.success) {
      throw new Error(`Test 1 Failed: Status ${res.status}, body: ${JSON.stringify(json)}`);
    }
    console.log(`✅ Success: Received ${json.count} products. hasMore: ${json.hasMore}`);
    if (json.count !== 20) {
      throw new Error(`Test 1 Failed: Expected count to be 20, got ${json.count}`);
    }
    
    const firstPageLastItem = json.data[json.data.length - 1];
    const cursor1 = json.nextCursor;
    console.log(`Next page cursor: ${cursor1}`);

    // Test 2: Fetch next page using cursor
    console.log('\n[Test 2] Fetching next page using cursor...');
    res = await fetch(`${BASE_URL}?limit=5&cursor=${cursor1}`);
    json = await res.json();

    if (res.status !== 200 || !json.success) {
      throw new Error(`Test 2 Failed: Status ${res.status}, body: ${JSON.stringify(json)}`);
    }
    console.log(`✅ Success: Received ${json.count} products. hasMore: ${json.hasMore}`);
    if (json.count !== 5) {
      throw new Error(`Test 2 Failed: Expected count to be 5, got ${json.count}`);
    }

    // Verify that the first item of this page is indeed older than the last item of the previous page
    const nextPageFirstItem = json.data[0];
    const prevDate = new Date(firstPageLastItem.created_at);
    const nextDate = new Date(nextPageFirstItem.created_at);
    
    if (nextDate > prevDate) {
      throw new Error(`Test 2 Failed: Sorting order broken. Prev page last item (${firstPageLastItem.created_at}) is older than next page first item (${nextPageFirstItem.created_at})`);
    }
    console.log(`✅ Success: Sorting order verified. ${nextPageFirstItem.created_at} <= ${firstPageLastItem.created_at}`);

    // Test 3: Fetch with category filter
    console.log('\n[Test 3] Fetching first page filtered by category "electronics"...');
    res = await fetch(`${BASE_URL}?limit=5&category=electronics`);
    json = await res.json();

    if (res.status !== 200 || !json.success) {
      throw new Error(`Test 3 Failed: Status ${res.status}`);
    }
    console.log(`✅ Success: Received ${json.count} products.`);
    json.data.forEach(item => {
      if (item.category !== 'electronics') {
        throw new Error(`Test 3 Failed: Expected category electronics, got ${item.category}`);
      }
    });
    console.log('✅ Success: All items match the category "electronics"');

    // Test 3B: Fetch next page of category using cursor WITHOUT explicit category parameter
    const categoryCursor = json.nextCursor;
    console.log('\n[Test 3B] Fetching next page of electronics using cursor without category query param...');
    res = await fetch(`${BASE_URL}?limit=5&cursor=${categoryCursor}`);
    json = await res.json();

    if (res.status !== 200 || !json.success) {
      throw new Error(`Test 3B Failed: Status ${res.status}, body: ${JSON.stringify(json)}`);
    }
    console.log(`✅ Success: Received ${json.count} products. hasMore: ${json.hasMore}`);
    json.data.forEach(item => {
      if (item.category !== 'electronics') {
        throw new Error(`Test 3B Failed: Expected category electronics implicitly from cursor, got ${item.category}`);
      }
    });
    console.log('✅ Success: Category implicitly preserved from the cursor.');


    // Test 4: Validate limit constraint (limit = 101)
    console.log('\n[Test 4] Requesting invalid limit (101)...');
    res = await fetch(`${BASE_URL}?limit=101`);
    json = await res.json();
    
    if (res.status !== 400 || json.success !== false) {
      throw new Error(`Test 4 Failed: Expected 400 bad request, got ${res.status}`);
    }
    console.log(`✅ Success: Server rejected invalid limit. Message: "${json.message}"`);

    // Test 5: Validate invalid category constraint
    console.log('\n[Test 5] Requesting invalid category...');
    res = await fetch(`${BASE_URL}?category=nonexistent`);
    json = await res.json();

    if (res.status !== 400 || json.success !== false) {
      throw new Error(`Test 5 Failed: Expected 400 bad request, got ${res.status}`);
    }
    console.log(`✅ Success: Server rejected invalid category. Message: "${json.message}"`);

    // Test 6: Validate malformed cursor
    console.log('\n[Test 6] Requesting invalid cursor...');
    res = await fetch(`${BASE_URL}?cursor=invalid_base64_string_xyz`);
    json = await res.json();

    if (res.status !== 400 || json.success !== false) {
      throw new Error(`Test 6 Failed: Expected 400 bad request, got ${res.status}`);
    }
    console.log(`✅ Success: Server rejected invalid cursor. Message: "${json.message}"`);

    console.log('\n🎉 ALL INTEGRATION TESTS PASSED SUCCESSFULLY! 🎉\n');
  } catch (err) {
    console.error('\n❌ INTEGRATION TEST FAILED:', err.message);
  } finally {
    // 2. Shut down server and DB pool
    server.close(async () => {
      console.log('Test server closed.');
      await pool.end();
      console.log('Database pool ended.');
    });
  }
}

testAPI();
