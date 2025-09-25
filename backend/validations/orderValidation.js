const { body, param, query } = require('express-validator');

const createOrderValidation = [
  body('customer')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Expected delivery date must be a valid date')
    .custom((value) => {
      if (value) {
        const deliveryDate = new Date(value);
        const now = new Date();
        if (deliveryDate <= now) {
          throw new Error('Expected delivery date must be in the future');
        }
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

  body('shippingCost')
    .optional()
    .isNumeric()
    .withMessage('Shipping cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be non-negative'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'check', 'online', 'other'])
    .withMessage('Invalid payment method'),

  body('orderStatus')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status'),

  body('fulfillmentStatus')
    .optional()
    .isIn(['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered'])
    .withMessage('Invalid fulfillment status'),

  body('shippingMethod')
    .optional()
    .isIn(['pickup', 'delivery', 'shipping', 'express'])
    .withMessage('Invalid shipping method'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  body('source')
    .optional()
    .isIn(['pos', 'online', 'phone', 'email', 'walk_in', 'quotation'])
    .withMessage('Invalid source'),

  body('quotation')
    .optional()
    .isMongoId()
    .withMessage('Valid quotation ID is required'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  body('internalNotes')
    .optional()
    .isString()
    .withMessage('Internal notes must be a string')
    .isLength({ max: 2000 })
    .withMessage('Internal notes must not exceed 2000 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
    .isLength({ max: 50 })
    .withMessage('Each tag must not exceed 50 characters')
];

const updateOrderValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),

  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),

  body('expectedDeliveryDate')
    .optional()
    .isISO8601()
    .withMessage('Expected delivery date must be a valid date')
    .custom((value) => {
      if (value) {
        const deliveryDate = new Date(value);
        const now = new Date();
        if (deliveryDate <= now) {
          throw new Error('Expected delivery date must be in the future');
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

  body('shippingCost')
    .optional()
    .isNumeric()
    .withMessage('Shipping cost must be a number')
    .isFloat({ min: 0 })
    .withMessage('Shipping cost must be non-negative'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'check', 'online', 'other'])
    .withMessage('Invalid payment method'),

  body('orderStatus')
    .optional()
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status'),

  body('fulfillmentStatus')
    .optional()
    .isIn(['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered'])
    .withMessage('Invalid fulfillment status'),

  body('shippingMethod')
    .optional()
    .isIn(['pickup', 'delivery', 'shipping', 'express'])
    .withMessage('Invalid shipping method'),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority level'),

  body('source')
    .optional()
    .isIn(['pos', 'online', 'phone', 'email', 'walk_in', 'quotation'])
    .withMessage('Invalid source'),

  body('quotation')
    .optional()
    .isMongoId()
    .withMessage('Valid quotation ID is required'),

  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters'),

  body('internalNotes')
    .optional()
    .isString()
    .withMessage('Internal notes must be a string')
    .isLength({ max: 2000 })
    .withMessage('Internal notes must not exceed 2000 characters'),

  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),

  body('tags.*')
    .optional()
    .isString()
    .withMessage('Each tag must be a string')
    .isLength({ max: 50 })
    .withMessage('Each tag must not exceed 50 characters')
];

const updateOrderStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),

  body('status')
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid order status'),

  body('notes')
    .optional()
    .isString()
    .withMessage('Notes must be a string')
    .isLength({ max: 500 })
    .withMessage('Notes must not exceed 500 characters')
];

const updatePaymentStatusValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),

  body('paymentStatus')
    .isIn(['pending', 'partial', 'paid', 'refunded', 'cancelled'])
    .withMessage('Invalid payment status'),

  body('paymentMethod')
    .optional()
    .isIn(['cash', 'card', 'bank_transfer', 'check', 'online', 'other'])
    .withMessage('Invalid payment method'),

  body('paymentDetails')
    .optional()
    .isObject()
    .withMessage('Payment details must be an object')
];

const assignOrderValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required'),

  body('assignedTo')
    .isMongoId()
    .withMessage('Valid user ID is required')
];

const getOrdersValidation = [
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
    .isIn(['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Invalid status'),

  query('paymentStatus')
    .optional()
    .isIn(['pending', 'partial', 'paid', 'refunded', 'cancelled'])
    .withMessage('Invalid payment status'),

  query('fulfillmentStatus')
    .optional()
    .isIn(['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered'])
    .withMessage('Invalid fulfillment status'),

  query('customerId')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),

  query('source')
    .optional()
    .isIn(['pos', 'online', 'phone', 'email', 'walk_in', 'quotation'])
    .withMessage('Invalid source'),

  query('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority'),

  query('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required')
];

const orderIdValidation = [
  param('id')
    .isMongoId()
    .withMessage('Valid order ID is required')
];

const customerIdValidation = [
  param('customerId')
    .isMongoId()
    .withMessage('Valid customer ID is required')
];

module.exports = {
  createOrderValidation,
  updateOrderValidation,
  updateOrderStatusValidation,
  updatePaymentStatusValidation,
  assignOrderValidation,
  getOrdersValidation,
  orderIdValidation,
  customerIdValidation
};
