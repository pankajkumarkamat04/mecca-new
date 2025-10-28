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
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    trim: true,
    unique: true,
    sparse: true,
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
    trim: true
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
  taxSettings: {
    isTaxExempt: {
      type: Boolean,
      default: false
    },
    taxExemptionReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Tax exemption reason cannot exceed 200 characters']
    },
    taxExemptionNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax exemption number cannot exceed 50 characters']
    },
    taxExemptionExpiry: Date
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
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
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

// Virtual for company name (from businessInfo)
customerSchema.virtual('company').get(function() {
  return this.businessInfo?.companyName || '';
});

// Virtual for customer lifetime value
customerSchema.virtual('lifetimeValue').get(function() {
  return this.totalPurchases.amount;
});

// Indexes
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


// Method to update purchase statistics
customerSchema.methods.updatePurchaseStats = function(amount) {
  this.totalPurchases.count += 1;
  this.totalPurchases.amount += amount;
  this.lastPurchase = new Date();
  
  
  return this.save();
};

module.exports = mongoose.model('Customer', customerSchema);
