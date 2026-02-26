// controllers/adController.js
const AdService = require('../services/adService');

const createAd = async (req, res) => {
    try {
        const newAd = await AdService.createAd(req.body);
        res.status(201).json(newAd);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllAds = async (req, res) => {
    try {
        const ads = await AdService.getAllAds();
        res.status(200).json(ads);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateAd = async (req, res) => {
    try {
        const updatedAd = await AdService.updateAd(req.params.id, req.body);
        res.status(200).json(updatedAd);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteAd = async (req, res) => {
    try {
        await AdService.deleteAd(req.params.id);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = { createAd, getAllAds, updateAd, deleteAd };