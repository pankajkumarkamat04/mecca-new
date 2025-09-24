const express = require('express');
const { auth } = require('../middleware/auth');
const { validate, validateObjectId, validatePagination, validateDateRange } = require('../middleware/validation');
const {
  createAccountValidation,
  updateAccountValidation,
  getAccountBalanceValidation,
  getAccountTransactionsValidation,
  getAccountsByTypeValidation
} = require('../validations/accountValidation');
const {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
  getChartOfAccounts,
  getAccountsByType,
  getAccountBalance,
  getAccountTransactions,
  getAccountStats
} = require('../controllers/accountController');

const router = express.Router();

// @route   GET /api/accounts
// @desc    Get all accounts
// @access  Private
router.get('/', auth, validatePagination(), getAccounts);

// @route   GET /api/accounts/chart
// @desc    Get chart of accounts
// @access  Private
router.get('/chart', auth, getChartOfAccounts);

// @route   GET /api/accounts/stats
// @desc    Get account statistics
// @access  Private
router.get('/stats', auth, getAccountStats);

// @route   GET /api/accounts/type/:type
// @desc    Get accounts by type
// @access  Private
router.get('/type/:type', auth, getAccountsByType);

// @route   POST /api/accounts
// @desc    Create new account
// @access  Private
router.post('/', auth, validate(createAccountValidation), createAccount);

// @route   GET /api/accounts/:id
// @desc    Get account by ID
// @access  Private
router.get('/:id', auth, validateObjectId(), getAccountById);

// @route   PUT /api/accounts/:id
// @desc    Update account
// @access  Private
router.put('/:id', auth, validateObjectId(), validate(updateAccountValidation), updateAccount);

// @route   DELETE /api/accounts/:id
// @desc    Delete account
// @access  Private
router.delete('/:id', auth, validateObjectId(), deleteAccount);

// @route   GET /api/accounts/:id/balance
// @desc    Get account balance
// @access  Private
router.get('/:id/balance', auth, validateObjectId(), validate(getAccountBalanceValidation), getAccountBalance);

// @route   GET /api/accounts/:id/transactions
// @desc    Get account transactions
// @access  Private
router.get('/:id/transactions', auth, validateObjectId(), validate(getAccountTransactionsValidation), getAccountTransactions);

module.exports = router;
