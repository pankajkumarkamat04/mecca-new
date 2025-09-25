const { body, param, query } = require('express-validator');

// Validation for getting purchase orders
const getPurchaseOrdersValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('Search term cannot exceed 100 characters'),
  query('status').optional().isIn(['draft', 'sent', 'confirmed', 'partial', 'received', 'completed', 'cancelled']).withMessage('Invalid status'),
  query('supplier').optional().isMongoId().withMessage('Valid supplier ID is required'),
  query('startDate').optional().isISO8601().withMessage('Valid start date is required'),
  query('endDate').optional().isISO8601().withMessage('Valid end date is required')
];

// Validation for purchase order ID parameter
const purchaseOrderIdValidation = [
  param('id').isMongoId().withMessage('Valid purchase order ID is required')
];

// Validation for creating purchase order
const createPurchaseOrderValidation = [
  body('supplier')
    .notEmpty()
    .withMessage('Supplier is required')
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Valid warehouse ID is required'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.product')
    .notEmpty()
    .withMessage('Product is required')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  
  body('items.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('items.*.unitCost')
    .notEmpty()
    .withMessage('Unit cost is required')
    .isNumeric()
    .withMessage('Unit cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Unit cost cannot be negative'),
  
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Valid expected delivery date is required'),
  
  body('paymentTerms')
    .optional()
    .isIn(['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt', 'prepaid'])
    .withMessage('Invalid payment terms'),
  
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('Invalid shipping method'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid assigned user ID is required'),
  
  body('reference')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  
  body('internalNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes cannot exceed 1000 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tag cannot exceed 50 characters')
];

// Validation for updating purchase order
const updatePurchaseOrderValidation = [
  param('id').isMongoId().withMessage('Valid purchase order ID is required'),
  
  body('supplier')
    .optional()
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  
  body('warehouse')
    .optional()
    .isMongoId()
    .withMessage('Valid warehouse ID is required'),
  
  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),
  
  body('items.*.product')
    .optional()
    .isMongoId()
    .withMessage('Valid product ID is required'),
  
  body('items.*.quantity')
    .optional()
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  
  body('items.*.unitCost')
    .optional()
    .isNumeric()
    .withMessage('Unit cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Unit cost cannot be negative'),
  
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Valid expected delivery date is required'),
  
  body('paymentTerms')
    .optional()
    .isIn(['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt', 'prepaid'])
    .withMessage('Invalid payment terms'),
  
  body('shippingMethod')
    .optional()
    .isIn(['standard', 'express', 'overnight', 'pickup'])
    .withMessage('Invalid shipping method'),
  
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid assigned user ID is required'),
  
  body('reference')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  
  body('internalNotes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Internal notes cannot exceed 1000 characters'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tag cannot exceed 50 characters')
];

// Validation for receiving purchase order
const receivePurchaseOrderValidation = [
  param('id').isMongoId().withMessage('Valid purchase order ID is required'),
  
  body('receivedItems')
    .isArray({ min: 1 })
    .withMessage('At least one received item is required'),
  
  body('receivedItems.*.itemId')
    .notEmpty()
    .withMessage('Item ID is required')
    .isMongoId()
    .withMessage('Valid item ID is required'),
  
  body('receivedItems.*.quantity')
    .notEmpty()
    .withMessage('Received quantity is required')
    .isNumeric()
    .withMessage('Received quantity must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Received quantity must be greater than 0'),
  
  body('receivedItems.*.batchNumber')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Batch number cannot exceed 50 characters'),
  
  body('receivedItems.*.expiryDate')
    .optional()
    .isISO8601()
    .withMessage('Valid expiry date is required'),
  
  body('receivedItems.*.serialNumbers')
    .optional()
    .isArray()
    .withMessage('Serial numbers must be an array'),
  
  body('receivedItems.*.serialNumbers.*')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Serial number cannot exceed 100 characters'),
  
  body('receivedItems.*.notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

module.exports = {
  getPurchaseOrdersValidation,
  purchaseOrderIdValidation,
  createPurchaseOrderValidation,
  updatePurchaseOrderValidation,
  receivePurchaseOrderValidation
};
