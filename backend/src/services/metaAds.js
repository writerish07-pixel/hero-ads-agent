'use strict';

const axios = require('axios');
const logger = require('../config/logger');

const META_GRAPH_URL = 'https://graph.facebook.com/v18.0';

/**
 * Service stub for the Meta (Facebook) Ads API.
 * Falls back to mock data when META_ACCESS_TOKEN is not configured.
 */
class MetaAdsService {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.adAccountId = process.env.META_AD_ACCOUNT_ID;
    this.isConfigured = Boolean(this.accessToken && this.adAccountId);

    if (!this.isConfigured) {
      logger.warn('MetaAdsService: META_ACCESS_TOKEN or META_AD_ACCOUNT_ID not set – using mock data');
    }
  }

  /** Shared Axios instance with the access_token appended to every request. */
  _client() {
    return axios.create({
      baseURL: META_GRAPH_URL,
      params: { access_token: this.accessToken },
      timeout: 10_000,
    });
  }

  /**
   * Fetch all campaigns for the configured ad account.
   * @returns {Promise<Array>}
   */
  async getCampaigns() {
    if (!this.isConfigured) return this._mockCampaigns();

    try {
      const { data } = await this._client().get(`/${this.adAccountId}/campaigns`, {
        params: { fields: 'id,name,status,objective,daily_budget,start_time,stop_time' },
      });
      return data.data || [];
    } catch (err) {
      logger.error('MetaAdsService.getCampaigns failed', { error: err.message });
      return this._mockCampaigns();
    }
  }

  /**
   * Create a new campaign.
   * @param {{ name: string, objective: string, status: string, daily_budget: number }} params
   */
  async createCampaign(params) {
    if (!this.isConfigured) return { id: `meta-mock-${Date.now()}`, ...params };

    try {
      const { data } = await this._client().post(`/${this.adAccountId}/campaigns`, params);
      return data;
    } catch (err) {
      logger.error('MetaAdsService.createCampaign failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Update an existing campaign.
   * @param {string} campaignId
   * @param {object} updates
   */
  async updateCampaign(campaignId, updates) {
    if (!this.isConfigured) return { id: campaignId, ...updates };

    try {
      const { data } = await this._client().post(`/${campaignId}`, updates);
      return data;
    } catch (err) {
      logger.error('MetaAdsService.updateCampaign failed', { campaignId, error: err.message });
      throw err;
    }
  }

  /**
   * Pause a campaign by setting its status to PAUSED.
   * @param {string} campaignId
   */
  async pauseCampaign(campaignId) {
    return this.updateCampaign(campaignId, { status: 'PAUSED' });
  }

  /**
   * Fetch performance metrics for a campaign.
   * @param {string} campaignId
   * @param {{ since: string, until: string }} dateRange
   */
  async getMetrics(campaignId, dateRange = {}) {
    if (!this.isConfigured) return this._mockMetrics(campaignId);

    try {
      const { data } = await this._client().get(`/${campaignId}/insights`, {
        params: {
          fields: 'impressions,clicks,spend,ctr,cpm,actions',
          time_range: JSON.stringify(dateRange),
        },
      });
      return data.data?.[0] || {};
    } catch (err) {
      logger.error('MetaAdsService.getMetrics failed', { campaignId, error: err.message });
      return this._mockMetrics(campaignId);
    }
  }

  // ── Mock data helpers ───────────────────────────────────────────────────────
  _mockCampaigns() {
    return [
      { id: 'meta-camp-1', name: 'Mock Summer Lead Gen', status: 'ACTIVE', objective: 'LEAD_GENERATION', daily_budget: 15000 },
      { id: 'meta-camp-2', name: 'Mock Brand Awareness', status: 'ACTIVE', objective: 'BRAND_AWARENESS', daily_budget: 20000 },
    ];
  }

  _mockMetrics(campaignId) {
    return {
      campaign_id: campaignId,
      impressions: String(Math.floor(Math.random() * 10000) + 5000),
      clicks: String(Math.floor(Math.random() * 500) + 100),
      spend: (Math.random() * 500 + 100).toFixed(2),
      ctr: (Math.random() * 3 + 1).toFixed(2),
      cpm: (Math.random() * 10 + 5).toFixed(2),
    };
  }
}

module.exports = MetaAdsService;
