'use strict';

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const accountRoutes = require('./accounts');
const campaignRoutes = require('./campaigns');
const budgetRoutes = require('./budgets');
const analyticsRoutes = require('./analytics');
const keywordRoutes = require('./keywords');
const adCreatorRoutes = require('./adcreator');
const controlRoutes = require('./controls');

router.use('/auth', authRoutes);
router.use('/accounts', accountRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/budgets', budgetRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/keywords', keywordRoutes);
router.use('/ads', adCreatorRoutes);
router.use('/controls', controlRoutes);

module.exports = router;
