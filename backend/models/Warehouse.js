const mongoose = require('mongoose');

const warehouseLocationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Location name is required'],
    trim: true
  },
  code: {
    type: String,
    required: [true, 'Location code is required'],
    uppercase: true,
    trim: true
  },
  zone: {
    type: String,
    required: [true, 'Zone is required'],
    trim: true
  },
  aisle: String,
  shelf: String,
  bin: String,
  capacity: {
    type: Number,
    min: [0, 'Capacity cannot be negative']
  },
  currentOccupancy: {
    type: Number,
    default: 0,
    min: [0, 'Current occupancy cannot be negative']
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const warehouseSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Warehouse name is required'],
    trim: true,
    maxlength: [200, 'Warehouse name cannot exceed 200 characters']
  },
  code: {
    type: String,
    required: [true, 'Warehouse code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    maxlength: [20, 'Warehouse code cannot exceed 20 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  contact: {
    phone: String,
    email: String,
    manager: {
      name: String,
      phone: String,
      email: String
    }
  },
  manager: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false
  },
  employees: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: {
      type: String,
      required: true,
      enum: ['warehouse_employee']
    },
    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    assignedAt: {
      type: Date,
      default: Date.now
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  capacity: {
    totalCapacity: {
      type: Number,
      min: [0, 'Total capacity cannot be negative']
    },
    currentOccupancy: {
      type: Number,
      default: 0,
      min: [0, 'Current occupancy cannot be negative']
    },
    maxWeight: {
      type: Number,
      min: [0, 'Max weight cannot be negative']
    },
    currentWeight: {
      type: Number,
      default: 0,
      min: [0, 'Current weight cannot be negative']
    }
  },
  locations: [warehouseLocationSchema],
  operatingHours: {
    monday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    tuesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    wednesday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    thursday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    friday: { open: String, close: String, isOpen: { type: Boolean, default: true } },
    saturday: { open: String, close: String, isOpen: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isOpen: { type: Boolean, default: false } }
  },
  features: {
    hasRefrigeration: { type: Boolean, default: false },
    hasFreezer: { type: Boolean, default: false },
    hasHazardousStorage: { type: Boolean, default: false },
    hasSecurity: { type: Boolean, default: true },
    hasClimateControl: { type: Boolean, default: false }
  },
  settings: {
    autoAllocateLocation: { type: Boolean, default: true },
    requireLocationScan: { type: Boolean, default: false },
    allowNegativeStock: { type: Boolean, default: false },
    lowStockThreshold: { type: Number, default: 10 },
    reorderPoint: { type: Number, default: 5 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
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

// Virtual for capacity utilization percentage
warehouseSchema.virtual('capacityUtilization').get(function() {
  if (this.capacity.totalCapacity > 0) {
    return ((this.capacity.currentOccupancy / this.capacity.totalCapacity) * 100).toFixed(2);
  }
  return 0;
});

// Virtual for weight utilization percentage
warehouseSchema.virtual('weightUtilization').get(function() {
  if (this.capacity.maxWeight > 0) {
    return ((this.capacity.currentWeight / this.capacity.maxWeight) * 100).toFixed(2);
  }
  return 0;
});

// Virtual for location count
warehouseSchema.virtual('locationCount').get(function() {
  return Array.isArray(this.locations) ? this.locations.filter(loc => loc.isActive).length : 0;
});

// Virtual for available capacity
warehouseSchema.virtual('availableCapacity').get(function() {
  return Math.max(0, this.capacity.totalCapacity - this.capacity.currentOccupancy);
});

// Indexes (avoid duplicating unique indexes)
warehouseSchema.index({ name: 'text', description: 'text' });
warehouseSchema.index({ 'address.city': 1 });
warehouseSchema.index({ isActive: 1 });
warehouseSchema.index({ isDefault: 1 });

// Pre-save middleware to ensure only one default warehouse
warehouseSchema.pre('save', async function(next) {
  if (this.isDefault && this.isModified('isDefault')) {
    await this.constructor.updateMany(
      { _id: { $ne: this._id } },
      { $set: { isDefault: false } }
    );
  }
  next();
});

// Static method to get default warehouse
warehouseSchema.statics.getDefault = function() {
  return this.findOne({ isDefault: true, isActive: true });
};

// Static method to get warehouse statistics
warehouseSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalWarehouses: { $sum: 1 },
        activeWarehouses: {
          $sum: { $cond: ['$isActive', 1, 0] }
        },
        totalCapacity: { $sum: '$capacity.totalCapacity' },
        totalOccupancy: { $sum: '$capacity.currentOccupancy' },
        totalWeight: { $sum: '$capacity.currentWeight' },
        totalMaxWeight: { $sum: '$capacity.maxWeight' }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalWarehouses: 0,
      activeWarehouses: 0,
      totalCapacity: 0,
      totalOccupancy: 0,
      totalWeight: 0,
      totalMaxWeight: 0,
      capacityUtilization: 0,
      weightUtilization: 0
    };
  }

  const stat = stats[0];
  const capacityUtilization = stat.totalCapacity > 0 
    ? ((stat.totalOccupancy / stat.totalCapacity) * 100).toFixed(2)
    : 0;
  const weightUtilization = stat.totalMaxWeight > 0
    ? ((stat.totalWeight / stat.totalMaxWeight) * 100).toFixed(2)
    : 0;

  return {
    ...stat,
    capacityUtilization: parseFloat(capacityUtilization),
    weightUtilization: parseFloat(weightUtilization)
  };
};

// Instance method to add location
warehouseSchema.methods.addLocation = function(locationData) {
  this.locations.push(locationData);
  return this.save();
};

// Instance method to update location
warehouseSchema.methods.updateLocation = function(locationId, updateData) {
  const location = this.locations.id(locationId);
  if (location) {
    Object.assign(location, updateData);
    return this.save();
  }
  throw new Error('Location not found');
};

// Instance method to remove location
warehouseSchema.methods.removeLocation = function(locationId) {
  this.locations.pull(locationId);
  return this.save();
};

// Instance method to get available locations
warehouseSchema.methods.getAvailableLocations = function() {
  return this.locations.filter(loc => 
    loc.isActive && 
    (loc.capacity === undefined || loc.currentOccupancy < loc.capacity)
  );
};

// Instance method to add employee to warehouse
warehouseSchema.methods.addEmployee = function(employeeData) {
  // Check if employee is already assigned
  const existingEmployee = this.employees.find(emp => 
    emp.user.toString() === employeeData.user.toString() && emp.isActive
  );
  
  if (existingEmployee) {
    throw new Error('Employee is already assigned to this warehouse');
  }
  
  this.employees.push(employeeData);
  return this.save();
};

// Instance method to remove employee from warehouse
warehouseSchema.methods.removeEmployee = function(employeeId) {
  const employee = this.employees.id(employeeId);
  if (employee) {
    employee.isActive = false;
    return this.save();
  }
  throw new Error('Employee not found');
};

// Instance method to update employee position
warehouseSchema.methods.updateEmployeePosition = function(employeeId, newPosition) {
  const employee = this.employees.id(employeeId);
  if (employee) {
    employee.position = newPosition;
    return this.save();
  }
  throw new Error('Employee not found');
};

// Instance method to get active employees
warehouseSchema.methods.getActiveEmployees = function() {
  return this.employees.filter(emp => emp.isActive);
};

// Instance method to check if user is manager
warehouseSchema.methods.isManager = function(userId) {
  return this.manager && this.manager.toString() === userId.toString();
};

// Instance method to check if user is employee
warehouseSchema.methods.isEmployee = function(userId) {
  return this.employees.some(emp => 
    emp.user.toString() === userId.toString() && emp.isActive
  );
};

// Instance method to update inventory
warehouseSchema.methods.updateInventory = async function(productId, updateData) {
  const Product = require('./Product');
  
  // Find the product
  const product = await Product.findById(productId);
  if (!product) {
    throw new Error('Product not found');
  }

  // Update product inventory data
  if (product.inventory) {
    product.inventory.currentStock = updateData.currentStock;
    product.inventory.location = updateData.location;
    product.inventory.updatedAt = new Date();
    product.inventory.updatedBy = updateData.updatedBy;
  } else {
    product.inventory = {
      currentStock: updateData.currentStock,
      location: updateData.location || {},
      updatedAt: new Date(),
      updatedBy: updateData.updatedBy
    };
  }

  await product.save();

  return product;
};

module.exports = mongoose.model('Warehouse', warehouseSchema);
