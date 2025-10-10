const express = require('express');
const { auth, checkPermission } = require('../middleware/auth');
const {
  getSalesOutlets,
  getSalesOutletById,
  createSalesOutlet,
  updateSalesOutlet,
  deleteSalesOutlet,
  getActiveOutlets,
  getOutletStats
} = require('../controllers/salesOutletController');

const router = express.Router();

// Active outlets list (for selection) - accessible to all authenticated users for POS
router.get('/active/list', auth, getActiveOutlets);

// CRUD operations - restricted to admin and manager only
router.get('/', auth, getSalesOutlets);
router.get('/:id', auth, getSalesOutletById);
router.post('/', auth, checkPermission('settings', 'create'), createSalesOutlet);
router.put('/:id', auth, checkPermission('settings', 'update'), updateSalesOutlet);
router.delete('/:id', auth, checkPermission('settings', 'delete'), deleteSalesOutlet);

// Stats
router.get('/:id/stats', auth, getOutletStats);

module.exports = router;

