const { body, param } = require('express-validator');

// Create product validation
const createProductValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Product name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('SKU must be between 2 and 50 characters'),
  
  body('barcode')
    .optional()
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Barcode must be between 8 and 20 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('category')
    .isMongoId()
    .withMessage('Valid category is required'),
  
  body('store')
    .isMongoId()
    .withMessage('Valid store is required'),
  
  body('pricing.costPrice')
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  
  body('pricing.sellingPrice')
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  
  body('pricing.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('inventory.currentStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Current stock must be a non-negative number'),
  
  body('inventory.minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative number'),
  
  body('inventory.maxStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative number'),
  
  body('inventory.trackSerial')
    .optional()
    .isBoolean()
    .withMessage('Track serial must be a boolean value'),
  
  body('inventory.alertOnLowStock')
    .optional()
    .isBoolean()
    .withMessage('Alert on low stock must be a boolean value'),
  
  body('isDigital')
    .optional()
    .isBoolean()
    .withMessage('isDigital must be a boolean value'),
  
  body('weight.value')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  
  body('weight.unit')
    .optional()
    .isIn(['g', 'kg', 'lb', 'oz'])
    .withMessage('Invalid weight unit'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  
  body('dimensions.unit')
    .optional()
    .isIn(['cm', 'm', 'in', 'ft'])
    .withMessage('Invalid dimension unit')
];

// Update product validation
const updateProductValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters'),
  
  body('sku')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('SKU must be between 2 and 50 characters'),
  
  body('barcode')
    .optional()
    .trim()
    .isLength({ min: 8, max: 20 })
    .withMessage('Barcode must be between 8 and 20 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category is required'),
  
  body('pricing.costPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Cost price must be a positive number'),
  
  body('pricing.sellingPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Selling price must be a positive number'),
  
  body('pricing.taxRate')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),
  
  body('inventory.minStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Minimum stock must be a non-negative number'),
  
  body('inventory.maxStock')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Maximum stock must be a non-negative number'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Update stock validation
const updateStockValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID'),
  
  body('quantity')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be a positive number'),
  
  body('operation')
    .isIn(['add', 'subtract', 'set'])
    .withMessage('Operation must be add, subtract, or set'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters'),
  
  body('reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters')
];

// Get product by ID validation
const getProductByIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid product ID')
];

module.exports = {
  createProductValidation,
  updateProductValidation,
  updateStockValidation,
  getProductByIdValidation
};
