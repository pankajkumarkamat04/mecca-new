const express = require('express');
const { auth } = require('../middleware/auth');
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  addPayment,
  generateQRCode,
  getInvoiceStats
} = require('../controllers/invoiceController');

const router = express.Router();

// @route   GET /api/invoices
// @desc    Get all invoices
// @access  Private
router.get('/', auth, getInvoices);

// @route   GET /api/invoices/stats
// @desc    Get invoice statistics
// @access  Private
router.get('/stats', auth, getInvoiceStats);

// @route   POST /api/invoices
// @desc    Create new invoice
// @access  Private
router.post('/', auth, createInvoice);

// @route   GET /api/invoices/:id
// @desc    Get invoice by ID
// @access  Private
router.get('/:id', auth, getInvoiceById);

// @route   PUT /api/invoices/:id
// @desc    Update invoice
// @access  Private
router.put('/:id', auth, updateInvoice);

// @route   POST /api/invoices/:id/payments
// @desc    Add payment to invoice
// @access  Private
router.post('/:id/payments', auth, addPayment);

// @route   GET /api/invoices/:id/qr
// @desc    Generate QR code for invoice
// @access  Private
router.get('/:id/qr', auth, generateQRCode);

module.exports = router;
