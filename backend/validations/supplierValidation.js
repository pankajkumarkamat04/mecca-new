const { body, param } = require('express-validator');

// Create supplier validation
const createSupplierValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Supplier name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be between 2 and 100 characters'),
  
  body('businessInfo.companyName')
    .trim()
    .notEmpty()
    .withMessage('Company name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  
  body('contactPerson.firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact person first name must be between 2 and 50 characters'),
  
  body('contactPerson.lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Contact person last name must be between 2 and 50 characters'),
  
  body('contactPerson.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid contact person email is required'),
  
  body('contactPerson.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid contact person phone number'),
  
  body('businessInfo.taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax ID cannot exceed 50 characters'),
  
  body('businessInfo.website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  
  body('address.street')
    .trim()
    .notEmpty()
    .withMessage('Street address is required')
    .isLength({ max: 100 })
    .withMessage('Street address cannot exceed 100 characters'),
  
  body('address.city')
    .trim()
    .notEmpty()
    .withMessage('City is required')
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  
  body('address.state')
    .trim()
    .notEmpty()
    .withMessage('State is required')
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  
  body('address.zipCode')
    .trim()
    .notEmpty()
    .withMessage('ZIP code is required')
    .isLength({ max: 10 })
    .withMessage('ZIP code cannot exceed 10 characters'),
  
  body('address.country')
    .trim()
    .notEmpty()
    .withMessage('Country is required')
    .isLength({ max: 50 })
    .withMessage('Country cannot exceed 50 characters'),
  
  body('paymentTerms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Payment terms must be a non-negative number'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
  
  body('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Update supplier validation
const updateSupplierValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Supplier name must be between 2 and 100 characters'),
  
  body('businessInfo.companyName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters'),
  
  body('contactPerson.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid contact person email is required'),
  
  body('contactPerson.phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid contact person phone number'),
  
  body('businessInfo.website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  
  body('paymentTerms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Payment terms must be a non-negative number'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Invalid status'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Update rating validation
const updateRatingValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid supplier ID'),
  
  body('rating')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
];

// Get supplier by ID validation
const getSupplierByIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid supplier ID')
];

module.exports = {
  createSupplierValidation,
  updateSupplierValidation,
  updateRatingValidation,
  getSupplierByIdValidation
};
