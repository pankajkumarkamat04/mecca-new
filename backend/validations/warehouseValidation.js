const { body, param, query } = require('express-validator');

// Validation for getting warehouses
const getWarehousesValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('search').optional().isString().trim().isLength({ max: 100 }).withMessage('Search term cannot exceed 100 characters'),
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean')
];

// Validation for warehouse ID parameter
const warehouseIdValidation = [
  param('id').isMongoId().withMessage('Valid warehouse ID is required')
];

// Validation for creating warehouse
const createWarehouseValidation = [
  body('name')
    .notEmpty()
    .withMessage('Warehouse name is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Warehouse name must be between 2 and 200 characters'),
  
  body('code')
    .notEmpty()
    .withMessage('Warehouse code is required')
    .isString()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Warehouse code must be between 2 and 20 characters')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Warehouse code can only contain uppercase letters, numbers, hyphens, and underscores'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('address.street').optional().isString().trim().isLength({ max: 200 }).withMessage('Street cannot exceed 200 characters'),
  body('address.city').optional().isString().trim().isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('address.state').optional().isString().trim().isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),
  body('address.zipCode').optional().isString().trim().isLength({ max: 20 }).withMessage('Zip code cannot exceed 20 characters'),
  body('address.country').optional().isString().trim().isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters'),
  
  body('contact.phone').optional().isString().trim().isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters'),
  body('contact.email').optional().isEmail().withMessage('Valid email is required'),
  body('contact.manager.name').optional().isString().trim().isLength({ max: 100 }).withMessage('Manager name cannot exceed 100 characters'),
  body('contact.manager.phone').optional().isString().trim().isLength({ max: 20 }).withMessage('Manager phone cannot exceed 20 characters'),
  body('contact.manager.email').optional().isEmail().withMessage('Valid manager email is required'),
  
  body('capacity.totalCapacity').optional().isNumeric().withMessage('Total capacity must be a number'),
  body('capacity.maxWeight').optional().isNumeric().withMessage('Max weight must be a number'),
  
  body('settings.autoAllocateLocation').optional().isBoolean().withMessage('Auto allocate location must be a boolean'),
  body('settings.requireLocationScan').optional().isBoolean().withMessage('Require location scan must be a boolean'),
  body('settings.allowNegativeStock').optional().isBoolean().withMessage('Allow negative stock must be a boolean'),
  body('settings.lowStockThreshold').optional().isNumeric().withMessage('Low stock threshold must be a number'),
  body('settings.reorderPoint').optional().isNumeric().withMessage('Reorder point must be a number'),
  
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

// Validation for updating warehouse
const updateWarehouseValidation = [
  param('id').isMongoId().withMessage('Valid warehouse ID is required'),
  
  body('name')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Warehouse name must be between 2 and 200 characters'),
  
  body('code')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 20 })
    .withMessage('Warehouse code must be between 2 and 20 characters')
    .matches(/^[A-Z0-9-_]+$/)
    .withMessage('Warehouse code can only contain uppercase letters, numbers, hyphens, and underscores'),
  
  body('description')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('address.street').optional().isString().trim().isLength({ max: 200 }).withMessage('Street cannot exceed 200 characters'),
  body('address.city').optional().isString().trim().isLength({ max: 100 }).withMessage('City cannot exceed 100 characters'),
  body('address.state').optional().isString().trim().isLength({ max: 100 }).withMessage('State cannot exceed 100 characters'),
  body('address.zipCode').optional().isString().trim().isLength({ max: 20 }).withMessage('Zip code cannot exceed 20 characters'),
  body('address.country').optional().isString().trim().isLength({ max: 100 }).withMessage('Country cannot exceed 100 characters'),
  
  body('contact.phone').optional().isString().trim().isLength({ max: 20 }).withMessage('Phone cannot exceed 20 characters'),
  body('contact.email').optional().isEmail().withMessage('Valid email is required'),
  body('contact.manager.name').optional().isString().trim().isLength({ max: 100 }).withMessage('Manager name cannot exceed 100 characters'),
  body('contact.manager.phone').optional().isString().trim().isLength({ max: 20 }).withMessage('Manager phone cannot exceed 20 characters'),
  body('contact.manager.email').optional().isEmail().withMessage('Valid manager email is required'),
  
  body('capacity.totalCapacity').optional().isNumeric().withMessage('Total capacity must be a number'),
  body('capacity.maxWeight').optional().isNumeric().withMessage('Max weight must be a number'),
  
  body('settings.autoAllocateLocation').optional().isBoolean().withMessage('Auto allocate location must be a boolean'),
  body('settings.requireLocationScan').optional().isBoolean().withMessage('Require location scan must be a boolean'),
  body('settings.allowNegativeStock').optional().isBoolean().withMessage('Allow negative stock must be a boolean'),
  body('settings.lowStockThreshold').optional().isNumeric().withMessage('Low stock threshold must be a number'),
  body('settings.reorderPoint').optional().isNumeric().withMessage('Reorder point must be a number'),
  
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  body('isDefault').optional().isBoolean().withMessage('isDefault must be a boolean')
];

// Validation for transferring products
const transferProductsValidation = [
  body('fromWarehouse')
    .notEmpty()
    .withMessage('From warehouse is required')
    .isMongoId()
    .withMessage('Valid from warehouse ID is required'),
  
  body('toWarehouse')
    .notEmpty()
    .withMessage('To warehouse is required')
    .isMongoId()
    .withMessage('Valid to warehouse ID is required'),
  
  body('products')
    .isArray({ min: 1 })
    .withMessage('At least one product is required'),
  
  body('products.*.productId')
    .notEmpty()
    .withMessage('Product ID is required')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  
  body('products.*.quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),
  
  body('products.*.fromLocation')
    .optional()
    .isObject()
    .withMessage('From location must be an object'),
  
  body('products.*.toLocation')
    .optional()
    .isObject()
    .withMessage('To location must be an object'),
  
  body('notes')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

module.exports = {
  getWarehousesValidation,
  warehouseIdValidation,
  createWarehouseValidation,
  updateWarehouseValidation,
  transferProductsValidation
};
