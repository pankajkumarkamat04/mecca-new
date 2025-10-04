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
  getCustomerStats,
  getTopCustomers,
  getCustomerByPhone
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

// @route   GET /api/customers/by-phone/:phone
// @desc    Find customer by phone number (for POS)
// @access  Private
router.get('/by-phone/:phone', auth, getCustomerByPhone);

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



module.exports = router;
