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
  performStockAdjustment
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

module.exports = router;
