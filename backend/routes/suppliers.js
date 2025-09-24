const express = require('express');
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination } = require('../middleware/validation');
const {
  getSuppliers,
  getSupplierById,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  getSupplierStats,
  getTopSuppliers,
  updateSupplierRating
} = require('../controllers/supplierController');
const {
  createSupplierValidation,
  updateSupplierValidation,
  updateRatingValidation,
  getSupplierByIdValidation
} = require('../validations/supplierValidation');

const router = express.Router();

// @route   GET /api/suppliers
// @desc    Get all suppliers
// @access  Private
router.get('/', auth, validatePagination(), getSuppliers);

// @route   GET /api/suppliers/top
// @desc    Get top suppliers
// @access  Private
router.get('/top', auth, getTopSuppliers);

// @route   POST /api/suppliers
// @desc    Create new supplier
// @access  Private
router.post('/', auth, validate(createSupplierValidation), createSupplier);

// @route   GET /api/suppliers/:id
// @desc    Get supplier by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getSupplierById);

// @route   PUT /api/suppliers/:id
// @desc    Update supplier
// @access  Private
router.put('/:id', auth, validateObjectId(), validate(updateSupplierValidation), updateSupplier);

// @route   DELETE /api/suppliers/:id
// @desc    Delete supplier
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteSupplier);

// @route   GET /api/suppliers/:id/stats
// @desc    Get supplier statistics
// @access  Private
router.get('/:id/stats', auth, validateObjectId(), getSupplierStats);

// @route   PUT /api/suppliers/:id/rating
// @desc    Update supplier rating
// @access  Private
router.put('/:id/rating', auth, validateObjectId(), validate(updateRatingValidation), updateSupplierRating);

module.exports = router;
