const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
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
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    unique: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'employee', 'customer', 'warehouse_manager', 'warehouse_employee'],
    default: 'customer'
  },
  avatar: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  permissions: [{
    module: String,
    actions: [String]
  }],
  wallet: {
    balance: {
      type: Number,
      default: 0
    },
    currency: {
      type: String,
      default: 'USD'
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    }
  },
  salary: {
    amount: Number,
    currency: String,
    paymentType: {
      type: String,
      enum: ['monthly', 'weekly', 'daily', 'hourly'],
      default: 'monthly'
    }
  },
  hireDate: Date,
  department: String,
  position: String,
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  warehouse: {
    assignedWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null
    },
    warehousePosition: {
      type: String,
      enum: ['warehouse_manager', 'warehouse_employee'],
      default: null
    },
    assignedAt: {
      type: Date,
      default: null
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Index for better query performance
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Check if user is warehouse manager
userSchema.methods.isWarehouseManager = function() {
  return this.role === 'warehouse_manager' || this.warehouse.warehousePosition === 'warehouse_manager';
};

// Check if user is warehouse employee
userSchema.methods.isWarehouseEmployee = function() {
  return ['warehouse_manager', 'warehouse_employee'].includes(this.role) ||
         ['warehouse_manager', 'warehouse_employee'].includes(this.warehouse.warehousePosition);
};

// Assign user to warehouse
userSchema.methods.assignToWarehouse = function(warehouseId, position, assignedBy) {
  this.warehouse.assignedWarehouse = warehouseId;
  this.warehouse.warehousePosition = position;
  this.warehouse.assignedAt = new Date();
  this.warehouse.assignedBy = assignedBy;
  this.role = position; // Update role to match warehouse position
  return this.save();
};

// Remove user from warehouse
userSchema.methods.removeFromWarehouse = function() {
  this.warehouse.assignedWarehouse = null;
  this.warehouse.warehousePosition = null;
  this.warehouse.assignedAt = null;
  this.warehouse.assignedBy = null;
  this.role = 'employee'; // Default role when removed from warehouse
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
