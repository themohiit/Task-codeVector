/**
 * Encodes a product's pagination attributes into a base64 cursor string.
 * @param {object} product - The product database object.
 * @param {string|Date} product.created_at - The creation timestamp of the product.
 * @param {string} product.id - The UUID of the product.
 * @param {string|null} [category=null] - The active category filter used in the query.
 * @returns {string} The base64 encoded cursor.
 */
export function encodeCursor(product, category = null) {
  if (!product || !product.created_at || !product.id) {
    throw new Error('Cannot encode cursor: product must have created_at and id');
  }

  // Ensure created_at is converted to ISO string for standard serialization
  const createdAtStr = product.created_at instanceof Date 
    ? product.created_at.toISOString() 
    : new Date(product.created_at).toISOString();

  const cursorObj = {
    createdAt: createdAtStr,
    id: product.id,
    category: category || null,
  };

  return Buffer.from(JSON.stringify(cursorObj)).toString('base64');
}

/**
 * Decodes a base64 cursor string into its pagination attributes.
 * @param {string} cursorStr - The base64 encoded cursor string.
 * @returns {object|null} The decoded cursor object containing { createdAt, id, category }, or null if malformed.
 */
export function decodeCursor(cursorStr) {
  if (!cursorStr) {
    return null;
  }

  try {
    const jsonStr = Buffer.from(cursorStr, 'base64').toString('utf8');
    const cursorObj = JSON.parse(jsonStr);

    if (!cursorObj.createdAt || !cursorObj.id) {
      return null;
    }

    // Validate that id is a string and createdAt can be parsed as a valid date
    const dateVal = new Date(cursorObj.createdAt);
    if (isNaN(dateVal.getTime())) {
      return null;
    }

    return {
      createdAt: cursorObj.createdAt,
      id: cursorObj.id,
      category: cursorObj.category || null,
    };
  } catch (err) {
    // Return null to signify that the cursor is malformed
    return null;
  }
}
