'use strict';

const logger = require('../config/logger');

/**
 * Global error-handling middleware.
 * Must be registered as the last middleware in the Express chain.
 *
 * @param {Error}  err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';

  logger.error('Unhandled error', {
    method: req.method,
    url: req.originalUrl,
    error: err.message,
    // Only include the stack in non-production logs
    ...(isProduction ? {} : { stack: err.stack }),
  });

  // Joi validation errors
  if (err.name === 'ValidationError' && err.isJoi) {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.details.map((d) => d.message),
    });
  }

  // JWT errors forwarded from middleware
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const status = err.status || err.statusCode || 500;
  const message = isProduction && status === 500 ? 'Internal server error' : err.message;

  res.status(status).json({
    success: false,
    message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};

module.exports = errorHandler;
