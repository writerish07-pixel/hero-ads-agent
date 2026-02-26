'use strict';

const express = require('express');
const Joi = require('joi');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const AIService = require('../services/aiService');
const logger = require('../config/logger');

const router = express.Router();
router.use(authenticate);

const aiService = new AIService();

// ── Validation schema ─────────────────────────────────────────────────────────
const generateSchema = Joi.object({
  campaignName: Joi.string().min(2).required(),
  objective: Joi.string().valid('awareness', 'traffic', 'leads', 'conversions').required(),
  targetAudience: Joi.string().min(5).required(),
  industry: Joi.string().min(2).required(),
  tone: Joi.string().valid('professional', 'friendly', 'urgent', 'inspirational').default('professional'),
  platform: Joi.string().valid('meta', 'google', 'both').default('both'),
  additionalContext: Joi.string().max(500).optional(),
  numVariants: Joi.number().integer().min(1).max(5).default(3),
});

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * POST /api/ads/generate
 * Generate AI-powered ad copy variants.
 */
router.post('/generate', validate(generateSchema), async (req, res, next) => {
  try {
    logger.info('Generating ad copy', {
      campaignName: req.body.campaignName,
      platform: req.body.platform,
      userId: req.user?.id,
    });

    const adCopy = await aiService.generateAdCopy(req.body);

    res.json({ success: true, data: adCopy });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
