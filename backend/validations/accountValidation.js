const { body, param, query } = require('express-validator');

// Validation for creating a new account
const createAccountValidation = [
  body('name')
    .notEmpty()
    .withMessage('Account name is required')
    .isLength({ max: 100 })
    .withMessage('Account name cannot exceed 100 characters')
    .trim(),
  
  body('type')
    .isIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
    .withMessage('Invalid account type'),
  
  body('category')
    .notEmpty()
    .withMessage('Account category is required')
    .isLength({ max: 50 })
    .withMessage('Account category cannot exceed 50 characters')
    .trim(),
  
  body('parentAccount')
    .optional()
    .isMongoId()
    .withMessage('Valid parent account ID is required'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('openingBalance')
    .optional()
    .isFloat()
    .withMessage('Opening balance must be a valid number'),
  
  body('currentBalance')
    .optional()
    .isFloat()
    .withMessage('Current balance must be a valid number'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),
  
  body('isSystemAccount')
    .optional()
    .isBoolean()
    .withMessage('System account flag must be a boolean'),
  
  body('settings.allowNegativeBalance')
    .optional()
    .isBoolean()
    .withMessage('Allow negative balance must be a boolean'),
  
  body('settings.requireApproval')
    .optional()
    .isBoolean()
    .withMessage('Require approval must be a boolean'),
  
];

// Validation for updating an account
const updateAccountValidation = [
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Account name cannot exceed 100 characters')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
    .withMessage('Invalid account type'),
  
  body('category')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Account category cannot exceed 50 characters')
    .trim(),
  
  body('parentAccount')
    .optional()
    .isMongoId()
    .withMessage('Valid parent account ID is required'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('openingBalance')
    .optional()
    .isFloat()
    .withMessage('Opening balance must be a valid number'),
  
  body('currentBalance')
    .optional()
    .isFloat()
    .withMessage('Current balance must be a valid number'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('Active status must be a boolean'),
  
  body('isSystemAccount')
    .optional()
    .isBoolean()
    .withMessage('System account flag must be a boolean'),
  
  body('settings.allowNegativeBalance')
    .optional()
    .isBoolean()
    .withMessage('Allow negative balance must be a boolean'),
  
  body('settings.requireApproval')
    .optional()
    .isBoolean()
    .withMessage('Require approval must be a boolean'),
  
];

// Validation for account balance query
const getAccountBalanceValidation = [
  query('asOfDate')
    .optional()
    .isISO8601()
    .withMessage('As of date must be a valid ISO 8601 date')
];

// Validation for account transactions query
const getAccountTransactionsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  query('type')
    .optional()
    .isIn(['sale', 'purchase', 'payment', 'receipt', 'expense', 'income', 'transfer', 'adjustment', 'journal'])
    .withMessage('Invalid transaction type'),
  
  query('status')
    .optional()
    .isIn(['draft', 'pending', 'approved', 'rejected', 'posted'])
    .withMessage('Invalid transaction status')
];

// Validation for accounts by type query
const getAccountsByTypeValidation = [
  param('type')
    .isIn(['asset', 'liability', 'equity', 'revenue', 'expense'])
    .withMessage('Invalid account type'),
  
  query('category')
    .optional()
    .isString()
    .trim()
    .withMessage('Category must be a string'),
  
  query('parentAccount')
    .optional()
    .isMongoId()
    .withMessage('Valid parent account ID is required')
];

// Validation for account settings update
const updateAccountSettingsValidation = [
  body('allowNegativeBalance')
    .optional()
    .isBoolean()
    .withMessage('Allow negative balance must be a boolean'),
  
  body('requireApproval')
    .optional()
    .isBoolean()
    .withMessage('Require approval must be a boolean'),
  
];

module.exports = {
  createAccountValidation,
  updateAccountValidation,
  getAccountBalanceValidation,
  getAccountTransactionsValidation,
  getAccountsByTypeValidation,
  updateAccountSettingsValidation
};
