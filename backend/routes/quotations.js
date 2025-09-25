const express = require('express');
const router = express.Router();
const {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  markQuotationAsViewed,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToOrder,
  convertQuotationToInvoice,
  getQuotationStats
} = require('../controllers/quotationController');
const {
  createQuotationValidation,
  updateQuotationValidation,
  getQuotationsValidation,
  quotationIdValidation
} = require('../validations/quotationValidation');
const { validate } = require('../middleware/validation');
const auth = require('../middleware/auth');

// Public routes (for customer actions)
router.post('/:id/view', ...validate(quotationIdValidation), markQuotationAsViewed);
router.post('/:id/accept', ...validate(quotationIdValidation), acceptQuotation);
router.post('/:id/reject', ...validate(quotationIdValidation), rejectQuotation);

// Protected routes
router.get('/', auth.auth, ...validate(getQuotationsValidation), getQuotations);
router.get('/stats', auth.auth, getQuotationStats);
router.get('/:id', auth.auth, ...validate(quotationIdValidation), getQuotationById);
router.post('/', auth.auth, ...validate(createQuotationValidation), createQuotation);
router.put('/:id', auth.auth, ...validate(updateQuotationValidation), updateQuotation);
router.delete('/:id', auth.auth, ...validate(quotationIdValidation), deleteQuotation);
router.post('/:id/send', auth.auth, ...validate(quotationIdValidation), sendQuotation);
router.post('/:id/convert-to-order', auth.auth, ...validate(quotationIdValidation), convertQuotationToOrder);
router.post('/:id/convert', auth.auth, ...validate(quotationIdValidation), convertQuotationToInvoice);

module.exports = router;
