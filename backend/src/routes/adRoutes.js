// routes/adRoutes.js
const express = require('express');
const router = express.Router();
const adController = require('../controllers/adController');

// Create an Ad
router.post('/', adController.createAd);

// Get all Ads
router.get('/', adController.getAllAds);

// Update an Ad
router.put('/:id', adController.updateAd);

// Delete an Ad
router.delete('/:id', adController.deleteAd);

module.exports = router;