const { body, param } = require('express-validator');

// Create received goods validation
const createReceivedGoodsValidation = [
  body('purchaseOrderId')
    .isMongoId()
    .withMessage('Valid purchase order ID is required'),
  
  body('receivedItems')
    .isArray({ min: 1 })
    .withMessage('At least one received item is required'),
  
  body('receivedItems.*.itemId')
    .isMongoId()
    .withMessage('Valid item ID is required'),
  
  body('receivedItems.*.quantity')
    .isFloat({ min: 1 })
    .withMessage('Received quantity must be at least 1'),
  
  body('receivedItems.*.condition')
    .optional()
    .isIn(['excellent', 'good', 'fair', 'damaged', 'defective'])
    .withMessage('Invalid condition'),
  
  body('deliveryInfo.deliveryMethod')
    .optional()
    .isIn(['pickup', 'delivery', 'courier', 'freight'])
    .withMessage('Invalid delivery method'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Inspect received goods validation
const inspectReceivedGoodsValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid received goods ID'),
  
  body('inspectionResults.passed')
    .isBoolean()
    .withMessage('Inspection result must be boolean'),
  
  body('inspectionResults.failedItems')
    .optional()
    .isArray()
    .withMessage('Failed items must be an array'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Approve received goods validation
const approveReceivedGoodsValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid received goods ID'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Get received goods validation
const getReceivedGoodsValidation = [
  param('id')
    .optional()
    .isMongoId()
    .withMessage('Invalid received goods ID'),
  
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  body('status')
    .optional()
    .isIn(['pending', 'inspected', 'approved', 'rejected', 'partial_approval'])
    .withMessage('Invalid status'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
];

module.exports = {
  createReceivedGoodsValidation,
  inspectReceivedGoodsValidation,
  approveReceivedGoodsValidation,
  getReceivedGoodsValidation
};