const express = require('express');
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  getLowStockProducts,
  getProductStats
} = require('../controllers/productController');

const router = express.Router();

// @route   GET /api/products
// @desc    Get all products
// @access  Private
router.get('/', auth, validatePagination(), getProducts);

// @route   GET /api/products/low-stock
// @desc    Get low stock products
// @access  Private
router.get('/low-stock', auth, getLowStockProducts);

// @route   GET /api/products/stats
// @desc    Get product statistics
// @access  Private
router.get('/stats', auth, getProductStats);

// @route   POST /api/products
// @desc    Create new product
// @access  Private
router.post('/', auth, createProduct);

// @route   GET /api/products/:id
// @desc    Get product by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getProductById);

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private
router.put('/:id', auth, validateObjectId(), updateProduct);

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteProduct);

// @route   PUT /api/products/:id/stock
// @desc    Update product stock
// @access  Private
router.put('/:id/stock', auth, validateObjectId(), updateProductStock);

module.exports = router;
