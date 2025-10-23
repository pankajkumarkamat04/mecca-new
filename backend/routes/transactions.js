const express = require('express');
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');
const {
  createTransactionValidation,
  updateTransactionValidation,
  getTransactionsValidation,
  getTransactionStatsValidation
} = require('../validations/transactionValidation');
const {
  getTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  approveTransaction,
  postTransaction,
  getTransactionStats,
  getSalespersonPerformance
} = require('../controllers/transactionController');

const router = express.Router();

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private
router.get('/', auth, validatePagination(), validate(getTransactionsValidation), getTransactions);

// @route   GET /api/transactions/stats
// @desc    Get transaction statistics
// @access  Private
router.get('/stats', auth, validate(getTransactionStatsValidation), getTransactionStats);

// @route   GET /api/transactions/salesperson-performance
// @desc    Get salesperson performance analytics
// @access  Private
router.get('/salesperson-performance', auth, getSalespersonPerformance);

// @route   POST /api/transactions
// @desc    Create new transaction
// @access  Private
router.post('/', auth, validate(createTransactionValidation), createTransaction);

// @route   GET /api/transactions/:id
// @desc    Get transaction by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getTransactionById);

// @route   PUT /api/transactions/:id
// @desc    Update transaction
// @access  Private
router.put('/:id', auth, validateObjectId(), validate(updateTransactionValidation), updateTransaction);

// @route   DELETE /api/transactions/:id
// @desc    Delete transaction
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteTransaction);

// @route   PUT /api/transactions/:id/approve
// @desc    Approve transaction
// @access  Private
router.put('/:id/approve', auth, validateObjectId(), approveTransaction);

// @route   PUT /api/transactions/:id/post
// @desc    Post transaction
// @access  Private
router.put('/:id/post', auth, validateObjectId(), postTransaction);


module.exports = router;
