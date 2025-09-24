const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    index: true
  },
  phone: {
    type: String,
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  dateOfBirth: Date,
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
  },
  avatar: {
    type: String,
    default: null
  },
  customerCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    index: true
  },
  type: {
    type: String,
    enum: ['individual', 'business'],
    default: 'individual'
  },
  businessInfo: {
    companyName: String,
    taxId: String,
    registrationNumber: String,
    website: String
  },
  address: {
    billing: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    },
    shipping: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      isSameAsBilling: {
        type: Boolean,
        default: true
      }
    }
  },
  wallet: {
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Wallet balance cannot be negative']
    },
    currency: {
      type: String,
      default: 'USD'
    },
    transactions: [{
      type: {
        type: String,
        enum: ['credit', 'debit'],
        required: true
      },
      amount: {
        type: Number,
        required: true
      },
      description: String,
      reference: String,
      date: {
        type: Date,
        default: Date.now
      }
    }]
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    marketing: {
      email: { type: Boolean, default: false },
      sms: { type: Boolean, default: false }
    }
  },
  loyalty: {
    points: {
      type: Number,
      default: 0,
      min: [0, 'Loyalty points cannot be negative']
    },
    tier: {
      type: String,
      enum: ['bronze', 'silver', 'gold', 'platinum'],
      default: 'bronze'
    },
    joinDate: {
      type: Date,
      default: Date.now
    }
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  paymentTerms: {
    type: Number,
    default: 0, // Days
    min: [0, 'Payment terms cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastPurchase: Date,
  totalPurchases: {
    count: {
      type: Number,
      default: 0
    },
    amount: {
      type: Number,
      default: 0
    }
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

// Virtual for full name
customerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for customer lifetime value
customerSchema.virtual('lifetimeValue').get(function() {
  return this.totalPurchases.amount;
});

// Indexes
customerSchema.index({ phone: 1 });
customerSchema.index({ 'loyalty.tier': 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ lastName: 1, firstName: 1 });

// Pre-save middleware to generate customer code
customerSchema.pre('save', async function(next) {
  if (this.isNew && !this.customerCode) {
    const count = await this.constructor.countDocuments();
    this.customerCode = `CUST${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Method to add wallet transaction
customerSchema.methods.addWalletTransaction = function(type, amount, description, reference) {
  this.wallet.transactions.push({
    type,
    amount,
    description,
    reference,
    date: new Date()
  });
  
  if (type === 'credit') {
    this.wallet.balance += amount;
  } else {
    this.wallet.balance -= amount;
  }
  
  return this.save();
};

// Method to update purchase statistics
customerSchema.methods.updatePurchaseStats = function(amount) {
  this.totalPurchases.count += 1;
  this.totalPurchases.amount += amount;
  this.lastPurchase = new Date();
  
  // Update loyalty points (example: 1 point per dollar spent)
  this.loyalty.points += Math.floor(amount);
  
  // Update tier based on total purchases
  if (this.totalPurchases.amount >= 10000) {
    this.loyalty.tier = 'platinum';
  } else if (this.totalPurchases.amount >= 5000) {
    this.loyalty.tier = 'gold';
  } else if (this.totalPurchases.amount >= 1000) {
    this.loyalty.tier = 'silver';
  }
  
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
