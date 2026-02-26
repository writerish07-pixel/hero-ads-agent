// services/adService.js
const MetaAdsAPI = require('../utils/metaAdsAPI');
const Ad = require('../models/adModel');

const createAd = async (adData) => {
    const ad = new Ad(adData);
    await ad.save();
    await MetaAdsAPI.createAd(adData);
    return ad;
};

const getAllAds = async () => {
    return await Ad.find();
};

const updateAd = async (id, adData) => {
    return await Ad.findByIdAndUpdate(id, adData, { new: true });
};

const deleteAd = async (id) => {
    await Ad.findByIdAndRemove(id);
};

module.exports = { createAd, getAllAds, updateAd, deleteAd };