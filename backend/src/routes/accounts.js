'use strict';

const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const logger = require('../config/logger');

const router = express.Router();
router.use(authenticate);

// ── Validation schemas ────────────────────────────────────────────────────────
const connectSchema = Joi.object({
  platform: Joi.string().valid('meta', 'google').required(),
  accessToken: Joi.string().required(),
  accountId: Joi.string().required(),
  accountName: Joi.string().required(),
});

// ── Mock store (replace with DB in production) ────────────────────────────────
// TODO: Replace with PostgreSQL CRUD via src/config/database.js (table: ad_accounts)
const mockAccounts = new Map([
  [
    'acc-1',
    {
      id: 'acc-1',
      platform: 'meta',
      accountId: 'act_123456789',
      accountName: 'Hero Ads – Meta',
      status: 'connected',
      createdAt: '2024-01-01T00:00:00Z',
    },
  ],
  [
    'acc-2',
    {
      id: 'acc-2',
      platform: 'google',
      accountId: '123-456-7890',
      accountName: 'Hero Ads – Google',
      status: 'connected',
      createdAt: '2024-01-02T00:00:00Z',
    },
  ],
]);

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/accounts
 * List all connected ad platform accounts.
 */
router.get('/', (_req, res) => {
  const accounts = [...mockAccounts.values()].map(({ id, platform, accountId, accountName, status, createdAt }) => ({
    id,
    platform,
    accountId,
    accountName,
    status,
    createdAt,
  }));
  res.json({ success: true, data: accounts });
});

/**
 * POST /api/accounts/connect
 * Connect a Meta or Google Ads account.
 * NOTE: Never log or store raw access tokens – encrypt before persisting.
 */
router.post('/connect', validate(connectSchema), (req, res) => {
  const { platform, accountId, accountName } = req.body;

  // Check for duplicate
  const existing = [...mockAccounts.values()].find(
    (a) => a.platform === platform && a.accountId === accountId
  );
  if (existing) {
    return res.status(409).json({ success: false, message: 'Account already connected' });
  }

  const account = {
    id: uuidv4(),
    platform,
    accountId,
    accountName,
    status: 'connected',
    createdAt: new Date().toISOString(),
  };

  // TODO: Encrypt accessToken with ENCRYPTION_KEY before storing to DB
  mockAccounts.set(account.id, account);

  logger.info('Ad account connected', { platform, accountId });

  res.status(201).json({ success: true, data: account });
});

/**
 * DELETE /api/accounts/:id
 * Disconnect (remove) an ad platform account.
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (!mockAccounts.has(id)) {
    return res.status(404).json({ success: false, message: 'Account not found' });
  }

  mockAccounts.delete(id);
  logger.info('Ad account disconnected', { id });

  res.json({ success: true, message: 'Account disconnected successfully' });
});

module.exports = router;
