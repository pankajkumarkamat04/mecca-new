const { body, param, query } = require('express-validator');

// Validation for creating a new task
const createTaskValidation = [
  body('title')
    .notEmpty()
    .withMessage('Task title is required')
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters')
    .trim(),
  
  body('project')
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('assignee')
    .isMongoId()
    .withMessage('Valid assignee ID is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('type')
    .optional()
    .isIn(['bug', 'feature', 'improvement', 'task', 'epic'])
    .withMessage('Invalid task type'),
  
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('tags.*')
    .optional()
    .isString()
    .trim()
    .withMessage('Each tag must be a string'),
  
  body('customerVisible')
    .optional()
    .isBoolean()
    .withMessage('Customer visible must be a boolean')
];

// Validation for updating a task
const updateTaskValidation = [
  body('title')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Task title cannot exceed 200 characters')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters')
    .trim(),
  
  body('project')
    .optional()
    .isMongoId()
    .withMessage('Valid project ID is required'),
  
  body('assignee')
    .optional()
    .isMongoId()
    .withMessage('Valid assignee ID is required'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('status')
    .optional()
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Invalid task status'),
  
  body('type')
    .optional()
    .isIn(['bug', 'feature', 'improvement', 'task', 'epic'])
    .withMessage('Invalid task type'),
  
  body('estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  
  body('dueDate')
    .optional()
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  
  body('customerVisible')
    .optional()
    .isBoolean()
    .withMessage('Customer visible must be a boolean')
];

// Validation for adding a comment
const addCommentValidation = [
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .isLength({ max: 1000 })
    .withMessage('Comment cannot exceed 1000 characters')
    .trim(),
  
  body('isInternal')
    .optional()
    .isBoolean()
    .withMessage('Internal flag must be a boolean')
];

// Validation for adding time log
const addTimeLogValidation = [
  body('startTime')
    .isISO8601()
    .withMessage('Start time must be a valid date'),
  
  body('endTime')
    .isISO8601()
    .withMessage('End time must be a valid date')
    .custom((endTime, { req }) => {
      if (req.body.startTime && new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Time log description cannot exceed 500 characters')
    .trim(),
  
  body('isBillable')
    .optional()
    .isBoolean()
    .withMessage('Billable flag must be a boolean'),
  
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number')
];

// Validation for updating task status
const updateTaskStatusValidation = [
  body('status')
    .isIn(['todo', 'in_progress', 'review', 'completed', 'cancelled'])
    .withMessage('Invalid task status')
];

// Validation for adding dependency
const addDependencyValidation = [
  body('task')
    .isMongoId()
    .withMessage('Valid task ID is required'),
  
  body('type')
    .isIn(['blocks', 'blocked_by', 'related'])
    .withMessage('Invalid dependency type')
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
    .isIn(['image', 'document', 'video', 'other'])
    .withMessage('Invalid attachment type')
];

module.exports = {
  createTaskValidation,
  updateTaskValidation,
  addCommentValidation,
  addTimeLogValidation,
  updateTaskStatusValidation,
  addDependencyValidation,
  attachmentValidation
};
