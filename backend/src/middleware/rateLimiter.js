'use strict';

const rateLimit = require('express-rate-limit');

/**
 * Default rate limiter: 100 requests per 15-minute window.
 */
const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

/**
 * Strict rate limiter for authentication routes: 10 requests per 15-minute window.
 */
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
  skipSuccessfulRequests: false,
});

module.exports = { defaultLimiter, strictLimiter };
