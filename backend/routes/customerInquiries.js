const express = require('express');
const router = express.Router();
const {
  getCustomerInquiries,
  getCustomerInquiryById,
  createCustomerInquiry,
  updateCustomerInquiry,
  updateCustomerInquiryStatus,
  assignCustomerInquiry,
  convertInquiryToQuotation,
  convertInquiryToOrder,
  getCustomerInquiryStats
} = require('../controllers/customerInquiryController');
const {
  createCustomerInquiryValidation,
  updateCustomerInquiryValidation,
  updateCustomerInquiryStatusValidation,
  assignCustomerInquiryValidation,
  getCustomerInquiriesValidation,
  customerInquiryIdValidation
} = require('../validations/customerInquiryValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// @route   GET /api/customer-inquiries/stats
// @desc    Get customer inquiry statistics
// @access  Private
router.get('/stats', auth.auth, getCustomerInquiryStats);

// @route   GET /api/customer-inquiries
// @desc    Get all customer inquiries
// @access  Private
router.get('/', auth.auth, ...validate(getCustomerInquiriesValidation), getCustomerInquiries);

// @route   GET /api/customer-inquiries/:id
// @desc    Get customer inquiry by ID
// @access  Private
router.get('/:id', auth.auth, ...validate(customerInquiryIdValidation), getCustomerInquiryById);

// @route   POST /api/customer-inquiries
// @desc    Create new customer inquiry
// @access  Private
router.post('/', auth.auth, ...validate(createCustomerInquiryValidation), createCustomerInquiry);

// @route   PUT /api/customer-inquiries/:id
// @desc    Update customer inquiry
// @access  Private
router.put('/:id', auth.auth, ...validate(updateCustomerInquiryValidation), updateCustomerInquiry);

// @route   PUT /api/customer-inquiries/:id/status
// @desc    Update customer inquiry status
// @access  Private
router.put('/:id/status', auth.auth, ...validate(updateCustomerInquiryStatusValidation), updateCustomerInquiryStatus);

// @route   PUT /api/customer-inquiries/:id/assign
// @desc    Assign customer inquiry to user
// @access  Private
router.put('/:id/assign', auth.auth, ...validate(assignCustomerInquiryValidation), assignCustomerInquiry);

// @route   POST /api/customer-inquiries/:id/convert-to-quotation
// @desc    Convert customer inquiry to quotation
// @access  Private
router.post('/:id/convert-to-quotation', auth.auth, ...validate(customerInquiryIdValidation), convertInquiryToQuotation);

// @route   POST /api/customer-inquiries/:id/convert-to-order
// @desc    Convert customer inquiry to order
// @access  Private
router.post('/:id/convert-to-order', auth.auth, ...validate(customerInquiryIdValidation), convertInquiryToOrder);

module.exports = router;
