/**
 * middleware/errorHandler.js
 * Central error handler — catches errors thrown from controllers.
 * Use: throw new Error('message') or next(err) in controllers.
 */

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message    = err.message    || 'Internal Server Error';

  // Mongoose: bad ObjectId (e.g. invalid _id format)
  if (err.name === 'CastError') {
    statusCode = 400;
    message    = `Invalid ID: ${err.value}`;
  }

  // Mongoose: duplicate key (e.g. email already registered)
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`;
  }

  // Mongoose: validation error (required fields missing, etc.)
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors)
      .map((e) => e.message)
      .join(', ');
  }

  // JWT: expired token
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message    = 'Session expired, please login again';
  }

  // JWT: invalid token
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message    = 'Invalid token, please login again';
  }

  console.error(`[ERROR] ${statusCode} — ${message}`);

  res.status(statusCode).json({
    success: false,
    message,
    // Only show stack trace in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
