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
const campaignSchema = Joi.object({
  name: Joi.string().min(2).max(200).required(),
  platform: Joi.string().valid('meta', 'google', 'both').required(),
  objective: Joi.string().valid('awareness', 'traffic', 'leads', 'conversions').required(),
  dailyBudget: Joi.number().positive().required(),
  startDate: Joi.string().isoDate().required(),
  endDate: Joi.string().isoDate().optional(),
  targetAudience: Joi.object().optional(),
  status: Joi.string().valid('active', 'paused', 'draft').default('draft'),
});

const updateSchema = campaignSchema.fork(
  ['name', 'platform', 'objective', 'dailyBudget', 'startDate'],
  (field) => field.optional()
);

// ── Mock store ────────────────────────────────────────────────────────────────
// TODO: Replace with PostgreSQL queries (table: campaigns)
const mockCampaigns = new Map([
  [
    'camp-1',
    {
      id: 'camp-1',
      name: 'Summer Lead Gen',
      platform: 'meta',
      objective: 'leads',
      dailyBudget: 150,
      startDate: '2024-06-01',
      status: 'active',
      metrics: { impressions: 12400, clicks: 310, leads: 42, ctr: 2.5, cpl: 32.14, spend: 1350 },
      createdAt: '2024-06-01T00:00:00Z',
    },
  ],
  [
    'camp-2',
    {
      id: 'camp-2',
      name: 'Brand Awareness Q3',
      platform: 'google',
      objective: 'awareness',
      dailyBudget: 200,
      startDate: '2024-07-01',
      status: 'active',
      metrics: { impressions: 45000, clicks: 900, leads: 65, ctr: 2.0, cpl: 28.85, spend: 1876 },
      createdAt: '2024-07-01T00:00:00Z',
    },
  ],
]);

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/campaigns – list all campaigns with performance metrics */
router.get('/', (_req, res) => {
  res.json({ success: true, data: [...mockCampaigns.values()] });
});

/** POST /api/campaigns – create a new campaign */
router.post('/', validate(campaignSchema), (req, res) => {
  const campaign = {
    id: uuidv4(),
    ...req.body,
    metrics: { impressions: 0, clicks: 0, leads: 0, ctr: 0, cpl: 0, spend: 0 },
    createdAt: new Date().toISOString(),
  };
  mockCampaigns.set(campaign.id, campaign);
  logger.info('Campaign created', { id: campaign.id, name: campaign.name });
  res.status(201).json({ success: true, data: campaign });
});

/** PUT /api/campaigns/:id – update campaign */
router.put('/:id', validate(updateSchema), (req, res) => {
  const { id } = req.params;
  const campaign = mockCampaigns.get(id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  const updated = { ...campaign, ...req.body, updatedAt: new Date().toISOString() };
  mockCampaigns.set(id, updated);
  logger.info('Campaign updated', { id });
  res.json({ success: true, data: updated });
});

/** DELETE /api/campaigns/:id – delete campaign */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!mockCampaigns.has(id)) return res.status(404).json({ success: false, message: 'Campaign not found' });

  mockCampaigns.delete(id);
  logger.info('Campaign deleted', { id });
  res.json({ success: true, message: 'Campaign deleted' });
});

/** POST /api/campaigns/:id/pause – pause a campaign */
router.post('/:id/pause', (req, res) => {
  const { id } = req.params;
  const campaign = mockCampaigns.get(id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  campaign.status = 'paused';
  campaign.updatedAt = new Date().toISOString();
  mockCampaigns.set(id, campaign);
  logger.info('Campaign paused', { id });
  res.json({ success: true, data: campaign });
});

/** POST /api/campaigns/:id/resume – resume a paused campaign */
router.post('/:id/resume', (req, res) => {
  const { id } = req.params;
  const campaign = mockCampaigns.get(id);
  if (!campaign) return res.status(404).json({ success: false, message: 'Campaign not found' });

  campaign.status = 'active';
  campaign.updatedAt = new Date().toISOString();
  mockCampaigns.set(id, campaign);
  logger.info('Campaign resumed', { id });
  res.json({ success: true, data: campaign });
});

module.exports = router;
