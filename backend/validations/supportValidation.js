const { body, param, query } = require('express-validator');

// Validation for creating a new support ticket
const createSupportTicketValidation = [
  body('subject')
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters')
    .trim(),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters')
    .trim(),
  
  body('customer')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid assigned user ID is required'),
  
  body('category')
    .optional()
    .isIn(['technical', 'billing', 'general', 'bug_report', 'feature_request', 'complaint'])
    .withMessage('Invalid category'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('type')
    .optional()
    .isIn(['customer', 'employee'])
    .withMessage('Invalid ticket type'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each tag must be a string')
];

// Validation for updating a support ticket
const updateSupportTicketValidation = [
  body('subject')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 5000 })
    .withMessage('Description cannot exceed 5000 characters')
    .trim(),
  
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('assignedTo')
    .optional()
    .isMongoId()
    .withMessage('Valid assigned user ID is required'),
  
  body('category')
    .optional()
    .isIn(['technical', 'billing', 'general', 'bug_report', 'feature_request', 'complaint'])
    .withMessage('Invalid category'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('status')
    .optional()
    .isIn(['open', 'in_progress', 'waiting_customer', 'waiting_support', 'resolved', 'closed'])
    .withMessage('Invalid ticket status'),
  
  body('type')
    .optional()
    .isIn(['customer', 'employee'])
    .withMessage('Invalid ticket type'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('sla.responseTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Response time must be a positive number (hours)'),
  
  body('sla.resolutionTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Resolution time must be a positive number (hours)')
];

// Validation for adding a conversation
const addConversationValidation = [
  body('message')
    .notEmpty()
    .withMessage('Message is required')
    .isLength({ max: 2000 })
    .withMessage('Message cannot exceed 2000 characters')
    .trim(),
  
  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('Internal flag must be a boolean'),
  
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
  
  body('attachments.*.name')
    .optional()
    .isString()
    .trim()
    .withMessage('Attachment name must be a string'),
  
  body('attachments.*.url')
    .optional()
    .isURL()
    .withMessage('Valid attachment URL is required'),
  
  body('attachments.*.size')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Attachment size must be a positive number'),
  
  body('attachments.*.type')
    .optional()
    .isString()
    .trim()
    .withMessage('Attachment type must be a string')
];

// Validation for updating ticket status
const updateTicketStatusValidation = [
  body('status')
    .isIn(['open', 'in_progress', 'waiting_customer', 'waiting_support', 'resolved', 'closed'])
    .withMessage('Invalid ticket status')
];

// Validation for assigning ticket
const assignTicketValidation = [
  body('assignedTo')
    .isMongoId()
    .withMessage('Valid assigned user ID is required')
];

// Validation for satisfaction rating
const addSatisfactionRatingValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  
  body('feedback')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Feedback cannot exceed 1000 characters')
    .trim()
];

// Validation for attachment
const attachmentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Attachment name is required')
    .trim(),
  
  body('url')
    .isURL()
    .withMessage('Valid attachment URL is required'),
  
  body('size')
    .optional()
    .isInt({ min: 0 })
    .withMessage('File size must be a positive number'),
  
  body('type')
    .optional()
    .isString()
    .trim()
    .withMessage('File type must be a string')
];

// Validation for SLA settings
const slaValidation = [
  body('responseTime')
    .isInt({ min: 1 })
    .withMessage('Response time must be a positive number (hours)'),
  
  body('resolutionTime')
    .isInt({ min: 1 })
    .withMessage('Resolution time must be a positive number (hours)')
];

module.exports = {
  createSupportTicketValidation,
  updateSupportTicketValidation,
  addConversationValidation,
  updateTicketStatusValidation,
  assignTicketValidation,
  addSatisfactionRatingValidation,
  attachmentValidation,
  slaValidation
};
