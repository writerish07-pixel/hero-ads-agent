'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * JWT authentication middleware.
 * Expects an "Authorization: Bearer <token>" header.
 * Attaches the decoded payload to req.user on success.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }

  const token = authHeader.slice(7);

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      logger.error('JWT_SECRET environment variable is not configured – authentication is unavailable');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    logger.error('JWT verification error', { error: err.message });
    return res.status(401).json({ success: false, message: 'Authentication failed' });
  }
};

module.exports = authenticate;
