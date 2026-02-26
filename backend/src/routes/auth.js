'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const { strictLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const authenticate = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();

// ── Validation schemas ────────────────────────────────────────────────────────
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role: Joi.string().valid('admin', 'manager', 'viewer').default('manager'),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────
/**
 * Sign a short-lived access token and a longer-lived refresh token.
 * @param {{ id: string, email: string, role: string }} payload
 */
const signTokens = (payload) => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  const accessToken = jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
  const refreshToken = jwt.sign({ id: payload.id }, secret, { expiresIn: '30d' });
  return { accessToken, refreshToken };
};

// ── Mock user store (replace with DB queries in production) ──────────────────
// TODO: Replace mock store with real PostgreSQL queries via src/config/database.js
const mockUsers = new Map();

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/login
 * Authenticate with email + password, receive JWT tokens.
 */
router.post('/login', strictLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // TODO: replace with real DB lookup: SELECT * FROM users WHERE email = $1
    let user = mockUsers.get(email);

    // Seed a demo user on first login attempt so the API works out-of-the-box
    if (!user && email === 'demo@heroadsx.com') {
      const hash = await bcrypt.hash('Demo1234!', 12);
      user = { id: uuidv4(), name: 'Demo User', email, role: 'admin', passwordHash: hash };
      mockUsers.set(email, user);
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const { accessToken, refreshToken } = signTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    logger.info('User logged in', { userId: user.id, email: user.email });

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/register
 * Register a new user account.
 */
router.post('/register', strictLimiter, validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // TODO: replace with real DB check: SELECT id FROM users WHERE email = $1
    if (mockUsers.has(email)) {
      return res.status(409).json({ success: false, message: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = { id: uuidv4(), name, email, role, passwordHash };

    // TODO: replace with real DB insert: INSERT INTO users ...
    mockUsers.set(email, user);

    const { accessToken, refreshToken } = signTokens({ id: user.id, email: user.email, role: user.role });

    logger.info('New user registered', { userId: user.id, email: user.email });

    res.status(201).json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/refresh
 * Exchange a refresh token for a new access token.
 */
router.post('/refresh', validate(refreshSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, secret);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token' });
    }

    // TODO: look up user by decoded.id in the DB
    const user = [...mockUsers.values()].find((u) => u.id === decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    const { accessToken, refreshToken: newRefreshToken } = signTokens({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.json({ success: true, data: { accessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Return the currently authenticated user's profile.
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});

module.exports = router;
