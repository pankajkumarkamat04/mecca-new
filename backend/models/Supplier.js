const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
    maxlength: [100, 'Supplier name cannot exceed 100 characters']
  },
  code: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Supplier code cannot exceed 20 characters'],
    index: true
  },
  contactPerson: {
    firstName: String,
    lastName: String,
    email: {
      type: String,
      lowercase: true,
      trim: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
    }
  },
  businessInfo: {
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [100, 'Company name cannot exceed 100 characters']
    },
    taxId: {
      type: String,
      trim: true,
      maxlength: [50, 'Tax ID cannot exceed 50 characters']
    },
    registrationNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Registration number cannot exceed 50 characters']
    },
    website: {
      type: String,
      trim: true,
      validate: {
        validator: function(v) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: 'Website must be a valid URL'
      }
    }
  },
  address: {
    street: {
      type: String,
      required: [true, 'Street address is required'],
      trim: true,
      maxlength: [100, 'Street address cannot exceed 100 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [50, 'City cannot exceed 50 characters']
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [50, 'State cannot exceed 50 characters']
    },
    zipCode: {
      type: String,
      required: [true, 'ZIP code is required'],
      trim: true,
      maxlength: [10, 'ZIP code cannot exceed 10 characters']
    },
    country: {
      type: String,
      required: [true, 'Country is required'],
      trim: true,
      maxlength: [50, 'Country cannot exceed 50 characters'],
      default: 'US'
    }
  },
  paymentTerms: {
    type: Number,
    default: 30, // Days
    min: [0, 'Payment terms cannot be negative']
  },
  creditLimit: {
    type: Number,
    default: 0,
    min: [0, 'Credit limit cannot be negative']
  },
  currency: {
    type: String,
    default: 'USD',
    maxlength: [3, 'Currency must be a 3-letter code']
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5,
    default: 3
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
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
  lastPurchase: Date,
  isActive: {
    type: Boolean,
    default: true
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

// Virtual for full contact person name
supplierSchema.virtual('contactPerson.fullName').get(function() {
  return `${this.contactPerson.firstName} ${this.contactPerson.lastName}`;
});

// Virtual for supplier address string
supplierSchema.virtual('addressString').get(function() {
  const addr = this.address;
  return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`;
});

// Virtual for supplier lifetime value
supplierSchema.virtual('lifetimeValue').get(function() {
  return this.totalPurchases.amount;
});

// Indexes
supplierSchema.index({ name: 'text', 'businessInfo.companyName': 'text' });
supplierSchema.index({ 'contactPerson.email': 1 });
supplierSchema.index({ status: 1 });
supplierSchema.index({ isActive: 1 });
supplierSchema.index({ 'address.city': 1, 'address.state': 1 });

// Pre-save middleware to generate supplier code
supplierSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    const count = await this.constructor.countDocuments();
    this.code = `SUP${(count + 1).toString().padStart(4, '0')}`;
  }
  next();
});

// Method to update purchase statistics
supplierSchema.methods.updatePurchaseStats = function(amount) {
  this.totalPurchases.count += 1;
  this.totalPurchases.amount += amount;
  this.lastPurchase = new Date();
  
  // Update rating based on recent purchases (simple logic)
  if (this.totalPurchases.count > 10 && this.totalPurchases.amount > 10000) {
    this.rating = Math.min(5, this.rating + 0.1);
  }
  
  return this.save();
};

module.exports = mongoose.model('Supplier', supplierSchema);
