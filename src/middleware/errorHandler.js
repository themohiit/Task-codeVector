/**
 * Centralized Express Error Handler Middleware.
 * Prevents duplicate try/catch blocks in controllers and sanitizes error responses.
 */
export default function errorHandler(err, req, res, next) {
  // Log the error stack trace internally for debugging
  console.error(`[Error] ${err.stack || err.message || err}`);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  // Format error response
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500 && process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred on the server' 
      : message,
  });
}
