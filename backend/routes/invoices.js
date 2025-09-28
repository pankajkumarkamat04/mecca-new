const express = require('express');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const {
  createInvoiceValidation,
  updateInvoiceValidation,
  getInvoicesValidation,
  getInvoiceValidation,
  deleteInvoiceValidation
} = require('../validations/invoiceValidation');
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  generateQRCode,
  getInvoiceStats
} = require('../controllers/invoiceController');

const router = express.Router();

// @route   GET /api/invoices
// @desc    Get all invoices
// @access  Private
router.get('/', auth, validate(getInvoicesValidation), getInvoices);

// @route   GET /api/invoices/stats
// @desc    Get invoice statistics
// @access  Private
router.get('/stats', auth, getInvoiceStats);

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', auth, validate(createInvoiceValidation), createInvoice);

// @route   GET /api/invoices/:id
// @desc    Get invoice by ID
// @access  Private
router.get('/:id', auth, validate(getInvoiceValidation), getInvoiceById);

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', auth, validate(updateInvoiceValidation), updateInvoice);

// @route   DELETE /api/invoices/:id
// @desc    Delete invoice
// @access  Private
router.delete('/:id', auth, validate(deleteInvoiceValidation), deleteInvoice);

// @route   POST /api/invoices/:id/payments
// @desc    Add payment to invoice
// @access  Private
router.post('/:id/payments', auth, addPayment);

// @route   GET /api/invoices/:id/qr
// @desc    Generate QR code for invoice
// @access  Private
router.get('/:id/qr', auth, generateQRCode);

module.exports = router;
