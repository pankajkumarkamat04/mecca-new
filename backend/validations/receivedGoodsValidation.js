const { body } = require('express-validator');

const receivedGoodsValidation = {
  createReceivedGoods: [
    body('supplier')
      .notEmpty()
      .withMessage('Supplier is required')
      .isMongoId()
      .withMessage('Invalid supplier ID'),
    
    body('warehouse')
      .notEmpty()
      .withMessage('Warehouse is required')
      .isMongoId()
      .withMessage('Invalid warehouse ID'),
    
    body('expectedDate')
      .notEmpty()
      .withMessage('Expected date is required')
      .isISO8601()
      .withMessage('Invalid expected date format'),
    
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    
    body('items.*.product')
      .notEmpty()
      .withMessage('Product is required for each item')
      .isMongoId()
      .withMessage('Invalid product ID'),
    
    body('items.*.expectedQuantity')
      .isNumeric()
      .withMessage('Expected quantity must be a number')
      .isFloat({ min: 0.01 })
      .withMessage('Expected quantity must be greater than 0'),
    
    body('items.*.unitPrice')
      .isNumeric()
      .withMessage('Unit price must be a number')
      .isFloat({ min: 0 })
      .withMessage('Unit price cannot be negative'),
    
    body('items.*.batchNumber')
      .optional()
      .isString()
      .withMessage('Batch number must be a string')
      .isLength({ max: 50 })
      .withMessage('Batch number cannot exceed 50 characters'),
    
    body('items.*.expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format'),
    
    body('items.*.condition')
      .optional()
      .isIn(['good', 'damaged', 'expired', 'defective'])
      .withMessage('Invalid condition'),
    
    body('items.*.notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('deliveryNote')
      .optional()
      .isString()
      .withMessage('Delivery note must be a string')
      .isLength({ max: 100 })
      .withMessage('Delivery note cannot exceed 100 characters'),
    
    body('invoiceNumber')
      .optional()
      .isString()
      .withMessage('Invoice number must be a string')
      .isLength({ max: 50 })
      .withMessage('Invoice number cannot exceed 50 characters'),
    
    body('transportDetails.vehicleNumber')
      .optional()
      .isString()
      .withMessage('Vehicle number must be a string')
      .isLength({ max: 20 })
      .withMessage('Vehicle number cannot exceed 20 characters'),
    
    body('transportDetails.driverName')
      .optional()
      .isString()
      .withMessage('Driver name must be a string')
      .isLength({ max: 100 })
      .withMessage('Driver name cannot exceed 100 characters'),
    
    body('transportDetails.driverPhone')
      .optional()
      .isString()
      .withMessage('Driver phone must be a string')
      .isLength({ max: 20 })
      .withMessage('Driver phone cannot exceed 20 characters'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],

  updateReceivedGoods: [
    body('supplier')
      .optional()
      .isMongoId()
      .withMessage('Invalid supplier ID'),
    
    body('warehouse')
      .optional()
      .isMongoId()
      .withMessage('Invalid warehouse ID'),
    
    body('expectedDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expected date format'),
    
    body('items')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    
    body('items.*.product')
      .optional()
      .isMongoId()
      .withMessage('Invalid product ID'),
    
    body('items.*.expectedQuantity')
      .optional()
      .isNumeric()
      .withMessage('Expected quantity must be a number')
      .isFloat({ min: 0.01 })
      .withMessage('Expected quantity must be greater than 0'),
    
    body('items.*.receivedQuantity')
      .optional()
      .isNumeric()
      .withMessage('Received quantity must be a number')
      .isFloat({ min: 0 })
      .withMessage('Received quantity cannot be negative'),
    
    body('items.*.unitPrice')
      .optional()
      .isNumeric()
      .withMessage('Unit price must be a number')
      .isFloat({ min: 0 })
      .withMessage('Unit price cannot be negative'),
    
    body('items.*.batchNumber')
      .optional()
      .isString()
      .withMessage('Batch number must be a string')
      .isLength({ max: 50 })
      .withMessage('Batch number cannot exceed 50 characters'),
    
    body('items.*.expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format'),
    
    body('items.*.condition')
      .optional()
      .isIn(['good', 'damaged', 'expired', 'defective'])
      .withMessage('Invalid condition'),
    
    body('items.*.notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('deliveryNote')
      .optional()
      .isString()
      .withMessage('Delivery note must be a string')
      .isLength({ max: 100 })
      .withMessage('Delivery note cannot exceed 100 characters'),
    
    body('invoiceNumber')
      .optional()
      .isString()
      .withMessage('Invoice number must be a string')
      .isLength({ max: 50 })
      .withMessage('Invoice number cannot exceed 50 characters'),
    
    body('transportDetails.vehicleNumber')
      .optional()
      .isString()
      .withMessage('Vehicle number must be a string')
      .isLength({ max: 20 })
      .withMessage('Vehicle number cannot exceed 20 characters'),
    
    body('transportDetails.driverName')
      .optional()
      .isString()
      .withMessage('Driver name must be a string')
      .isLength({ max: 100 })
      .withMessage('Driver name cannot exceed 100 characters'),
    
    body('transportDetails.driverPhone')
      .optional()
      .isString()
      .withMessage('Driver phone must be a string')
      .isLength({ max: 20 })
      .withMessage('Driver phone cannot exceed 20 characters'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ],

  receiveItems: [
    body('items')
      .isArray({ min: 1 })
      .withMessage('At least one item is required'),
    
    body('items.*.itemId')
      .notEmpty()
      .withMessage('Item ID is required')
      .isMongoId()
      .withMessage('Invalid item ID'),
    
    body('items.*.receivedQuantity')
      .isNumeric()
      .withMessage('Received quantity must be a number')
      .isFloat({ min: 0 })
      .withMessage('Received quantity cannot be negative'),
    
    body('items.*.batchNumber')
      .optional()
      .isString()
      .withMessage('Batch number must be a string')
      .isLength({ max: 50 })
      .withMessage('Batch number cannot exceed 50 characters'),
    
    body('items.*.expiryDate')
      .optional()
      .isISO8601()
      .withMessage('Invalid expiry date format'),
    
    body('items.*.condition')
      .optional()
      .isIn(['good', 'damaged', 'expired', 'defective'])
      .withMessage('Invalid condition'),
    
    body('items.*.notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    
    body('qualityCheck.results')
      .optional()
      .isIn(['passed', 'failed', 'conditional'])
      .withMessage('Invalid quality check results'),
    
    body('qualityCheck.notes')
      .optional()
      .isString()
      .withMessage('Quality check notes must be a string')
      .isLength({ max: 1000 })
      .withMessage('Quality check notes cannot exceed 1000 characters'),
    
    body('notes')
      .optional()
      .isString()
      .withMessage('Notes must be a string')
      .isLength({ max: 1000 })
      .withMessage('Notes cannot exceed 1000 characters')
  ]
};

module.exports = receivedGoodsValidation;
