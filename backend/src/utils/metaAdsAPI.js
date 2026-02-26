// utils/metaAdsAPI.js
const MetaAdsConfig = require('../config/metaAdsConfig');
const axios = require('axios');

const createAd = async (adData) => {
    try {
        const response = await axios.post(`https://graph.facebook.com/${MetaAdsConfig.apiVersion}/act_<AD_ACCOUNT_ID>/ads`, adData, { 
            headers: {
                'Authorization': `Bearer ${MetaAdsConfig.accessToken}`
            }
        });
        return response.data;
    } catch (error) {
        throw new Error('Error creating ad: ' + error.message);
    }
};

module.exports = { createAd };