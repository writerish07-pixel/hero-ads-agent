'use strict';

const axios = require('axios');
const logger = require('../config/logger');

const GOOGLE_ADS_API_VERSION = 'v15';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/**
 * Service stub for the Google Ads API (REST endpoint).
 * Falls back to mock data when credentials are not configured.
 */
class GoogleAdsService {
  constructor() {
    this.developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
    this.clientId = process.env.GOOGLE_ADS_CLIENT_ID;
    this.clientSecret = process.env.GOOGLE_ADS_CLIENT_SECRET;
    this.refreshToken = process.env.GOOGLE_ADS_REFRESH_TOKEN;
    this.customerId = process.env.GOOGLE_ADS_CUSTOMER_ID?.replace(/-/g, '');

    this.isConfigured = Boolean(
      this.developerToken && this.clientId && this.clientSecret && this.refreshToken && this.customerId
    );

    this._accessToken = null;
    this._tokenExpiry = 0;

    if (!this.isConfigured) {
      logger.warn('GoogleAdsService: credentials not fully configured – using mock data');
    }
  }

  /** Obtain (or reuse) an OAuth2 access token. */
  async _getAccessToken() {
    if (this._accessToken && Date.now() < this._tokenExpiry) {
      return this._accessToken;
    }

    const { data } = await axios.post(GOOGLE_TOKEN_URL, {
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: this.refreshToken,
      grant_type: 'refresh_token',
    });

    this._accessToken = data.access_token;
    this._tokenExpiry = Date.now() + (data.expires_in - 60) * 1_000;
    return this._accessToken;
  }

  /** Shared Axios headers for authenticated requests. */
  async _headers() {
    const token = await this._getAccessToken();
    return {
      Authorization: `Bearer ${token}`,
      'developer-token': this.developerToken,
      'login-customer-id': this.customerId,
    };
  }

  /**
   * Fetch all campaigns for the configured customer.
   * @returns {Promise<Array>}
   */
  async getCampaigns() {
    if (!this.isConfigured) return this._mockCampaigns();

    try {
      const headers = await this._headers();
      const { data } = await axios.post(
        `${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/googleAds:searchStream`,
        {
          query: `SELECT campaign.id, campaign.name, campaign.status, campaign.advertising_channel_type,
                         campaign_budget.amount_micros
                  FROM campaign WHERE campaign.status != 'REMOVED'`,
        },
        { headers }
      );
      return data?.[0]?.results || [];
    } catch (err) {
      logger.error('GoogleAdsService.getCampaigns failed', { error: err.message });
      return this._mockCampaigns();
    }
  }

  /**
   * Create a new campaign.
   * @param {object} campaignParams
   */
  async createCampaign(campaignParams) {
    if (!this.isConfigured) return { resourceName: `customers/${this.customerId}/campaigns/mock-${Date.now()}` };

    try {
      const headers = await this._headers();
      const { data } = await axios.post(
        `${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/campaigns:mutate`,
        { operations: [{ create: campaignParams }] },
        { headers }
      );
      return data.results?.[0] || {};
    } catch (err) {
      logger.error('GoogleAdsService.createCampaign failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Update a campaign by resource name.
   * @param {string} campaignResourceName
   * @param {object} updates
   */
  async updateCampaign(campaignResourceName, updates) {
    if (!this.isConfigured) return { resourceName: campaignResourceName, ...updates };

    try {
      const headers = await this._headers();
      const { data } = await axios.post(
        `${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/campaigns:mutate`,
        { operations: [{ update: { resourceName: campaignResourceName, ...updates }, updateMask: Object.keys(updates).join(',') }] },
        { headers }
      );
      return data.results?.[0] || {};
    } catch (err) {
      logger.error('GoogleAdsService.updateCampaign failed', { error: err.message });
      throw err;
    }
  }

  /**
   * Pause a campaign.
   * @param {string} campaignResourceName
   */
  async pauseCampaign(campaignResourceName) {
    return this.updateCampaign(campaignResourceName, { status: 'PAUSED' });
  }

  /**
   * Fetch performance metrics using the Reporting API.
   * @param {string} campaignId
   * @param {string} [dateRange='LAST_7_DAYS']
   */
  async getMetrics(campaignId, dateRange = 'LAST_7_DAYS') {
    if (!this.isConfigured) return this._mockMetrics(campaignId);

    try {
      const headers = await this._headers();
      const { data } = await axios.post(
        `${GOOGLE_ADS_BASE_URL}/customers/${this.customerId}/googleAds:searchStream`,
        {
          query: `SELECT campaign.id, metrics.impressions, metrics.clicks, metrics.cost_micros,
                         metrics.ctr, metrics.conversions
                  FROM campaign
                  WHERE campaign.id = ${campaignId}
                    AND segments.date DURING ${dateRange}`,
        },
        { headers }
      );
      return data?.[0]?.results?.[0]?.metrics || {};
    } catch (err) {
      logger.error('GoogleAdsService.getMetrics failed', { campaignId, error: err.message });
      return this._mockMetrics(campaignId);
    }
  }

  // ── Mock data helpers ───────────────────────────────────────────────────────
  _mockCampaigns() {
    return [
      { campaign: { id: 'google-camp-1', name: 'Mock Search Campaign', status: 'ENABLED' }, budget: { amountMicros: 5000000 } },
      { campaign: { id: 'google-camp-2', name: 'Mock Display Campaign', status: 'ENABLED' }, budget: { amountMicros: 7500000 } },
    ];
  }

  _mockMetrics(campaignId) {
    return {
      campaignId,
      impressions: Math.floor(Math.random() * 15000) + 3000,
      clicks: Math.floor(Math.random() * 600) + 80,
      costMicros: Math.floor(Math.random() * 500_000_000) + 50_000_000,
      ctr: parseFloat((Math.random() * 4 + 0.5).toFixed(4)),
      conversions: Math.floor(Math.random() * 50) + 5,
    };
  }
}

module.exports = GoogleAdsService;
