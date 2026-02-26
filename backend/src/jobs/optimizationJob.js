'use strict';

const { Worker, Queue } = require('bullmq');
const MetaAdsService = require('../services/metaAds');
const GoogleAdsService = require('../services/googleAds');
const BidOptimizer = require('../services/bidOptimizer');
const AnomalyDetector = require('../services/anomalyDetector');
const logger = require('../config/logger');

const QUEUE_NAME = 'optimization';

// ── Shared service instances ──────────────────────────────────────────────────
const metaAds = new MetaAdsService();
const googleAds = new GoogleAdsService();
const bidOptimizer = new BidOptimizer();
const anomalyDetector = new AnomalyDetector();

// ── Redis connection options ──────────────────────────────────────────────────
const redisConnection = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Derive CPL from raw metrics, handling both Meta (float) and Google (micros) formats.
 * @param {object} metrics
 * @returns {number}
 */
const deriveCPL = (metrics) => {
  if (metrics.cpl) return parseFloat(metrics.cpl);
  if (metrics.costMicros) {
    const spend = metrics.costMicros / 1_000_000;
    const conversions = Math.max(metrics.conversions || 1, 1);
    return spend / conversions;
  }
  return 30; // sensible default when metrics are unavailable
};


const optimizationQueue = new Queue(QUEUE_NAME, { connection: redisConnection });

/**
 * Add an optimization job to the queue.
 *
 * @param {{ campaignIds?: string[], targetCPL?: number }} [data={}]
 * @param {import('bullmq').JobsOptions} [opts={}]
 * @returns {Promise<import('bullmq').Job>}
 */
const addOptimizationJob = async (data = {}, opts = {}) => {
  const job = await optimizationQueue.add('optimize', data, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5_000 },
    removeOnComplete: 100,
    removeOnFail: 50,
    ...opts,
  });
  logger.info('Optimization job queued', { jobId: job.id });
  return job;
};

// ── Worker ────────────────────────────────────────────────────────────────────
const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    logger.info('Processing optimization job', { jobId: job.id, attempt: job.attemptsMade + 1 });

    const { targetCPL = 35 } = job.data;

    try {
      // 1. Fetch campaigns from both platforms
      const [metaCampaigns, googleCampaigns] = await Promise.all([
        metaAds.getCampaigns(),
        googleAds.getCampaigns(),
      ]);

      const allCampaigns = [
        ...metaCampaigns.map((c) => ({ ...c, platform: 'meta' })),
        ...googleCampaigns.map((c) => ({ ...c, platform: 'google' })),
      ];

      logger.debug('Campaigns fetched', { count: allCampaigns.length });

      // 2. Fetch metrics and optimise bids per campaign
      const optimisationResults = await Promise.all(
        allCampaigns.map(async (campaign) => {
          const campaignId = campaign.id || campaign.campaign?.id;

          const metrics =
            campaign.platform === 'meta'
              ? await metaAds.getMetrics(campaignId)
              : await googleAds.getMetrics(campaignId);

          const cpl = deriveCPL(metrics);
          const currentBid = parseFloat(metrics.cpc || 2.0);

          const bidResult = bidOptimizer.calculateOptimalBid(
            { id: campaignId, currentBid, targetCPL },
            { cpl, conversions: metrics.conversions || 0, clicks: metrics.clicks || 0 }
          );

          return { campaignId, platform: campaign.platform, ...bidResult };
        })
      );

      // 3. Reallocate budgets
      const budgetAllocations = bidOptimizer.reallocateBudget(
        allCampaigns.map((c) => ({
          id: c.id || c.campaign?.id,
          spend: parseFloat(c.metrics?.spend || 100),
          conversions: parseInt(c.metrics?.leads || 5, 10),
          currentBudget: parseFloat(c.daily_budget || c.budget?.amountMicros / 1_000_000 || 100),
        }))
      );

      // 4. Detect anomalies (using mock historical data when real data unavailable)
      const mockHistory = Array.from({ length: 5 }, (_, i) => ({
        ctr: 2.5 - i * 0.1 + Math.random() * 0.2,
        cpl: 30 + i * 0.5 + Math.random() * 2,
        impressions: 5000 - i * 200 + Math.random() * 300,
        clicks: 150 - i * 5 + Math.random() * 10,
        spend: 200 - i * 10 + Math.random() * 20,
        timestamp: new Date(Date.now() - i * 3_600_000).toISOString(),
      }));

      const anomalies = anomalyDetector.detectAnomalies(mockHistory);

      const result = {
        processedAt: new Date().toISOString(),
        campaignsProcessed: allCampaigns.length,
        optimisationResults,
        budgetAllocations,
        anomalies,
      };

      logger.info('Optimization job completed', {
        jobId: job.id,
        campaigns: allCampaigns.length,
        anomalies: anomalies.length,
      });

      return result;
    } catch (err) {
      logger.error('Optimization job failed', { jobId: job.id, error: err.message });
      throw err;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

worker.on('completed', (job) => logger.info('Job completed', { jobId: job.id }));
worker.on('failed', (job, err) => logger.error('Job failed', { jobId: job?.id, error: err.message }));
worker.on('error', (err) => logger.error('Worker error', { error: err.message }));

module.exports = { optimizationQueue, addOptimizationJob, worker };
