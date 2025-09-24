const express = require('express');
const { auth } = require('../middleware/auth');
const { validateDateRange } = require('../middleware/validation');
const {
  getSalesReport,
  // getPurchaseReport,
  // getProfitLossReport,
  // getBalanceSheetReport,
  getInventoryReport,
  // getProjectReport,
  getDashboardStats
} = require('../controllers/reportController');

const router = express.Router();

// @route   GET /api/reports/dashboard
// @desc    Get dashboard statistics
// @access  Private
router.get('/dashboard', auth, getDashboardStats);

// @route   GET /api/reports/sales
// @desc    Get sales report
// @access  Private
router.get('/sales', auth, validateDateRange(), getSalesReport);

// @route   GET /api/reports/purchases
// @desc    Get purchase report
// @access  Private
// router.get('/purchases', auth, validateDateRange(), getPurchaseReport);

// @route   GET /api/reports/profit-loss
// @desc    Get profit and loss report
// @access  Private
// router.get('/profit-loss', auth, validateDateRange(), getProfitLossReport);

// @route   GET /api/reports/balance-sheet
// @desc    Get balance sheet report
// @access  Private
// router.get('/balance-sheet', auth, getBalanceSheetReport);

// @route   GET /api/reports/inventory
// @desc    Get inventory report
// @access  Private
router.get('/inventory', auth, getInventoryReport);

// @route   GET /api/reports/projects
// @desc    Get project report
// @access  Private
// router.get('/projects', auth, getProjectReport);

module.exports = router;
