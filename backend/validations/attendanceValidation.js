const { body, param } = require('express-validator');

// Check-in validation
const checkInValidation = [
  body('employeeId')
    .isMongoId()
    .withMessage('Valid employee ID is required'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('location.latitude')
    .optional()
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  
  body('location.longitude')
    .optional()
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Check-out validation
const checkOutValidation = [
  body('employeeId')
    .isMongoId()
    .withMessage('Valid employee ID is required'),
  
  body('location')
    .optional()
    .isObject()
    .withMessage('Location must be an object'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Add break validation
const addBreakValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid attendance ID'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Valid start time is required'),
  
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('Valid end time is required'),
  
  body('type')
    .optional()
    .isIn(['lunch', 'coffee', 'personal', 'other'])
    .withMessage('Invalid break type'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Notes cannot exceed 200 characters')
];

// Update attendance validation
const updateAttendanceValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid attendance ID'),
  
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'half_day', 'sick', 'vacation', 'holiday'])
    .withMessage('Invalid attendance status'),
  
  body('checkIn.time')
    .optional()
    .isISO8601()
    .withMessage('Valid check-in time is required'),
  
  body('checkOut.time')
    .optional()
    .isISO8601()
    .withMessage('Valid check-out time is required'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Approve attendance validation
const approveAttendanceValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid attendance ID'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Get employee attendance summary validation
const getEmployeeAttendanceSummaryValidation = [
  param('employeeId')
    .isMongoId()
    .withMessage('Invalid employee ID'),
  
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Valid start date is required'),
  
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('Valid end date is required')
];

module.exports = {
  checkInValidation,
  checkOutValidation,
  addBreakValidation,
  updateAttendanceValidation,
  approveAttendanceValidation,
  getEmployeeAttendanceSummaryValidation
};
