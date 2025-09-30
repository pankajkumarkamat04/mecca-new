const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getInsightsOverview,
  getInsightsSales,
  getInsightsInventory,
  getInsightsWorkshop
} = require('../controllers/insightsController');

const router = express.Router();

// Unified insights endpoints
router.get('/overview', auth, getInsightsOverview);
router.get('/sales', auth, getInsightsSales);
router.get('/inventory', auth, getInsightsInventory);
router.get('/workshop', auth, getInsightsWorkshop);

module.exports = router;


