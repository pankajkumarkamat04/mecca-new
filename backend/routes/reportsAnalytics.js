const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const {
  getOrderAnalytics,
  getPOSSalesAnalytics,
  getWorkshopAnalytics,
  getInventoryAnalytics,
  getDashboardSummary,
  getSalesTrendsChart,
  getTopProductsChart,
  getRevenueAnalyticsChart,
  getWorkshopAnalyticsChart,
  getSalesByCurrency,
  getSalesBySalesPerson,
  getSalesSummaryBySalesPerson,
  getSalespersonDashboard,
  getSalesReport
} = require('../controllers/reportsAnalyticsController');

const router = express.Router();

// All routes require authentication
router.use(auth);

// @route   GET /api/reports-analytics/dashboard
// @desc    Get dashboard summary with key metrics
// @access  Private (Admin, Manager, Sales Person, Warehouse Manager, Workshop Employee)
router.get('/dashboard', getDashboardSummary);

// @route   GET /api/reports-analytics/salesperson-dashboard
// @desc    Get salesperson-specific dashboard data
// @access  Private (Sales Person)
router.get('/salesperson-dashboard', authorize('sales_person'), getSalespersonDashboard);

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

// Chart endpoints
// @route   GET /api/reports-analytics/charts/sales-trends
// @desc    Get sales trends chart data
// @access  Private (Admin, Manager, Sales Person)
router.get('/charts/sales-trends', authorize('admin', 'manager', 'sales_person'), getSalesTrendsChart);

// @route   GET /api/reports-analytics/charts/top-products
// @desc    Get top products chart data
// @access  Private (Admin, Manager, Sales Person)
router.get('/charts/top-products', authorize('admin', 'manager', 'sales_person'), getTopProductsChart);

// @route   GET /api/reports-analytics/charts/revenue-analytics
// @desc    Get revenue analytics chart data
// @access  Private (Admin, Manager, Sales Person)
router.get('/charts/revenue-analytics', authorize('admin', 'manager', 'sales_person'), getRevenueAnalyticsChart);

// @route   GET /api/reports-analytics/charts/workshop-analytics
// @desc    Get workshop analytics chart data
// @access  Private (Admin, Manager, Workshop Employee)
router.get('/charts/workshop-analytics', authorize('admin', 'manager', 'workshop_employee'), getWorkshopAnalyticsChart);

// @route   GET /api/reports-analytics/sales-by-currency
// @desc    Get products sold and revenue by currency (USD vs ZWL)
// @access  Private (Admin, Manager, Sales Person)
router.get('/sales-by-currency', authorize('admin', 'manager', 'sales_person'), getSalesByCurrency);

// @route   GET /api/reports-analytics/sales-by-salesperson
// @desc    Get sales transactions by sales person
// @access  Private (Admin, Manager, Sales Person)
router.get('/sales-by-salesperson', authorize('admin', 'manager', 'sales_person'), getSalesBySalesPerson);

// @route   GET /api/reports-analytics/sales-summary-by-salesperson
// @desc    Get sales summary by sales person
// @access  Private (Admin, Manager, Sales Person)
router.get('/sales-summary-by-salesperson', authorize('admin', 'manager', 'sales_person'), getSalesSummaryBySalesPerson);

// @route   GET /api/reports-analytics/sales-report
// @desc    Get detailed sales report with transaction types
// @access  Private (Admin, Manager, Sales Person)
router.get('/sales-report', authorize('admin', 'manager', 'sales_person'), getSalesReport);

module.exports = router;
