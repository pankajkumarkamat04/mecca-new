const express = require('express');
const router = express.Router();
const {
  getStockAlerts,
  getUnresolvedAlerts,
  getStockAlertById,
  markAlertAsRead,
  resolveAlert,
  createStockAlert,
  getStockAlertStats,
  bulkResolveAlerts,
  checkLowStock,
  getReplenishmentSuggestions,
  createPurchaseOrdersFromSuggestions,
  updateInventoryLevels
} = require('../controllers/stockAlertController');
const {
  createStockAlertValidation,
  stockAlertIdValidation,
  resolveAlertValidation,
  bulkResolveValidation,
  getStockAlertsValidation
} = require('../validations/stockAlertValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Protected routes
router.get('/', auth.auth, ...validate(getStockAlertsValidation), getStockAlerts);
router.get('/unresolved', auth.auth, getUnresolvedAlerts);
router.get('/stats', auth.auth, getStockAlertStats);
router.get('/:id', auth.auth, ...validate(stockAlertIdValidation), getStockAlertById);
router.post('/', auth.auth, ...validate(createStockAlertValidation), createStockAlert);
router.put('/:id/read', auth.auth, ...validate(stockAlertIdValidation), markAlertAsRead);
router.put('/:id/resolve', auth.auth, ...validate(resolveAlertValidation), resolveAlert);
router.put('/bulk-resolve', auth.auth, ...validate(bulkResolveValidation), bulkResolveAlerts);
router.post('/check-low-stock', auth.auth, checkLowStock);
router.get('/replenishment-suggestions', auth.auth, getReplenishmentSuggestions);
router.post('/create-purchase-orders', auth.auth, createPurchaseOrdersFromSuggestions);
router.post('/update-inventory-levels', auth.auth, updateInventoryLevels);

module.exports = router;
