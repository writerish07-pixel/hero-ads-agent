'use strict';

const express = require('express');
const authenticate = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// ── Mock analytics helpers ─────────────────────────────────────────────────
// TODO: Replace with real queries against time-series data in PostgreSQL / BigQuery
const generateWeeklyData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map((day) => ({
    day,
    leads: Math.floor(Math.random() * 40) + 10,
    impressions: Math.floor(Math.random() * 8000) + 2000,
    clicks: Math.floor(Math.random() * 400) + 50,
    spend: parseFloat((Math.random() * 200 + 50).toFixed(2)),
  }));
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/analytics/metrics
 * Return top-level KPI metrics.
 */
router.get('/metrics', (_req, res) => {
  res.json({
    success: true,
    data: {
      totalLeads: 247,
      avgCPL: 31.5,
      totalImpressions: 89400,
      avgCTR: 2.34,
      totalSpend: 7780.5,
      totalClicks: 2092,
      conversionRate: 11.8,
      roas: 4.2,
      periodStart: '2024-07-01',
      periodEnd: '2024-07-31',
    },
  });
});

/**
 * GET /api/analytics/performance
 * Return weekly performance time-series data.
 */
router.get('/performance', (_req, res) => {
  res.json({
    success: true,
    data: generateWeeklyData(),
  });
});

/**
 * GET /api/analytics/locations
 * Return top performing geographic locations.
 */
router.get('/locations', (_req, res) => {
  res.json({
    success: true,
    data: [
      { location: 'New York, NY', leads: 68, cpl: 28.5, impressions: 24000, ctr: 2.8 },
      { location: 'Los Angeles, CA', leads: 54, cpl: 32.1, impressions: 19500, ctr: 2.5 },
      { location: 'Chicago, IL', leads: 41, cpl: 29.8, impressions: 15200, ctr: 2.3 },
      { location: 'Houston, TX', leads: 38, cpl: 34.2, impressions: 13800, ctr: 2.1 },
      { location: 'Phoenix, AZ', leads: 29, cpl: 31.0, impressions: 10400, ctr: 2.6 },
    ],
  });
});

module.exports = router;
