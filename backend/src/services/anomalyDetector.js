'use strict';

const logger = require('../config/logger');

/** Severity levels for anomaly alerts. */
const SEVERITY = { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' };

/**
 * Detects performance anomalies in ad campaign metrics time-series data.
 */
class AnomalyDetector {
  /**
   * Analyse a time-series array of campaign metrics and return detected anomalies.
   *
   * Checks:
   *  - CTR drops > 30 % vs. previous period
   *  - CPL spikes > 50 % vs. previous period
   *  - Impression share drops > 40 %
   *
   * @param {Array<{
   *   ctr: number,
   *   cpl: number,
   *   impressions: number,
   *   clicks: number,
   *   spend: number,
   *   timestamp: string
   * }>} metricsTimeSeries - Ordered oldest-first
   * @returns {Array<object>} Detected anomalies with severity and details
   */
  detectAnomalies(metricsTimeSeries) {
    if (!Array.isArray(metricsTimeSeries) || metricsTimeSeries.length < 2) {
      return [];
    }

    const anomalies = [];

    for (let i = 1; i < metricsTimeSeries.length; i++) {
      const prev = metricsTimeSeries[i - 1];
      const curr = metricsTimeSeries[i];

      // ── CTR drop ──────────────────────────────────────────────────────────
      if (prev.ctr > 0) {
        const ctrChange = (curr.ctr - prev.ctr) / prev.ctr;
        if (ctrChange < -0.3) {
          const severity = ctrChange < -0.6 ? SEVERITY.CRITICAL : ctrChange < -0.45 ? SEVERITY.HIGH : SEVERITY.MEDIUM;
          anomalies.push(
            this.generateAlert({
              type: 'ctr_drop',
              severity,
              metric: 'CTR',
              previousValue: prev.ctr,
              currentValue: curr.ctr,
              changePercent: ctrChange * 100,
              timestamp: curr.timestamp,
            })
          );
        }
      }

      // ── CPL spike ─────────────────────────────────────────────────────────
      if (prev.cpl > 0) {
        const cplChange = (curr.cpl - prev.cpl) / prev.cpl;
        if (cplChange > 0.5) {
          const severity = cplChange > 1.5 ? SEVERITY.CRITICAL : cplChange > 1.0 ? SEVERITY.HIGH : SEVERITY.MEDIUM;
          anomalies.push(
            this.generateAlert({
              type: 'cpl_spike',
              severity,
              metric: 'CPL',
              previousValue: prev.cpl,
              currentValue: curr.cpl,
              changePercent: cplChange * 100,
              timestamp: curr.timestamp,
            })
          );
        }
      }

      // ── Impression share drop ─────────────────────────────────────────────
      if (prev.impressions > 0) {
        const impressionChange = (curr.impressions - prev.impressions) / prev.impressions;
        if (impressionChange < -0.4) {
          const severity = impressionChange < -0.7 ? SEVERITY.HIGH : SEVERITY.LOW;
          anomalies.push(
            this.generateAlert({
              type: 'impression_drop',
              severity,
              metric: 'Impressions',
              previousValue: prev.impressions,
              currentValue: curr.impressions,
              changePercent: impressionChange * 100,
              timestamp: curr.timestamp,
            })
          );
        }
      }

      // ── Spend runaway (> 50 % over expected daily pacing) ─────────────────
      if (prev.spend > 0) {
        const spendChange = (curr.spend - prev.spend) / prev.spend;
        if (spendChange > 0.5) {
          anomalies.push(
            this.generateAlert({
              type: 'spend_spike',
              severity: SEVERITY.HIGH,
              metric: 'Spend',
              previousValue: prev.spend,
              currentValue: curr.spend,
              changePercent: spendChange * 100,
              timestamp: curr.timestamp,
            })
          );
        }
      }
    }

    if (anomalies.length > 0) {
      logger.warn('Anomalies detected', { count: anomalies.length, types: [...new Set(anomalies.map((a) => a.type))] });
    }

    return anomalies;
  }

  /**
   * Format an anomaly event into a structured alert object.
   *
   * @param {{
   *   type: string,
   *   severity: string,
   *   metric: string,
   *   previousValue: number,
   *   currentValue: number,
   *   changePercent: number,
   *   timestamp: string
   * }} anomaly
   * @returns {object} Formatted alert
   */
  generateAlert(anomaly) {
    const { type, severity, metric, previousValue, currentValue, changePercent, timestamp } = anomaly;

    const direction = changePercent > 0 ? 'increased' : 'decreased';
    const absChange = Math.abs(changePercent).toFixed(1);

    const messages = {
      ctr_drop: `CTR dropped by ${absChange}% (${previousValue.toFixed(2)}% → ${currentValue.toFixed(2)}%)`,
      cpl_spike: `CPL spiked by ${absChange}% ($${previousValue.toFixed(2)} → $${currentValue.toFixed(2)})`,
      impression_drop: `Impressions ${direction} by ${absChange}% (${Math.round(previousValue)} → ${Math.round(currentValue)})`,
      spend_spike: `Spend ${direction} by ${absChange}% ($${previousValue.toFixed(2)} → $${currentValue.toFixed(2)})`,
    };

    const alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      severity,
      metric,
      message: messages[type] || `${metric} anomaly detected: ${absChange}% change`,
      previousValue,
      currentValue,
      changePercent: parseFloat(changePercent.toFixed(2)),
      timestamp: timestamp || new Date().toISOString(),
      recommendedAction: this._getRecommendedAction(type, severity),
    };

    logger.debug('Alert generated', { type: alert.type, severity: alert.severity });
    return alert;
  }

  /**
   * Return a human-readable recommended action for a given anomaly type and severity.
   * @private
   */
  _getRecommendedAction(type, severity) {
    const actions = {
      ctr_drop: severity === SEVERITY.CRITICAL
        ? 'Immediately pause campaign and review ad creatives'
        : 'Review ad copy and audience targeting; consider refreshing creatives',
      cpl_spike: severity === SEVERITY.CRITICAL
        ? 'Pause campaign and investigate audience/bid settings immediately'
        : 'Review bid strategy and audience targeting; consider reducing bids by 10-15%',
      impression_drop: 'Check account status, budget limits, and bid competitiveness',
      spend_spike: 'Review budget caps and pacing settings; check for accidental bid increases',
    };
    return actions[type] || 'Review campaign settings and contact support if issue persists';
  }
}

module.exports = AnomalyDetector;
