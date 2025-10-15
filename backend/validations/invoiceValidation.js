const { body, param, query } = require('express-validator');

const createInvoiceValidation = [
  body('customerPhone')
    .notEmpty()
    .withMessage('Customer phone number is required')
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),

  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),

  body('invoiceDate')
    .isISO8601()
    .withMessage('Invoice date must be a valid date'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.product')
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),

  // Name can be derived on the server from the product
  body('items.*.name')
    .optional()
    .notEmpty()
    .withMessage('Item name is required'),

  body('items.*.quantity')
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),

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

  // Total is computed on the server; allow omission
  body('items.*.total')
    .optional()
    .isNumeric()
    .withMessage('Item total must be a number')
    .isFloat({ min: 0 })
    .withMessage('Item total must be non-negative'),

  // Subtotal is computed on the server; allow omission
  body('subtotal')
    .optional()
    .isNumeric()
    .withMessage('Subtotal must be a number')
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be non-negative'),

  body('totalDiscount')
    .optional()
    .isNumeric()
    .withMessage('Total discount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total discount must be non-negative'),

  body('totalTax')
    .optional()
    .isNumeric()
    .withMessage('Total tax must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total tax must be non-negative'),

  // Total is computed on the server; allow omission
  body('total')
    .optional()
    .isNumeric()
    .withMessage('Total must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total must be non-negative'),

  body('paid')
    .optional()
    .isNumeric()
    .withMessage('Paid amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be non-negative'),

  // Normalize and validate status; map common aliases to allowed values
  body('status')
    .optional()
    .customSanitizer((value) => {
      if (!value) return value;
      const v = String(value).toLowerCase();
      const aliasMap = {
        unpaid: 'pending',
        processing: 'pending',
        open: 'pending',
        closed: 'paid',
      };
      return aliasMap[v] || v;
    })
    .isIn(['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),

  body('type')
    .optional()
    .isIn(['sale', 'proforma', 'credit_note', 'debit_note', 'delivery_note'])
    .withMessage('Invalid invoice type'),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

const updateInvoiceValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid invoice ID is required'),

  body('customerPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),

  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),

  body('invoiceDate')
    .optional()
    .isISO8601()
    .withMessage('Invoice date must be a valid date'),

  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),

  body('items')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.product')
    .optional()
    .isMongoId()
    .withMessage('Valid product ID is required for each item'),

  body('items.*.name')
    .optional()
    .notEmpty()
    .withMessage('Item name is required'),

  body('items.*.quantity')
    .optional()
    .isNumeric()
    .withMessage('Quantity must be a number')
    .isFloat({ min: 0.01 })
    .withMessage('Quantity must be greater than 0'),

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

  body('items.*.total')
    .optional()
    .isNumeric()
    .withMessage('Item total must be a number')
    .isFloat({ min: 0 })
    .withMessage('Item total must be non-negative'),

  body('subtotal')
    .optional()
    .isNumeric()
    .withMessage('Subtotal must be a number')
    .isFloat({ min: 0 })
    .withMessage('Subtotal must be non-negative'),

  body('totalDiscount')
    .optional()
    .isNumeric()
    .withMessage('Total discount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total discount must be non-negative'),

  body('totalTax')
    .optional()
    .isNumeric()
    .withMessage('Total tax must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total tax must be non-negative'),

  body('total')
    .optional()
    .isNumeric()
    .withMessage('Total must be a number')
    .isFloat({ min: 0 })
    .withMessage('Total must be non-negative'),

  body('paid')
    .optional()
    .isNumeric()
    .withMessage('Paid amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Paid amount must be non-negative'),

  body('status')
    .optional()
    .isIn(['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'])
    .withMessage('Invalid status'),

  body('type')
    .optional()
    .isIn(['sale', 'proforma', 'credit_note', 'debit_note', 'delivery_note'])
    .withMessage('Invalid invoice type'),

  body('notes')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
];

const getInvoicesValidation = [
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
    .isLength({ max: 100 })
    .withMessage('Search term cannot exceed 100 characters'),

  query('status')
    .optional()
    .isIn(['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'])
    .withMessage('Invalid status filter'),

  query('type')
    .optional()
    .isIn(['sale', 'proforma', 'credit_note', 'debit_note', 'delivery_note'])
    .withMessage('Invalid type filter'),

  query('customerPhone')
    .optional()
    .matches(/^\+?[\d\s\-\(\)]+$/)
    .withMessage('Please enter a valid phone number'),
];

const getInvoiceValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid invoice ID is required'),
];

const deleteInvoiceValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid invoice ID is required'),
];

module.exports = {
  createInvoiceValidation,
  updateInvoiceValidation,
  getInvoicesValidation,
  getInvoiceValidation,
  deleteInvoiceValidation,
};
