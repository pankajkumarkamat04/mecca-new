const express = require('express');
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const { createCustomerValidation, updateCustomerValidation } = require('../validations/customerValidation');
const {
  getCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addWalletTransaction,
  getWalletTransactions,
  getCustomerStats,
  getTopCustomers
} = require('../controllers/customerController');

const router = express.Router();

// @route   GET /api/customers
// @desc    Get all customers
// @access  Private
router.get('/', auth, validatePagination(), getCustomers);

// @route   GET /api/customers/top
// @desc    Get top customers
// @access  Private
router.get('/top', auth, getTopCustomers);

// @route   POST /api/customers
// @desc    Create new customer
// @access  Private
router.post('/', auth, validate(createCustomerValidation), createCustomer);

// @route   GET /api/customers/:id
// @desc    Get customer by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getCustomerById);

// @route   PUT /api/customers/:id
// @desc    Update customer
// @access  Private
router.put('/:id', auth, validateObjectId(), validate(updateCustomerValidation), updateCustomer);

// @route   DELETE /api/customers/:id
// @desc    Delete customer
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteCustomer);

// @route   GET /api/customers/:id/stats
// @desc    Get customer statistics
// @access  Private
router.get('/:id/stats', auth, validateObjectId(), getCustomerStats);

// @route   POST /api/customers/:id/wallet
// @desc    Add wallet transaction
// @access  Private
router.post('/:id/wallet', auth, validateObjectId(), addWalletTransaction);

// @route   GET /api/customers/:id/wallet/transactions
// @desc    Get wallet transactions
// @access  Private
router.get('/:id/wallet/transactions', auth, validateObjectId(), validatePagination(), getWalletTransactions);


module.exports = router;
