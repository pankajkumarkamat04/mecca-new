const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'payment', 'receipt', 'expense', 'income', 'transfer', 'adjustment', 'journal'],
    required: [true, 'Transaction type is required']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: [3, 'Currency must be a 3-letter code']
  },
  entries: [{
    account: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account',
      required: true
    },
    debit: {
      type: Number,
      default: 0,
      min: [0, 'Debit amount cannot be negative']
    },
    credit: {
      type: Number,
      default: 0,
      min: [0, 'Credit amount cannot be negative']
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Entry description cannot exceed 200 characters']
    }
  }],
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'check', 'credit_card', 'debit_card', 'other'],
    default: 'cash'
  },
  bankAccount: {
    accountNumber: String,
    bankName: String,
    routingNumber: String
  },
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    size: Number,
    type: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'posted'],
    default: 'draft'
  },
  isReconciled: {
    type: Boolean,
    default: false
  },
  reconciledAt: Date,
  reconciledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for transaction status color
transactionSchema.virtual('statusColor').get(function() {
  const statusColors = {
    'draft': 'gray',
    'pending': 'yellow',
    'approved': 'blue',
    'rejected': 'red',
    'posted': 'green'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for transaction type color
transactionSchema.virtual('typeColor').get(function() {
  const typeColors = {
    'sale': 'green',
    'purchase': 'red',
    'payment': 'blue',
    'receipt': 'green',
    'expense': 'orange',
    'income': 'purple',
    'transfer': 'blue',
    'adjustment': 'yellow',
    'journal': 'gray'
  };
  return typeColors[this.type] || 'gray';
});

// Virtual for total debit
transactionSchema.virtual('totalDebit').get(function() {
  return this.entries.reduce((total, entry) => total + entry.debit, 0);
});

// Virtual for total credit
transactionSchema.virtual('totalCredit').get(function() {
  return this.entries.reduce((total, entry) => total + entry.credit, 0);
});

// Virtual for balance check
transactionSchema.virtual('isBalanced').get(function() {
  return Math.abs(this.totalDebit - this.totalCredit) < 0.01; // Allow for small rounding differences
});

// Indexes
transactionSchema.index({ date: -1 });
transactionSchema.index({ type: 1 });
transactionSchema.index({ status: 1 });
transactionSchema.index({ referenceId: 1 });
transactionSchema.index({ customer: 1 });
transactionSchema.index({ supplier: 1 });
transactionSchema.index({ invoice: 1 });
transactionSchema.index({ 'entries.account': 1 });
transactionSchema.index({ isReconciled: 1 });

// Pre-save middleware to generate transaction number
transactionSchema.pre('save', async function(next) {
  if (this.isNew && !this.transactionNumber) {
    const count = await this.constructor.countDocuments();
    const prefix = this.type.toUpperCase().substring(0, 3);
    this.transactionNumber = `${prefix}${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Pre-save middleware to validate double-entry
transactionSchema.pre('save', function(next) {
  if (this.entries && this.entries.length > 0) {
    const totalDebit = this.totalDebit;
    const totalCredit = this.totalCredit;
    
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      return next(new Error('Transaction is not balanced. Total debit and credit must be equal.'));
    }
  }
  next();
});

// Method to add entry
transactionSchema.methods.addEntry = function(entryData) {
  this.entries.push(entryData);
  return this.save();
};

// Method to approve transaction
transactionSchema.methods.approve = function(userId) {
  this.status = 'approved';
  this.approvedBy = userId;
  this.approvedAt = new Date();
  return this.save();
};

// Method to post transaction
transactionSchema.methods.post = async function() {
  if (this.status !== 'approved') {
    throw new Error('Transaction must be approved before posting');
  }
  
  if (!this.isBalanced) {
    throw new Error('Transaction is not balanced');
  }
  
  // Update account balances
  for (const entry of this.entries) {
    const account = await this.model('Account').findById(entry.account);
    if (account) {
      account.currentBalance += entry.debit - entry.credit;
      await account.save();
    }
  }
  
  this.status = 'posted';
  return this.save();
};

// Method to reconcile transaction
transactionSchema.methods.reconcile = function(userId) {
  this.isReconciled = true;
  this.reconciledAt = new Date();
  this.reconciledBy = userId;
  return this.save();
};

// Static method to get transactions by account
transactionSchema.statics.getTransactionsByAccount = function(accountId, options = {}) {
  const filter = { 'entries.account': accountId };
  
  if (options.startDate) filter.date = { ...filter.date, $gte: new Date(options.startDate) };
  if (options.endDate) filter.date = { ...filter.date, $lte: new Date(options.endDate) };
  if (options.type) filter.type = options.type;
  if (options.status) filter.status = options.status;
  
  return this.find(filter)
    .populate('entries.account', 'name code type')
    .populate('customer', 'firstName lastName')
    .populate('supplier', 'name')
    .populate('createdBy', 'firstName lastName')
    .sort({ date: -1 });
};

// Static method to get account balance
transactionSchema.statics.getAccountBalance = async function(accountId, asOfDate = new Date()) {
  const transactions = await this.find({
    'entries.account': accountId,
    date: { $lte: asOfDate },
    status: 'posted'
  });
  
  let balance = 0;
  for (const transaction of transactions) {
    const entry = transaction.entries.find(e => e.account.toString() === accountId.toString());
    if (entry) {
      balance += entry.debit - entry.credit;
    }
  }
  
  return balance;
};

module.exports = mongoose.model('Transaction', transactionSchema);