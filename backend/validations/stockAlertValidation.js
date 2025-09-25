const { body, param, query } = require('express-validator');

// Validation for getting stock alerts
const getStockAlertsValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('alertType').optional().isIn(['low_stock', 'out_of_stock', 'overstock', 'expiring_soon', 'expired', 'reorder_point']).withMessage('Invalid alert type'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('isResolved').optional().isBoolean().withMessage('isResolved must be a boolean'),
  query('isRead').optional().isBoolean().withMessage('isRead must be a boolean'),
  query('warehouse').optional().isMongoId().withMessage('Valid warehouse ID is required'),
  query('supplier').optional().isMongoId().withMessage('Valid supplier ID is required')
];

// Validation for stock alert ID parameter
const stockAlertIdValidation = [
  param('id').isMongoId().withMessage('Valid stock alert ID is required')
];

// Validation for creating stock alert
const createStockAlertValidation = [
  body('product')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  
  body('alertType')
    .notEmpty()
    .withMessage('Alert type is required')
    .isIn(['low_stock', 'out_of_stock', 'overstock', 'expiring_soon', 'expired', 'reorder_point'])
    .withMessage('Invalid alert type'),
  
  body('severity')
    .notEmpty()
    .withMessage('Severity is required')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity'),
  
  body('currentStock')
    .notEmpty()
    .withMessage('Current stock is required')
    .isNumeric()
    .withMessage('Current stock must be a number')
    .isFloat({ min: 0 })
    .withMessage('Current stock cannot be negative'),
  
  body('threshold')
    .notEmpty()
    .withMessage('Threshold is required')
    .isNumeric()
    .withMessage('Threshold must be a number')
    .isFloat({ min: 0 })
    .withMessage('Threshold cannot be negative'),
  
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isString()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Message must be between 10 and 500 characters'),
  
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Valid warehouse ID is required'),
  
  body('supplier')
    .optional()
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tag cannot exceed 50 characters'),
  
  body('metadata')
    .optional()
    .isObject()
    .withMessage('Metadata must be an object')
];

// Validation for resolving alert
const resolveAlertValidation = [
  param('id').isMongoId().withMessage('Valid stock alert ID is required'),
  
  body('resolutionNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution notes cannot exceed 1000 characters')
];

// Validation for bulk resolve alerts
const bulkResolveValidation = [
  body('alertIds')
    .isArray({ min: 1 })
    .withMessage('At least one alert ID is required'),
  
  body('alertIds.*')
    .isMongoId()
    .withMessage('Valid alert ID is required'),
  
  body('resolutionNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Resolution notes cannot exceed 1000 characters')
];

module.exports = {
  getStockAlertsValidation,
  stockAlertIdValidation,
  createStockAlertValidation,
  resolveAlertValidation,
  bulkResolveValidation
};
