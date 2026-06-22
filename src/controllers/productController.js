import * as productService from '../services/productService.js';
import { decodeCursor } from '../utils/cursor.js';

// Valid categories as specified in the assignment requirements
const VALID_CATEGORIES = new Set([
  'electronics',
  'fashion',
  'books',
  'sports',
  'toys',
  'home',
  'beauty',
  'automotive'
]);

/**
 * Reusable async middleware wrapper to catch errors and forward them to errorHandler.
 * Avoids duplicating try/catch blocks across controllers.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Controller to handle fetching paginated products.
 * GET /api/products
 */
export const getProducts = asyncHandler(async (req, res, next) => {
  const limitQuery = req.query.limit !== undefined ? req.query.limit : req.body?.limit;
  const cursorQuery = req.query.cursor !== undefined ? req.query.cursor : req.body?.cursor;
  const category = req.query.category !== undefined ? req.query.category : req.body?.category;

  // 1. Validate category if provided
  if (category && !VALID_CATEGORIES.has(category)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid category'
    });
  }

  // 2. Parse and validate limit
  let limit = 20; // Default limit
  if (limitQuery !== undefined) {
    const parsedLimit = parseInt(limitQuery, 10);
    // Ensure limit is a positive integer and <= 100
    if (isNaN(parsedLimit) || parsedLimit <= 0 || parsedLimit > 100) {
      return res.status(400).json({
        success: false,
        message: 'Invalid limit'
      });
    }
    limit = parsedLimit;
  }

  // 3. Parse and validate cursor if provided
  let cursor = null;
  if (cursorQuery !== undefined) {
    // If cursor parameter is empty string or empty space
    if (!cursorQuery.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cursor'
      });
    }

    cursor = decodeCursor(cursorQuery);
    if (!cursor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid cursor'
      });
    }
  }

  // 4. Retrieve products from service
  const result = await productService.getProducts({ category, limit, cursor });

  // 5. Send successful response
  return res.status(200).json({
    success: true,
    count: result.count,
    nextCursor: result.nextCursor,
    hasMore: result.hasMore,
    data: result.data
  });
});
