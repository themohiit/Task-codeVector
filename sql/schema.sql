-- Drop table if it exists to allow clean re-runs of the schema setup
DROP TABLE IF EXISTS products;

-- Create the products table
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- ============================================================================
-- INDEX DESIGN JUSTIFICATIONS AND COMMENTS
-- ============================================================================

-- idx_products_created_id
-- -----------------------
-- Purpose: Used for global listing of products ordered by newest first (created_at DESC, id DESC).
-- Why (created_at DESC, id DESC)?
-- 1. `created_at` alone is not unique. If multiple products share the exact same timestamp, sorting on it
--    is non-deterministic. By appending `id` (the PRIMARY KEY), we guarantee a stable, unique sorting order.
-- 2. This composite index allows PostgreSQL to perform an Index Scan or Index Only Scan to return the rows
--    pre-sorted, completely avoiding a costly filesort (Sort node in the query plan) on large offsets/limits.
-- 3. The cursor pagination WHERE clause:
--      (created_at < $1 OR (created_at = $1 AND id < $2))
--    perfectly maps to the leading columns of this composite index. The database can perform an index range
--    scan directly to find the start of the next page, keeping pagination O(1) or O(log N) instead of O(N).
CREATE INDEX idx_products_created_id
ON products(created_at DESC, id DESC);

-- idx_products_category_created_id
-- --------------------------------
-- Purpose: Used for category-specific listing of products ordered by newest first.
-- Why category as the first column?
-- 1. By placing `category` first, we enable the query planner to quickly filter by category using equality comparison ($1).
-- 2. After filtering by category, the database can immediately retrieve the rows sorted by `created_at DESC, id DESC` 
--    without performing a sort operation, since the remaining columns of the index match the ORDER BY clause.
-- 3. This matches the category-filtered cursor pagination WHERE clause:
--      category = $1 AND (created_at < $2 OR (created_at = $2 AND id < $3))
--    which represents a highly selective range scan over the index.
CREATE INDEX idx_products_category_created_id
ON products(category, created_at DESC, id DESC);
