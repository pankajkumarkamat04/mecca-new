const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  code: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Account code cannot exceed 20 characters']
  },
  type: {
    type: String,
    enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
    required: [true, 'Account type is required']
  },
  category: {
    type: String,
    required: [true, 'Account category is required'],
    trim: true,
    maxlength: [50, 'Account category cannot exceed 50 characters']
  },
  parentAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: [3, 'Currency must be a 3-letter code']
  },
  openingBalance: {
    type: Number,
    default: 0
  },
  currentBalance: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isSystemAccount: {
    type: Boolean,
    default: false
  },
  settings: {
    allowNegativeBalance: {
      type: Boolean,
      default: false
    },
    requireApproval: {
      type: Boolean,
      default: false
    },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for account path
accountSchema.virtual('accountPath').get(function() {
  // This would be populated with the full account hierarchy
  return this.code || this.name;
});

// Virtual for account type color
accountSchema.virtual('typeColor').get(function() {
  const typeColors = {
    'asset': 'green',
    'liability': 'red',
    'equity': 'blue',
    'revenue': 'purple',
    'expense': 'orange'
  };
  return typeColors[this.type] || 'gray';
});

// Indexes
accountSchema.index({ name: 'text', description: 'text' });
accountSchema.index({ type: 1 });
accountSchema.index({ category: 1 });
accountSchema.index({ parentAccount: 1 });
accountSchema.index({ isActive: 1 });
accountSchema.index({ isSystemAccount: 1 });

// Pre-save middleware to generate account code
accountSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    const count = await this.constructor.countDocuments();
    const prefix = this.type.toUpperCase().substring(0, 3);
    this.code = `${prefix}${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Method to update balance
accountSchema.methods.updateBalance = function(amount, operation = 'add') {
  if (operation === 'add') {
    this.currentBalance += amount;
  } else if (operation === 'subtract') {
    this.currentBalance -= amount;
  } else if (operation === 'set') {
    this.currentBalance = amount;
  }
  
  return this.save();
};

// Method to check if balance can be negative
accountSchema.methods.canHaveNegativeBalance = function() {
  return this.settings.allowNegativeBalance;
};

// Static method to get accounts by type
accountSchema.statics.getAccountsByType = function(type, options = {}) {
  const filter = { type, isActive: true };
  
  if (options.category) filter.category = options.category;
  if (options.parentAccount) filter.parentAccount = options.parentAccount;
  
  return this.find(filter)
    .populate('parentAccount', 'name code')
    .sort({ code: 1 });
};

// Static method to get chart of accounts
accountSchema.statics.getChartOfAccounts = function() {
  return this.find({ isActive: true })
    .populate('parentAccount', 'name code')
    .sort({ type: 1, code: 1 });
};

module.exports = mongoose.model('Account', accountSchema);
