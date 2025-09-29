const express = require('express');
const router = express.Router();
const {
  getOverviewMetrics,
  getSalesPerformance,
  getSalesByShop,
  getSalesBySalesperson,
  getProductPerformance,
  getCustomerBehavior,
  getInventoryAnalysis,
  getStockLevels,
  getSlowMovingItems,
  getStockMovement,
  getTurnoverRates,
  getLeadTimeAnalysis,
  getWorkshopPerformance,
  getJobCompletion,
  getTechnicianPerformance,
  getResourceUtilization,
  getCustomerSatisfaction,
  exportAnalytics
} = require('../controllers/analyticsController');
const { auth } = require('../middleware/auth');
const {
  validateOverviewMetrics,
  validateSalesPerformance,
  validateSalesByShop,
  validateSalesBySalesperson,
  validateProductPerformance,
  validateCustomerBehavior,
  validateInventoryAnalysis,
  validateStockLevels,
  validateSlowMovingItems,
  validateStockMovement,
  validateTurnoverRates,
  validateLeadTimeAnalysis,
  validateWorkshopPerformance,
  validateJobCompletion,
  validateTechnicianPerformance,
  validateResourceUtilization,
  validateCustomerSatisfaction,
  validateExportAnalytics
} = require('../validations/analyticsValidation');

// Apply authentication middleware to all routes
router.use(auth);

// Overview Analytics
router.get('/overview', validateOverviewMetrics, getOverviewMetrics);

// Sales Performance Analytics
router.get('/sales-performance', validateSalesPerformance, getSalesPerformance);
router.get('/sales-by-shop', validateSalesByShop, getSalesByShop);
router.get('/sales-by-salesperson', validateSalesBySalesperson, getSalesBySalesperson);
router.get('/product-performance', validateProductPerformance, getProductPerformance);
router.get('/customer-behavior', validateCustomerBehavior, getCustomerBehavior);

// Inventory Analysis
router.get('/inventory-analysis', validateInventoryAnalysis, getInventoryAnalysis);
router.get('/stock-levels', validateStockLevels, getStockLevels);
router.get('/slow-moving-items', validateSlowMovingItems, getSlowMovingItems);
router.get('/stock-movement', validateStockMovement, getStockMovement);
router.get('/turnover-rates', validateTurnoverRates, getTurnoverRates);
router.get('/lead-time-analysis', validateLeadTimeAnalysis, getLeadTimeAnalysis);

// Workshop Performance
router.get('/workshop-performance', validateWorkshopPerformance, getWorkshopPerformance);
router.get('/job-completion', validateJobCompletion, getJobCompletion);
router.get('/technician-performance', validateTechnicianPerformance, getTechnicianPerformance);
router.get('/resource-utilization', validateResourceUtilization, getResourceUtilization);
router.get('/customer-satisfaction', validateCustomerSatisfaction, getCustomerSatisfaction);

// Export Analytics
router.get('/export/:type/:format', validateExportAnalytics, exportAnalytics);

module.exports = router;
