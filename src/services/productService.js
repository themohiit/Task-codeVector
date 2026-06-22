import pool from '../db/pool.js';
import { encodeCursor } from '../utils/cursor.js';

/**
 * Service to retrieve a paginated list of products from PostgreSQL.
 * Supports category filtering and cursor pagination (created_at DESC, id DESC).
 * 
 * @param {object} options
 * @param {string} [options.category] - Category to filter products by.
 * @param {number} options.limit - Number of products to return per page.
 * @param {object|null} options.cursor - Decoded cursor object containing { createdAt, id }.
 * @returns {Promise<object>} The paginated results containing data, count, hasMore, and nextCursor.
 */
export async function getProducts({ category, limit, cursor }) {
  // Use category query parameter if provided, otherwise fallback to the category stored in the cursor.
  const activeCategory = category || (cursor ? cursor.category : null);

  // Query limit + 1 records to check if a next page exists (hasMore)
  const queryLimit = limit + 1;
  console.log(queryLimit);
  console.log(activeCategory)
  let queryText = '';
  let queryParams = [];

  if (activeCategory) {
    if (cursor) {
      // Category filter WITH cursor
      queryText = `
        SELECT id, name, category, price, created_at, updated_at
        FROM products
        WHERE category = $1
          AND (
            created_at < $2
            OR (
              created_at = $2
              AND id < $3
            )
          )
        ORDER BY created_at DESC, id DESC
        LIMIT $4;
      `;
      queryParams = [activeCategory, cursor.createdAt, cursor.id, queryLimit];
    } else {
      // Category filter WITHOUT cursor (First Page)
      queryText = `
        SELECT id, name, category, price, created_at, updated_at
        FROM products
        WHERE category = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2;
      `;
      queryParams = [activeCategory, queryLimit];
    }
  } else {
    if (cursor) {
      // Global list WITH cursor
      queryText = `
        SELECT id, name, category, price, created_at, updated_at
        FROM products
        WHERE (
          created_at < $1
          OR (
            created_at = $1
            AND id < $2
          )
        )
        ORDER BY created_at DESC, id DESC
        LIMIT $3;
      `;
      queryParams = [cursor.createdAt, cursor.id, queryLimit];
    } else {
      // Global list WITHOUT cursor (First Page)
      queryText = `
        SELECT id, name, category, price, created_at, updated_at
        FROM products
        ORDER BY created_at DESC, id DESC
        LIMIT $1;
      `;
      queryParams = [queryLimit];
    }
  }

  // Execute the query
  const { rows } = await pool.query(queryText, queryParams);

  // Check if there are more records beyond the current limit
  const hasMore = rows.length > limit;
  
  // Slice to the actual limit if hasMore is true
  const data = hasMore ? rows.slice(0, limit) : rows;

  // Determine the next cursor using the last element of the sliced data
  let nextCursor = null;
  if (hasMore && data.length > 0) {
    const lastProduct = data[data.length - 1];
    nextCursor = encodeCursor(lastProduct, activeCategory);
  }

  return {
    data,
    count: data.length,
    nextCursor,
    hasMore,
  };
}

/*
===========================================================================
CURSOR PAGINATION VS OFFSET PAGINATION JUSTIFICATION
===========================================================================

1. How it works:
   Instead of skipping N records using OFFSET (e.g., LIMIT 20 OFFSET 100000), cursor pagination
   defines a unique, stable boundary point in the sorted dataset using the last fetched row's 
   sort columns (created_at, id).

2. Why it prevents duplicates:
   - Imagine a user is on Page 1. While reading, a new product is inserted.
   - In OFFSET pagination, the new row shifts the entire dataset down by 1. When the user requests 
     Page 2 (OFFSET 20), the 20th item from Page 1 is pushed to the 21st position and is read again.
   - In CURSOR pagination, the query demands rows where:
        (created_at < $1 OR (created_at = $1 AND id < $2))
     Since the newly inserted product has a newer timestamp (created_at > $1), it is excluded 
     from the result set of the subsequent pages. The user never sees duplicates.

3. Why it prevents missing rows:
   - Imagine a user is on Page 1. While reading, a product on Page 1 is deleted.
   - In OFFSET pagination, the dataset shifts up by 1. When the user requests Page 2 (OFFSET 20), 
     the item at position 21 is now at position 20, and gets skipped entirely.
   - In CURSOR pagination, because the boundary ($1, $2) is fixed based on the values of the last 
     seen record, the deletion of previous rows does not affect the starting point of the next query.
     Thus, no items are skipped.

4. Performance (O(1) vs O(N)):
   - OFFSET pagination requires PostgreSQL to read, sort, and discard all N records before N + Limit.
     At OFFSET 100,000, it reads 100,000 records only to throw them away, resulting in slow query times.
   - CURSOR pagination uses the composite index to jump directly to the target record via an 
     index range scan (O(log N)), ignoring the rest of the database, keeping queries fast at scale.
*/
