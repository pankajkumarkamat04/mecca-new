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
  performStockTaking,
  processReceiving,
  processPicking,
  getWarehouseDashboard,
  processGoodsReceiving,
  getReceivingNotes,
  getStockAlerts,
  getStockAlertStats,
  checkLowStock,
  getStockTakeSessions,
  getStockTakeSessionDetails
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

// @route   GET /api/inventory/receiving-notes
// @desc    Get receiving notes
// @access  Private
router.get('/receiving-notes', auth, getReceivingNotes);

// @route   POST /api/inventory/goods-receiving
// @desc    Process goods receiving with receiving note
// @access  Private
router.post('/goods-receiving', auth, checkPermission('inventory', 'create'), processGoodsReceiving);

// @route   GET /api/inventory/stock-alerts
// @desc    Get real-time stock alerts
// @access  Private
router.get('/stock-alerts', auth, getStockAlerts);

// @route   GET /api/inventory/stock-alert-stats
// @desc    Get stock alert statistics
// @access  Private
router.get('/stock-alert-stats', auth, getStockAlertStats);

// @route   POST /api/inventory/check-low-stock
// @desc    Check for low stock products
// @access  Private
router.post('/check-low-stock', auth, checkPermission('inventory', 'read'), checkLowStock);

// @route   GET /api/inventory/stock-taking/sessions
// @desc    Get past stock take sessions
// @access  Private
router.get('/stock-taking/sessions', auth, validatePagination(), validateDateRange(), getStockTakeSessions);

// @route   GET /api/inventory/stock-taking/sessions/details
// @desc    Get stock take session details
// @access  Private
router.get('/stock-taking/sessions/details', auth, getStockTakeSessionDetails);

module.exports = router;
