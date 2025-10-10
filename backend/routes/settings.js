const express = require('express');
const { auth, checkPermission } = require('../middleware/auth');
const { 
  getSettings, 
  getPublicSettings, 
  updateSettings, 
  uploadLogo, 
  deleteLogo, 
  refreshExchangeRates,
  getSingleExchangeRate,
  upload 
} = require('../controllers/settingController');

const router = express.Router();

// Public settings route (no auth required)
router.get('/public', getPublicSettings);

// Public exchange rate lookup (no auth required)
router.get('/exchange-rates/:currency', getSingleExchangeRate);

// Settings routes (auth required)
router.get('/', auth, getSettings);
router.put('/', auth, checkPermission('settings', 'update'), updateSettings);
router.post('/logo', auth, checkPermission('settings', 'update'), upload, uploadLogo);
router.delete('/logo', auth, checkPermission('settings', 'update'), deleteLogo);

// Exchange rates management (auth required)
router.post('/exchange-rates/refresh', auth, checkPermission('settings', 'update'), refreshExchangeRates);

module.exports = router;


