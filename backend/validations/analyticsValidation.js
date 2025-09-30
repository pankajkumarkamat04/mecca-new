const { body, query, param, validationResult } = require('express-validator');

// Validation middleware
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  next();
};

// Date range validation
const validateDateRange = [
  query('dateRange')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Date range must be one of: 7d, 30d, 90d, 1y'),
  handleValidationErrors
];

// Group by validation
const validateGroupBy = [
  query('groupBy')
    .optional()
    .isIn(['day', 'week', 'month', 'year', 'paymentMethod'])
    .withMessage('Group by must be one of: day, week, month, year, paymentMethod'),
  handleValidationErrors
];

// Shop validation
const validateShop = [
  query('shop')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Shop must be a non-empty string'),
  handleValidationErrors
];

// Salesperson validation
const validateSalesperson = [
  query('salesperson')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Salesperson must be a non-empty string'),
  handleValidationErrors
];

// Category validation
const validateCategory = [
  query('category')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Category must be a non-empty string'),
  handleValidationErrors
];

// Technician validation
const validateTechnician = [
  query('technician')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Technician must be a non-empty string'),
  handleValidationErrors
];

// Job type validation
const validateJobType = [
  query('jobType')
    .optional()
    .isIn(['repair', 'installation', 'maintenance', 'diagnostic', 'all'])
    .withMessage('Job type must be one of: repair, installation, maintenance, diagnostic, all'),
  handleValidationErrors
];

// Limit validation
const validateLimit = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be an integer between 1 and 100'),
  handleValidationErrors
];

// Export type validation
const validateExportType = [
  param('type')
    .isIn(['sales', 'inventory', 'workshop', 'overview'])
    .withMessage('Export type must be one of: sales, inventory, workshop, overview'),
  param('format')
    .isIn(['csv', 'xlsx', 'pdf'])
    .withMessage('Export format must be one of: csv, xlsx, pdf'),
  handleValidationErrors
];

// Overview metrics validation
const validateOverviewMetrics = [
  ...validateDateRange,
  handleValidationErrors
];

// Sales performance validation
const validateSalesPerformance = [
  ...validateDateRange,
  ...validateGroupBy,
  ...validateShop,
  ...validateSalesperson,
  handleValidationErrors
];

// Sales by shop validation
const validateSalesByShop = [
  ...validateDateRange,
  handleValidationErrors
];

// Sales by salesperson validation
const validateSalesBySalesperson = [
  ...validateDateRange,
  ...validateShop,
  ...validateSalesperson,
  handleValidationErrors
];

// Product performance validation
const validateProductPerformance = [
  ...validateDateRange,
  query('groupBy')
    .optional()
    .isIn(['product', 'category'])
    .withMessage('Group by must be one of: product, category'),
  ...validateLimit,
  handleValidationErrors
];

// Customer behavior validation
const validateCustomerBehavior = [
  ...validateDateRange,
  handleValidationErrors
];

// Inventory analysis validation
const validateInventoryAnalysis = [
  ...validateDateRange,
  ...validateCategory,
  handleValidationErrors
];

// Stock levels validation
const validateStockLevels = [
  ...validateDateRange,
  ...validateCategory,
  handleValidationErrors
];

// Slow moving items validation
const validateSlowMovingItems = [
  ...validateDateRange,
  handleValidationErrors
];

// Stock movement validation
const validateStockMovement = [
  ...validateDateRange,
  handleValidationErrors
];

// Turnover rates validation
const validateTurnoverRates = [
  ...validateDateRange,
  handleValidationErrors
];

// Lead time analysis validation
const validateLeadTimeAnalysis = [
  ...validateDateRange,
  handleValidationErrors
];

// Workshop performance validation
const validateWorkshopPerformance = [
  ...validateDateRange,
  query('groupBy')
    .optional()
    .isIn(['month', 'jobType'])
    .withMessage('Group by must be one of: month, jobType'),
  ...validateTechnician,
  ...validateJobType,
  handleValidationErrors
];

// Job completion validation
const validateJobCompletion = [
  ...validateDateRange,
  ...validateTechnician,
  ...validateJobType,
  handleValidationErrors
];

// Technician performance validation
const validateTechnicianPerformance = [
  ...validateDateRange,
  handleValidationErrors
];

// Resource utilization validation
const validateResourceUtilization = [
  ...validateDateRange,
  handleValidationErrors
];

// Customer satisfaction validation
const validateCustomerSatisfaction = [
  ...validateDateRange,
  handleValidationErrors
];

// Export analytics validation
const validateExportAnalytics = [
  ...validateExportType,
  ...validateDateRange,
  handleValidationErrors
];

module.exports = {
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
};
