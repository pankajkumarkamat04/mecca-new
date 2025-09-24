const { body, param } = require('express-validator');

// Create user validation
const createUserValidation = [
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
  
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
  
  body('role')
    .isIn(['super_admin', 'admin', 'manager', 'employee'])
    .withMessage('Invalid role'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  
  body('salary.amount')
    .optional()
    .isNumeric()
    .withMessage('Salary amount must be a number'),
  
  body('salary.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('salary.paymentType')
    .optional()
    .isIn(['monthly', 'weekly', 'daily', 'hourly'])
    .withMessage('Invalid payment type')
];

// Update user validation
const updateUserValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID'),
  
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
  
  body('role')
    .optional()
    .isIn(['super_admin', 'admin', 'manager', 'employee'])
    .withMessage('Invalid role'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Update profile validation
const updateProfileValidation = [
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
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Invalid phone number'),
  
  body('address.street')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Street address cannot exceed 100 characters'),
  
  body('address.city')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('City cannot exceed 50 characters'),
  
  body('address.state')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('State cannot exceed 50 characters'),
  
  body('address.zipCode')
    .optional()
    .trim()
    .isLength({ max: 10 })
    .withMessage('ZIP code cannot exceed 10 characters'),
  
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Country cannot exceed 50 characters')
];

// Get user by ID validation
const getUserByIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid user ID')
];

module.exports = {
  createUserValidation,
  updateUserValidation,
  updateProfileValidation,
  getUserByIdValidation
};
