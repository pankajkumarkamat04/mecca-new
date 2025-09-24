const { body, param, query } = require('express-validator');

// Validation for creating a new project
const createProjectValidation = [
  body('name')
    .notEmpty()
    .withMessage('Project name is required')
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .trim(),
  
  body('customer')
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('projectManager')
    .isMongoId()
    .withMessage('Valid project manager ID is required'),
  
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('budget.estimated')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated budget must be a positive number'),
  
  body('budget.actual')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual budget must be a positive number'),
  
  body('budget.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('timeline.startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('timeline.endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (req.body.timeline?.startDate && new Date(endDate) <= new Date(req.body.timeline.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  
  body('timeline.estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  
  body('team')
    .optional()
    .isArray()
    .withMessage('Team must be an array'),
  
  body('team.*.user')
    .optional()
    .isMongoId()
    .withMessage('Valid user ID is required for team member'),
  
  body('team.*.role')
    .optional()
    .isIn(['developer', 'designer', 'tester', 'analyst', 'other'])
    .withMessage('Invalid team member role'),
  
  body('team.*.hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number')
];

// Validation for updating a project
const updateProjectValidation = [
  body('name')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Project name cannot exceed 100 characters')
    .trim(),
  
  body('description')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters')
    .trim(),
  
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('projectManager')
    .optional()
    .isMongoId()
    .withMessage('Valid project manager ID is required'),
  
  body('status')
    .optional()
    .isIn(['planning', 'active', 'on_hold', 'completed', 'cancelled'])
    .withMessage('Invalid project status'),
  
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority level'),
  
  body('budget.estimated')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated budget must be a positive number'),
  
  body('budget.actual')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual budget must be a positive number'),
  
  body('budget.currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('timeline.startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  
  body('timeline.endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid date'),
  
  body('timeline.estimatedHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Estimated hours must be a positive number'),
  
  body('timeline.actualHours')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Actual hours must be a positive number')
];

// Validation for updating project progress
const updateProgressValidation = [
  body('percentage')
    .isFloat({ min: 0, max: 100 })
    .withMessage('Progress percentage must be between 0 and 100'),
  
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
    .trim()
];

// Validation for adding team member
const addTeamMemberValidation = [
  body('user')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  
  body('role')
    .isIn(['developer', 'designer', 'tester', 'analyst', 'other'])
    .withMessage('Invalid team member role'),
  
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number')
];

// Validation for milestone
const milestoneValidation = [
  body('name')
    .notEmpty()
    .withMessage('Milestone name is required')
    .trim(),
  
  body('description')
    .optional()
    .trim(),
  
  body('dueDate')
    .isISO8601()
    .withMessage('Due date must be a valid date'),
  
  body('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'overdue'])
    .withMessage('Invalid milestone status'),
  
  body('deliverables')
    .optional()
    .isArray()
    .withMessage('Deliverables must be an array')
];

// Validation for document upload
const documentValidation = [
  body('name')
    .notEmpty()
    .withMessage('Document name is required')
    .trim(),
  
  body('url')
    .isURL()
    .withMessage('Valid document URL is required'),
  
  body('type')
    .optional()
    .isIn(['contract', 'specification', 'design', 'report', 'other'])
    .withMessage('Invalid document type')
];

module.exports = {
  createProjectValidation,
  updateProjectValidation,
  updateProgressValidation,
  addTeamMemberValidation,
  milestoneValidation,
  documentValidation
};
