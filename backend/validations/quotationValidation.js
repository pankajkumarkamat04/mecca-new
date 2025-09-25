const { body, param, query } = require('express-validator');

const createQuotationValidation = [
  body('customer')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('validUntil')
    .isISO8601()
    .withMessage('Valid until date is required')
    .custom((value) => {
      const validUntil = new Date(value);
      const now = new Date();
      if (validUntil <= now) {
        throw new Error('Valid until date must be in the future');
      }
      return true;
    }),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.product')
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),

  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('items.*.unitPrice')
    .isNumeric()
    .withMessage('Unit price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be non-negative'),

  body('items.*.discount')
    .optional()
    .isNumeric()
    .withMessage('Discount must be a number')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),

  body('items.*.taxRate')
    .optional()
    .isNumeric()
    .withMessage('Tax rate must be a number')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  body('terms')
    .optional()
    .isString()
    .withMessage('Terms must be a string')
    .isLength({ max: 2000 })
    .withMessage('Terms must not exceed 2000 characters')
];

const updateQuotationValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid quotation ID is required'),

  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),

  body('validUntil')
    .optional()
    .isISO8601()
    .withMessage('Valid until date must be a valid date')
    .custom((value) => {
      if (value) {
        const validUntil = new Date(value);
        const now = new Date();
        if (validUntil <= now) {
          throw new Error('Valid until date must be in the future');
        }
      }
      return true;
    }),

  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.product')
    .optional()
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),

  body('items.*.quantity')
    .optional()
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 1 })
    .withMessage('Quantity must be at least 1'),

  body('items.*.unitPrice')
    .optional()
    .isNumeric()
    .withMessage('Unit price must be a number')
    .isFloat({ min: 0 })
    .withMessage('Unit price must be non-negative'),

  body('items.*.discount')
    .optional()
    .isNumeric()
    .withMessage('Discount must be a number')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Discount must be between 0 and 100'),

  body('items.*.taxRate')
    .optional()
    .isNumeric()
    .withMessage('Tax rate must be a number')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Tax rate must be between 0 and 100'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  body('terms')
    .optional()
    .isString()
    .withMessage('Terms must be a string')
    .isLength({ max: 2000 })
    .withMessage('Terms must not exceed 2000 characters')
];

const getQuotationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('search')
    .optional()
    .isString()
    .withMessage('Search must be a string'),

  query('status')
    .optional()
    .isIn(['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'])
    .withMessage('Invalid status'),

  query('customerId')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required')
];

const quotationIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid quotation ID is required')
];

module.exports = {
  createQuotationValidation,
  updateQuotationValidation,
  getQuotationsValidation,
  quotationIdValidation
};
