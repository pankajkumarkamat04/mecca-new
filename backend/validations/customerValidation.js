const { body, param } = require('express-validator');

// Create customer validation
const createCustomerValidation = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  
  body('dateOfBirth')
    .optional()
    .isISO8601()
    .withMessage('Invalid date of birth'),
  
  body('gender')
    .optional()
    .isIn(['male', 'female', 'other'])
    .withMessage('Invalid gender'),
  
  body('type')
    .optional()
    .isIn(['individual', 'business'])
    .withMessage('Invalid customer type'),
  
  body('businessInfo.companyName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name cannot exceed 100 characters'),
  
  body('address')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),
  
  body('businessInfo.taxId')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Tax ID cannot exceed 50 characters'),
  
  body('businessInfo.website')
    .optional()
    .isURL()
    .withMessage('Invalid website URL'),
  
  body('address.billing.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Billing street cannot exceed 100 characters'),
  
  body('address.billing.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Billing city cannot exceed 50 characters'),
  
  body('address.billing.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Billing state cannot exceed 50 characters'),
  
  body('address.billing.zipCode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('Billing ZIP code cannot exceed 10 characters'),
  
  body('address.billing.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Billing country cannot exceed 50 characters'),
  
  body('preferences.language')
    .optional()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language must be between 2 and 5 characters'),
  
  body('preferences.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('creditLimit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit limit must be a positive number'),
  
  body('paymentTerms')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Payment terms must be a non-negative number')
];

// Update customer validation
const updateCustomerValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid customer ID'),
  
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email is required'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];



// Get customer by ID validation
const getCustomerByIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid customer ID')
];

module.exports = {
  createCustomerValidation,
  updateCustomerValidation,
  getCustomerByIdValidation
};
