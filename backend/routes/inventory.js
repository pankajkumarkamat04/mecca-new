const express = require('express');
const { auth, checkPermission } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');
const {
  getStockMovements,
  createStockMovement,
  getInventoryLevels,
  getInventoryStats,
  getProductMovements,
  getProductStock,
  performStockAdjustment,
  performReplenishmentCheck,
  performStockTaking,
  processReceiving,
  processPicking,
  getWarehouseDashboard
} = require('../controllers/inventoryController');

const router = express.Router();

// @route   GET /api/inventory/movements
// @desc    Get stock movements
// @access  Private
router.get('/movements', auth, validatePagination(), validateDateRange(), getStockMovements);

// @route   GET /api/inventory/levels
// @desc    Get current inventory levels
// @access  Private
router.get('/levels', auth, getInventoryLevels);

// @route   GET /api/inventory/stats
// @desc    Get inventory statistics
// @access  Private
router.get('/stats', auth, getInventoryStats);

// @route   POST /api/inventory/movements
// @desc    Create stock movement
// @access  Private
router.post('/movements', auth, checkPermission('inventory', 'create'), createStockMovement);

// @route   POST /api/inventory/adjustment
// @desc    Perform stock adjustment
// @access  Private
router.post('/adjustment', auth, checkPermission('inventory', 'update'), performStockAdjustment);

// @route   GET /api/inventory/products/:productId/movements
// @desc    Get stock movements for a specific product
// @access  Private
router.get('/products/:productId/movements', auth, validateObjectId('productId'), validateDateRange(), getProductMovements);

// @route   GET /api/inventory/products/:productId/stock
// @desc    Get current stock for a product
// @access  Private
router.get('/products/:productId/stock', auth, validateObjectId('productId'), getProductStock);

// @route   GET /api/inventory/warehouse-dashboard
// @desc    Get warehouse operations dashboard
// @access  Private
router.get('/warehouse-dashboard', auth, getWarehouseDashboard);

// @route   POST /api/inventory/replenishment-check
// @desc    Perform stock replenishment check
// @access  Private
router.post('/replenishment-check', auth, checkPermission('inventory', 'update'), performReplenishmentCheck);

// @route   POST /api/inventory/stock-taking
// @desc    Perform stock taking/cycle count
// @access  Private
router.post('/stock-taking', auth, checkPermission('inventory', 'update'), performStockTaking);

// @route   POST /api/inventory/receiving
// @desc    Process receiving goods
// @access  Private
router.post('/receiving', auth, checkPermission('inventory', 'create'), processReceiving);

// @route   POST /api/inventory/picking
// @desc    Process picking for orders
// @access  Private
router.post('/picking', auth, checkPermission('inventory', 'update'), processPicking);

module.exports = router;
