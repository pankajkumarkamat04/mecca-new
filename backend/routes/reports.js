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
  getDashboardStats,
  saveReport,
  getSavedReports,
  getSavedReportById,
  deleteSavedReport
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

// @route   POST /api/reports/save
// @desc    Save a report to database
// @access  Private
router.post('/save', auth, saveReport);

// @route   GET /api/reports/saved
// @desc    Get all saved reports
// @access  Private
router.get('/saved', auth, getSavedReports);

// @route   GET /api/reports/saved/:id
// @desc    Get a single saved report
// @access  Private
router.get('/saved/:id', auth, getSavedReportById);

// @route   DELETE /api/reports/saved/:id
// @desc    Delete a saved report
// @access  Private
router.delete('/saved/:id', auth, deleteSavedReport);

module.exports = router;
