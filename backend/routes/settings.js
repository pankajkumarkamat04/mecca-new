const express = require('express');
const { auth, checkPermission } = require('../middleware/auth');
const { getSettings, getPublicSettings, updateSettings, uploadLogo, deleteLogo, upload } = require('../controllers/settingController');

const router = express.Router();

// Public settings route (no auth required)
router.get('/public', getPublicSettings);

// Settings routes (auth required)
router.get('/', auth, getSettings);
router.put('/', auth, checkPermission('settings', 'update'), updateSettings);
router.post('/logo', auth, checkPermission('settings', 'update'), upload, uploadLogo);
router.delete('/logo', auth, checkPermission('settings', 'update'), deleteLogo);

module.exports = router;


