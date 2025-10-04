const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const {
  getOrderAnalytics,
  getPOSSalesAnalytics,
  getWorkshopAnalytics,
  getInventoryAnalytics,
  getDashboardSummary
} = require('../controllers/reportsAnalyticsController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/reports-analytics/dashboard
// @desc    Get dashboard summary with key metrics
// @access  Private (Admin, Manager, Sales Person, Warehouse Manager, Workshop Employee)
router.get('/dashboard', getDashboardSummary);

// @route   GET /api/reports-analytics/orders
// @desc    Get order analytics with trends and insights
// @access  Private (Admin, Manager, Sales Person)
router.get('/orders', authorize('admin', 'manager', 'sales_person'), getOrderAnalytics);

// @route   GET /api/reports-analytics/pos-sales
// @desc    Get POS sales analytics with payment methods and trends
// @access  Private (Admin, Manager, Sales Person)
router.get('/pos-sales', authorize('admin', 'manager', 'sales_person'), getPOSSalesAnalytics);

// @route   GET /api/reports-analytics/workshop
// @desc    Get workshop analytics with job types and technician performance
// @access  Private (Admin, Manager, Workshop Employee)
router.get('/workshop', authorize('admin', 'manager', 'workshop_employee'), getWorkshopAnalytics);

// @route   GET /api/reports-analytics/inventory
// @desc    Get inventory analytics with stock levels and movements
// @access  Private (Admin, Manager, Warehouse Manager, Warehouse Employee)
router.get('/inventory', authorize('admin', 'manager', 'warehouse_manager', 'warehouse_employee'), getInventoryAnalytics);

module.exports = router;
