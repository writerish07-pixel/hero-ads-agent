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
const approveSchema = Joi.object({
  campaignId: Joi.string().required(),
  amount: Joi.number().positive().required(),
  notes: Joi.string().max(500).optional(),
});

const adjustSchema = Joi.object({
  campaignId: Joi.string().required(),
  newDailyBudget: Joi.number().positive().required(),
  reason: Joi.string().max(500).optional(),
});

// ── Mock data ─────────────────────────────────────────────────────────────────
// TODO: Replace with PostgreSQL queries (table: budgets)
const mockBudgets = [
  { id: 'bud-1', campaignId: 'camp-1', campaignName: 'Summer Lead Gen', dailyBudget: 150, monthlyBudget: 4500, spent: 1350, remaining: 3150, status: 'approved' },
  { id: 'bud-2', campaignId: 'camp-2', campaignName: 'Brand Awareness Q3', dailyBudget: 200, monthlyBudget: 6000, spent: 1876, remaining: 4124, status: 'approved' },
  { id: 'bud-3', campaignId: 'camp-3', campaignName: 'Retargeting – July', dailyBudget: 75, monthlyBudget: 2250, spent: 0, remaining: 2250, status: 'pending' },
];

const approvalLog = [];

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /api/budgets – list all budget allocations */
router.get('/', (_req, res) => {
  res.json({ success: true, data: mockBudgets });
});

/** POST /api/budgets/approve – approve a daily budget request */
router.post('/approve', validate(approveSchema), (req, res) => {
  const { campaignId, amount, notes } = req.body;

  const budget = mockBudgets.find((b) => b.campaignId === campaignId);
  if (!budget) {
    return res.status(404).json({ success: false, message: 'Budget record not found for campaign' });
  }

  const approval = {
    id: uuidv4(),
    campaignId,
    approvedAmount: amount,
    approvedBy: req.user?.email || 'system',
    notes: notes || '',
    timestamp: new Date().toISOString(),
  };
  approvalLog.push(approval);

  budget.dailyBudget = amount;
  budget.status = 'approved';

  logger.info('Budget approved', { campaignId, amount });
  res.json({ success: true, data: approval });
});

/** POST /api/budgets/adjust – adjust an existing campaign budget */
router.post('/adjust', validate(adjustSchema), (req, res) => {
  const { campaignId, newDailyBudget, reason } = req.body;

  const budget = mockBudgets.find((b) => b.campaignId === campaignId);
  if (!budget) {
    return res.status(404).json({ success: false, message: 'Budget record not found for campaign' });
  }

  const previousBudget = budget.dailyBudget;
  budget.dailyBudget = newDailyBudget;
  budget.monthlyBudget = newDailyBudget * 30;

  logger.info('Budget adjusted', { campaignId, from: previousBudget, to: newDailyBudget, reason });

  res.json({
    success: true,
    data: {
      campaignId,
      previousDailyBudget: previousBudget,
      newDailyBudget,
      reason: reason || '',
      updatedAt: new Date().toISOString(),
    },
  });
});

module.exports = router;
