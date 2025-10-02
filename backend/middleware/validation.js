const { validationResult } = require('express-validator');

/**
 * Middleware to handle validation results
 * This middleware checks for validation errors and returns them if found
 * Otherwise, it calls next() to continue to the route handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Format errors for better readability
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
      location: error.location
    }));

    // Create a more descriptive message
    const errorMessages = formattedErrors.map(err => `${err.field}: ${err.message}`).join(', ');
    
    return res.status(400).json({
      success: false,
      message: `Validation failed: ${errorMessages}`,
      errors: formattedErrors,
      details: errors.array()
    });
  }
  
  next();
};

/**
 * Middleware factory to wrap validation arrays with error handling
 * This creates a middleware that includes validation rules + error handling
 * 
 * @param {Array} validations - Array of express-validator rules
 * @returns {Array} - Array of middleware functions including validation and error handling
 */
const validate = (validations) => {
  // If used directly as an Express middleware (misused without args),
  // treat this call as the error handler to keep routes from crashing.
  if (
    arguments.length === 3 &&
    validations &&
    typeof validations === 'object' &&
    typeof validations.method === 'string' &&
    typeof validations.url === 'string'
  ) {
    // Called as validate(req, res, next)
    return handleValidationErrors(validations, arguments[1], arguments[2]);
  }

  // Support passing a single validator function or an array of validators
  if (!validations) {
    return [handleValidationErrors];
  }

  if (Array.isArray(validations)) {
    return [...validations, handleValidationErrors];
  }

  if (typeof validations === 'function') {
    return [validations, handleValidationErrors];
  }

  // Fallback: unknown type; just return error handler to avoid runtime errors
  return [handleValidationErrors];
};

/**
 * Async middleware factory for custom validation functions
 * This allows you to create custom validation logic that can be async
 * 
 * @param {Function} validationFn - Async validation function
 * @returns {Function} - Express middleware function
 */
const asyncValidate = (validationFn) => {
  return async (req, res, next) => {
    try {
      await validationFn(req, res, next);
      next();
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${error.message}`,
        error: error.message,
        details: error
      });
    }
  };
};

/**
 * Middleware to validate MongoDB ObjectId parameters
 * This checks if the provided ID is a valid MongoDB ObjectId
 * 
 * @param {String} paramName - Name of the parameter to validate (default: 'id')
 * @returns {Function} - Express middleware function
 */
const validateObjectId = (paramName = 'id') => {
  return (req, res, next) => {
    const id = req.params[paramName];
    
    if (!id) {
      return res.status(400).json({
        success: false,
        message: `${paramName} parameter is required`
      });
    }
    
    // Check if it's a valid MongoDB ObjectId format
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    if (!objectIdRegex.test(id)) {
      return res.status(400).json({
        success: false,
        message: `Invalid ${paramName} format`
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate query parameters
 * This checks if required query parameters are present and valid
 * 
 * @param {Array} requiredParams - Array of required parameter names
 * @param {Object} validations - Object with parameter-specific validation rules
 * @returns {Function} - Express middleware function
 */
const validateQueryParams = (requiredParams = [], validations = {}) => {
  return (req, res, next) => {
    const errors = [];
    
    // Check required parameters
    requiredParams.forEach(param => {
      if (!req.query[param]) {
        errors.push({
          param,
          message: `${param} query parameter is required`
        });
      }
    });
    
    // Apply custom validations
    Object.keys(validations).forEach(param => {
      const value = req.query[param];
      const rules = validations[param];
      
      if (value) {
        rules.forEach(rule => {
          if (!rule(value)) {
            errors.push({
              param,
              message: `Invalid ${param} value`
            });
          }
        });
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Query validation failed',
        errors
      });
    }
    
    next();
  };
};

/**
 * Middleware to validate pagination parameters
 * This ensures page and limit parameters are valid for pagination
 * 
 * @param {Number} defaultLimit - Default limit if not provided
 * @param {Number} maxLimit - Maximum allowed limit
 * @returns {Function} - Express middleware function
 */
const validatePagination = (defaultLimit = 10, maxLimit = 100) => {
  return (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || defaultLimit;
    
    if (page < 1) {
      return res.status(400).json({
        success: false,
        message: 'Page must be greater than 0'
      });
    }
    
    if (limit < 1 || limit > maxLimit) {
      return res.status(400).json({
        success: false,
        message: `Limit must be between 1 and ${maxLimit}`
      });
    }
    
    // Add validated pagination to request object
    req.pagination = { page, limit };
    next();
  };
};

/**
 * Middleware to validate date range parameters
 * This ensures startDate and endDate are valid dates and startDate <= endDate
 * 
 * @returns {Function} - Express middleware function
 */
const validateDateRange = () => {
  return (req, res, next) => {
    const { startDate, endDate } = req.query;
    
    if (startDate) {
      const start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid startDate format'
        });
      }
      req.query.startDate = start;
    }
    
    if (endDate) {
      const end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid endDate format'
        });
      }
      req.query.endDate = end;
    }
    
    if (startDate && endDate && req.query.startDate > req.query.endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate must be before or equal to endDate'
      });
    }
    
    next();
  };
};

/**
 * Middleware to sanitize and validate search parameters
 * This cleans up search parameters and validates them
 * 
 * @param {Array} allowedFields - Array of allowed search fields
 * @returns {Function} - Express middleware function
 */
const validateSearch = (allowedFields = []) => {
  return (req, res, next) => {
    const { search, ...otherParams } = req.query;
    
    if (search) {
      // Sanitize search parameter
      const sanitizedSearch = search.trim().replace(/[<>]/g, '');
      
      if (sanitizedSearch.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'Search term must be at least 2 characters long'
        });
      }
      
      req.query.search = sanitizedSearch;
    }
    
    // Validate other parameters against allowed fields
    if (allowedFields.length > 0) {
      const invalidParams = Object.keys(otherParams).filter(
        param => !allowedFields.includes(param)
      );
      
      if (invalidParams.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid query parameters: ${invalidParams.join(', ')}`,
          allowedParams: allowedFields
        });
      }
    }
    
    next();
  };
};

module.exports = {
  validate,
  asyncValidate,
  validateObjectId,
  validateQueryParams,
  validatePagination,
  validateDateRange,
  validateSearch,
  handleValidationErrors
};
