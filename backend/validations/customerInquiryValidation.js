const { body, param, query } = require('express-validator');

// Create customer inquiry validation
const createCustomerInquiryValidation = [
  body('customer')
    .notEmpty()
    .withMessage('Customer is required')
    .isMongoId()
    .withMessage('Invalid customer ID'),

  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),

  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  body('productsOfInterest')
    .optional()
    .isArray()
    .withMessage('Products of interest must be an array'),

  body('productsOfInterest.*.product')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('productsOfInterest.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  body('productsOfInterest.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid follow-up date format')
];

// Update customer inquiry validation
const updateCustomerInquiryValidation = [
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Invalid customer ID'),

  body('subject')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Subject must be between 1 and 200 characters'),

  body('message')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  body('status')
    .optional()
    .isIn([
      // canonical
      'new', 'under_review', 'quoted', 'converted_to_order', 'closed', 'cancelled',
      // accepted aliases (normalized in controller)
      'pending', 'open', 'review', 'reviewing', 'in_review', 'inprogress', 'in_progress',
      'quote', 'quotation', 'converted', 'ordered', 'order_placed',
      'done', 'complete', 'completed', 'resolved', 'cancel', 'canceled'
    ])
    .withMessage('Invalid status'),

  body('productsOfInterest')
    .optional()
    .isArray()
    .withMessage('Products of interest must be an array'),

  body('productsOfInterest.*.product')
    .optional()
    .isMongoId()
    .withMessage('Invalid product ID'),

  body('productsOfInterest.*.quantity')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  body('productsOfInterest.*.notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),

  body('followUpDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid follow-up date format')
];

// Update customer inquiry status validation
const updateCustomerInquiryStatusValidation = [
  body('status')
    .notEmpty()
    .withMessage('Status is required')
    .isIn([
      // canonical
      'new', 'under_review', 'quoted', 'converted_to_order', 'closed', 'cancelled',
      // accepted aliases (normalized in controller)
      'pending', 'open', 'review', 'reviewing', 'in_review', 'inprogress', 'in_progress',
      'quote', 'quotation', 'converted', 'ordered', 'order_placed',
      'done', 'complete', 'completed', 'resolved', 'cancel', 'canceled'
    ])
    .withMessage('Invalid status'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Assign customer inquiry validation
const assignCustomerInquiryValidation = [
  body('assignedTo')
    .notEmpty()
    .withMessage('Assigned user is required')
    .isMongoId()
    .withMessage('Invalid user ID')
];

// Get customer inquiries validation
const getCustomerInquiriesValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),

  query('status')
    .optional()
    .isIn([
      // canonical
      'new', 'under_review', 'quoted', 'converted_to_order', 'closed', 'cancelled',
      // accepted aliases (normalized in controller)
      'pending', 'open', 'review', 'reviewing', 'in_review', 'inprogress', 'in_progress',
      'quote', 'quotation', 'converted', 'ordered', 'order_placed',
      'done', 'complete', 'completed', 'resolved', 'cancel', 'canceled'
    ])
    .withMessage('Invalid status'),

  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid assigned user ID')
];

// Customer inquiry ID validation
const customerInquiryIdValidation = [
  param('id')
    .notEmpty()
    .withMessage('Customer inquiry ID is required')
    .isMongoId()
    .withMessage('Invalid customer inquiry ID')
];

module.exports = {
  createCustomerInquiryValidation,
  updateCustomerInquiryValidation,
  updateCustomerInquiryStatusValidation,
  assignCustomerInquiryValidation,
  getCustomerInquiriesValidation,
  customerInquiryIdValidation
};