'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');
const logger = require('../config/logger');

const router = express.Router();
router.use(authenticate);

// ── Shared campaign state helper (mock) ──────────────────────────────────────
// TODO: Replace with real DB updates and Meta/Google API calls
const applyCampaignStatusChange = (newStatus) => {
  // In production: iterate all campaigns in DB and call platform SDKs
  logger.info(`Applying status change to all campaigns`, { newStatus });
  return {
    affectedCampaigns: 2,
    newStatus,
    appliedAt: new Date().toISOString(),
  };
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/controls/pause-all
 * Emergency pause all active campaigns across all platforms.
 */
router.post('/pause-all', (req, res) => {
  const result = applyCampaignStatusChange('paused');
  logger.warn('ALL campaigns paused', { initiatedBy: req.user?.email });

  // Broadcast to WebSocket clients
  const broadcast = req.app.get('broadcast');
  if (broadcast) broadcast({ type: 'campaigns:paused-all', ...result });

  res.json({ success: true, data: result });
});

/**
 * POST /api/controls/stop-all
 * Stop and archive all campaigns (more permanent than pause).
 */
router.post('/stop-all', (req, res) => {
  const result = applyCampaignStatusChange('stopped');
  logger.warn('ALL campaigns stopped', { initiatedBy: req.user?.email });

  const broadcast = req.app.get('broadcast');
  if (broadcast) broadcast({ type: 'campaigns:stopped-all', ...result });

  res.json({ success: true, data: result });
});

/**
 * POST /api/controls/resume-all
 * Resume all paused/stopped campaigns.
 */
router.post('/resume-all', (req, res) => {
  const result = applyCampaignStatusChange('active');
  logger.info('ALL campaigns resumed', { initiatedBy: req.user?.email });

  const broadcast = req.app.get('broadcast');
  if (broadcast) broadcast({ type: 'campaigns:resumed-all', ...result });

  res.json({ success: true, data: result });
});

module.exports = router;
