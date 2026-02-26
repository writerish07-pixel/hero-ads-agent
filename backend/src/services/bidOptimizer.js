'use strict';

const logger = require('../config/logger');

/**
 * Pure algorithmic bid and budget optimisation logic.
 * No external API calls – works entirely on the provided metrics data.
 */
class BidOptimizer {
  /**
   * Calculate the optimal bid for a campaign based on current CPL vs target CPL.
   *
   * Rules:
   *  - If CPL > targetCPL           → reduce bid by 10 %
   *  - If CPL < targetCPL * 0.8     → increase bid by 5 %
   *  - Otherwise                    → keep bid unchanged
   *
   * @param {{ id: string, currentBid: number, targetCPL: number }} campaign
   * @param {{ cpl: number, conversions: number, clicks: number }}  metrics
   * @returns {{ campaignId: string, previousBid: number, newBid: number, action: string }}
   */
  calculateOptimalBid(campaign, metrics) {
    const { id: campaignId, currentBid, targetCPL } = campaign;
    const { cpl } = metrics;

    let newBid = currentBid;
    let action = 'unchanged';

    if (cpl > targetCPL) {
      newBid = parseFloat((currentBid * 0.9).toFixed(4));
      action = 'decreased';
    } else if (cpl < targetCPL * 0.8) {
      newBid = parseFloat((currentBid * 1.05).toFixed(4));
      action = 'increased';
    }

    logger.debug('Bid optimisation', { campaignId, previousBid: currentBid, newBid, action, cpl, targetCPL });

    return { campaignId, previousBid: currentBid, newBid, action, cpl, targetCPL };
  }

  /**
   * Reallocate total budget across campaigns proportionally to their performance scores.
   * Performance score = (conversions / spend) normalised to 0–100.
   *
   * @param {Array<{ id: string, spend: number, conversions: number, currentBudget: number }>} campaigns
   * @returns {Array<{ campaignId: string, previousBudget: number, newBudget: number }>}
   */
  reallocateBudget(campaigns) {
    if (!campaigns || campaigns.length === 0) return [];

    // Calculate performance scores (conversions per dollar spent, avoiding div-by-zero)
    const scored = campaigns.map((c) => ({
      ...c,
      score: c.spend > 0 ? c.conversions / c.spend : 0,
    }));

    const totalScore = scored.reduce((sum, c) => sum + c.score, 0);
    const totalBudget = campaigns.reduce((sum, c) => sum + c.currentBudget, 0);

    return scored.map((c) => {
      const share = totalScore > 0 ? c.score / totalScore : 1 / campaigns.length;
      const newBudget = parseFloat((totalBudget * share).toFixed(2));

      logger.debug('Budget reallocation', { campaignId: c.id, previousBudget: c.currentBudget, newBudget, share });

      return { campaignId: c.id, previousBudget: c.currentBudget, newBudget, performanceScore: parseFloat((c.score * 100).toFixed(2)) };
    });
  }

  /**
   * Detect anomalies in a campaign's metrics history.
   * Checks for sudden CPL spikes (> 50 %) or CTR drops (> 30 %) relative to
   * the preceding period average.
   *
   * @param {Array<{ cpl: number, ctr: number, impressions: number, timestamp: string }>} metricsHistory
   * @returns {Array<{ type: string, severity: 'low'|'medium'|'high', detail: string, timestamp: string }>}
   */
  detectAnomalies(metricsHistory) {
    if (!metricsHistory || metricsHistory.length < 2) return [];

    const anomalies = [];
    const [baseline, ...rest] = metricsHistory;

    for (const point of rest) {
      // CPL spike detection
      if (baseline.cpl > 0 && point.cpl > baseline.cpl * 1.5) {
        anomalies.push({
          type: 'cpl_spike',
          severity: point.cpl > baseline.cpl * 2 ? 'high' : 'medium',
          detail: `CPL increased from $${baseline.cpl.toFixed(2)} to $${point.cpl.toFixed(2)} (+${(((point.cpl - baseline.cpl) / baseline.cpl) * 100).toFixed(0)}%)`,
          timestamp: point.timestamp,
        });
      }

      // CTR drop detection
      if (baseline.ctr > 0 && point.ctr < baseline.ctr * 0.7) {
        anomalies.push({
          type: 'ctr_drop',
          severity: point.ctr < baseline.ctr * 0.5 ? 'high' : 'medium',
          detail: `CTR dropped from ${baseline.ctr.toFixed(2)}% to ${point.ctr.toFixed(2)}% (-${(((baseline.ctr - point.ctr) / baseline.ctr) * 100).toFixed(0)}%)`,
          timestamp: point.timestamp,
        });
      }

      // Impression share drop detection
      if (baseline.impressions > 0 && point.impressions < baseline.impressions * 0.5) {
        anomalies.push({
          type: 'impression_drop',
          severity: 'low',
          detail: `Impressions dropped from ${baseline.impressions} to ${point.impressions}`,
          timestamp: point.timestamp,
        });
      }
    }

    return anomalies;
  }

  /**
   * Adjust bid based on a simple performance signal (convenience wrapper).
   * @param {number} currentBid
   * @param {number} cpl
   * @param {number} targetCPL
   * @returns {number} Adjusted bid value
   */
  adjustBid(currentBid, cpl, targetCPL) {
    const { newBid } = this.calculateOptimalBid({ id: 'temp', currentBid, targetCPL }, { cpl });
    return newBid;
  }
}

module.exports = BidOptimizer;
