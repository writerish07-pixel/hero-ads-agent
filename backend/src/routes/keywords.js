'use strict';

const express = require('express');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const AIService = require('../services/aiService');
const logger = require('../config/logger');

const router = express.Router();
router.use(authenticate);

const aiService = new AIService();

// ── Validation schemas ────────────────────────────────────────────────────────
const addKeywordsSchema = Joi.object({
  campaignId: Joi.string().required(),
  keywords: Joi.array().items(Joi.string().min(1)).min(1).required(),
  matchType: Joi.string().valid('broad', 'phrase', 'exact').default('broad'),
});

const negativeKeywordSchema = Joi.object({
  campaignId: Joi.string().required(),
  keywords: Joi.array().items(Joi.string().min(1)).min(1).required(),
});

const suggestionsQuerySchema = Joi.object({
  businessContext: Joi.string().min(5).required(),
  industry: Joi.string().optional(),
});

// ── Mock store ────────────────────────────────────────────────────────────────
// TODO: Replace with PostgreSQL queries (table: keywords)
const mockKeywords = new Map([
  ['kw-1', { id: 'kw-1', campaignId: 'camp-1', keyword: 'home insurance', matchType: 'exact', bid: 2.5, impressions: 3200, clicks: 96, ctr: 3.0, negative: false }],
  ['kw-2', { id: 'kw-2', campaignId: 'camp-1', keyword: 'car insurance quote', matchType: 'phrase', bid: 1.8, impressions: 2800, clicks: 70, ctr: 2.5, negative: false }],
  ['kw-3', { id: 'kw-3', campaignId: 'camp-2', keyword: 'life insurance', matchType: 'broad', bid: 3.1, impressions: 4100, clicks: 82, ctr: 2.0, negative: false }],
]);

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/keywords – list all keywords */
router.get('/', (_req, res) => {
  res.json({ success: true, data: [...mockKeywords.values()] });
});

/** GET /api/keywords/suggestions – AI-suggested keywords */
router.get('/suggestions', validate(suggestionsQuerySchema, 'query'), async (req, res, next) => {
  try {
    const { businessContext, industry } = req.query;
    const suggestions = await aiService.suggestKeywords({ businessContext, industry });
    res.json({ success: true, data: suggestions });
  } catch (err) {
    next(err);
  }
});

/** POST /api/keywords – add keywords to a campaign */
router.post('/', validate(addKeywordsSchema), (req, res) => {
  const { campaignId, keywords, matchType } = req.body;
  const created = keywords.map((keyword) => {
    const kw = { id: uuidv4(), campaignId, keyword, matchType, bid: 1.0, impressions: 0, clicks: 0, ctr: 0, negative: false };
    mockKeywords.set(kw.id, kw);
    return kw;
  });

  logger.info('Keywords added', { campaignId, count: created.length });
  res.status(201).json({ success: true, data: created });
});

/** DELETE /api/keywords/:id – remove a keyword */
router.delete('/:id', (req, res) => {
  const { id } = req.params;
  if (!mockKeywords.has(id)) return res.status(404).json({ success: false, message: 'Keyword not found' });

  mockKeywords.delete(id);
  logger.info('Keyword removed', { id });
  res.json({ success: true, message: 'Keyword removed' });
});

/** POST /api/keywords/negative – add negative keywords */
router.post('/negative', validate(negativeKeywordSchema), (req, res) => {
  const { campaignId, keywords } = req.body;
  const created = keywords.map((keyword) => {
    const kw = { id: uuidv4(), campaignId, keyword, matchType: 'broad', bid: 0, impressions: 0, clicks: 0, ctr: 0, negative: true };
    mockKeywords.set(kw.id, kw);
    return kw;
  });

  logger.info('Negative keywords added', { campaignId, count: created.length });
  res.status(201).json({ success: true, data: created });
});

module.exports = router;
