const { body, param, query } = require('express-validator');

// Validation for creating a new transaction
const createTransactionValidation = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Transaction date must be a valid ISO 8601 date'),
  
  body('description')
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),
  
  body('type')
    .isIn(['sale', 'purchase', 'payment', 'receipt', 'expense', 'income', 'transfer', 'adjustment', 'journal'])
    .withMessage('Invalid transaction type'),
  
  body('reference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters')
    .trim(),
  
  body('referenceId')
    .optional()
    .isMongoId()
    .withMessage('Valid reference ID is required'),
  
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('entries')
    .isArray({ min: 2 })
    .withMessage('Transaction must have at least 2 entries'),
  
  body('entries.*.account')
    .isMongoId()
    .withMessage('Valid account ID is required for each entry'),
  
  body('entries.*.debit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Debit amount must be a positive number'),
  
  body('entries.*.credit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit amount must be a positive number'),
  
  body('entries.*.description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Entry description cannot exceed 200 characters')
    .trim(),
  
  // Custom validation to ensure at least one debit and one credit
  body('entries').custom((entries) => {
    let totalDebit = 0;
    let totalCredit = 0;
    
    entries.forEach((entry, index) => {
      const debit = entry.debit || 0;
      const credit = entry.credit || 0;
      
      if (debit > 0 && credit > 0) {
        throw new Error(`Entry ${index + 1}: Cannot have both debit and credit amounts`);
      }
      
      if (debit === 0 && credit === 0) {
        throw new Error(`Entry ${index + 1}: Must have either debit or credit amount`);
      }
      
      totalDebit += debit;
      totalCredit += credit;
    });
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new Error('Total debit and credit amounts must be equal');
    }
    
    return true;
  }),
  
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('supplier')
    .optional()
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  
  body('invoice')
    .optional()
    .isMongoId()
    .withMessage('Valid invoice ID is required'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'other'])
    .withMessage('Invalid payment method'),
  
  body('bankAccount.accountNumber')
    .optional()
    .isString()
    .trim()
    .withMessage('Account number must be a string'),
  
  body('bankAccount.bankName')
    .optional()
    .isString()
    .trim()
    .withMessage('Bank name must be a string'),
  
  body('bankAccount.routingNumber')
    .optional()
    .isString()
    .trim()
    .withMessage('Routing number must be a string'),
  
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'approved', 'rejected', 'posted'])
    .withMessage('Invalid transaction status'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
    .trim()
];

// Validation for updating a transaction
const updateTransactionValidation = [
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Transaction date must be a valid ISO 8601 date'),
  
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
    .trim(),
  
  body('type')
    .optional()
    .isIn(['sale', 'purchase', 'payment', 'receipt', 'expense', 'income', 'transfer', 'adjustment', 'journal'])
    .withMessage('Invalid transaction type'),
  
  body('reference')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters')
    .trim(),
  
  body('referenceId')
    .optional()
    .isMongoId()
    .withMessage('Valid reference ID is required'),
  
  body('amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  
  body('currency')
    .optional()
    .isLength({ min: 3, max: 3 })
    .withMessage('Currency must be a 3-letter code'),
  
  body('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  body('supplier')
    .optional()
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  
  body('invoice')
    .optional()
    .isMongoId()
    .withMessage('Valid invoice ID is required'),
  
  body('paymentMethod')
    .optional()
    .isIn(['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'other'])
    .withMessage('Invalid payment method'),
  
  body('status')
    .optional()
    .isIn(['draft', 'pending', 'approved', 'rejected', 'posted'])
    .withMessage('Invalid transaction status'),
  
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
    .trim()
];

// Validation for adding transaction entry
const addTransactionEntryValidation = [
  body('account')
    .isMongoId()
    .withMessage('Valid account ID is required'),
  
  body('debit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Debit amount must be a positive number'),
  
  body('credit')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Credit amount must be a positive number'),
  
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Entry description cannot exceed 200 characters')
    .trim(),
  
  body().custom((body) => {
    const debit = body.debit || 0;
    const credit = body.credit || 0;
    
    if (debit > 0 && credit > 0) {
      throw new Error('Cannot have both debit and credit amounts');
    }
    
    if (debit === 0 && credit === 0) {
      throw new Error('Must have either debit or credit amount');
    }
    
    return true;
  })
];

// Validation for transaction query filters
const getTransactionsValidation = [
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
    .withMessage('Invalid transaction status'),
  
  query('customer')
    .optional()
    .isMongoId()
    .withMessage('Valid customer ID is required'),
  
  query('supplier')
    .optional()
    .isMongoId()
    .withMessage('Valid supplier ID is required'),
  
  query('invoice')
    .optional()
    .isMongoId()
    .withMessage('Valid invoice ID is required')
];

// Validation for transaction statistics query
const getTransactionStatsValidation = [
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
    })
];

module.exports = {
  createTransactionValidation,
  updateTransactionValidation,
  addTransactionEntryValidation,
  getTransactionsValidation,
  getTransactionStatsValidation
};
