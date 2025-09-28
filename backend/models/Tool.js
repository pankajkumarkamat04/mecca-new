const mongoose = require('mongoose');

const toolMaintenanceSchema = new mongoose.Schema({
  type: { type: String, enum: ['cleaning', 'calibration', 'repair', 'replacement'], required: true },
  description: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
  cost: { type: Number, min: 0 },
  notes: { type: String, trim: true }
});

const toolSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  toolNumber: { type: String, unique: true, sparse: true },
  category: { 
    type: String, 
    enum: ['hand_tool', 'power_tool', 'diagnostic_tool', 'specialty_tool', 'measuring_tool', 'cutting_tool', 'other'],
    required: true 
  },
  subcategory: { type: String, trim: true }, // e.g., 'wrench', 'screwdriver', 'multimeter'
  brand: { type: String, trim: true },
  model: { type: String, trim: true },
  serialNumber: { type: String, trim: true },
  condition: { 
    type: String, 
    enum: ['excellent', 'good', 'fair', 'poor', 'broken'],
    default: 'good' 
  },
  status: { 
    type: String, 
    enum: ['available', 'in_use', 'maintenance', 'lost', 'retired'],
    default: 'available' 
  },
  location: {
    storageArea: { type: String, trim: true }, // e.g., 'Tool Room A', 'Bay 1'
    shelf: { type: String, trim: true },
    bin: { type: String, trim: true }
  },
  specifications: {
    size: { type: String, trim: true },
    weight: { type: Number, min: 0 },
    powerSource: { type: String, enum: ['manual', 'electric', 'pneumatic', 'hydraulic', 'battery'] },
    voltage: { type: String, trim: true },
    torque: { type: String, trim: true },
    capacity: { type: String, trim: true }
  },
  purchaseInfo: {
    purchaseDate: Date,
    purchasePrice: { type: Number, min: 0 },
    supplier: { type: String, trim: true },
    warrantyExpiry: Date
  },
  maintenance: {
    schedule: { 
      type: String, 
      enum: ['weekly', 'monthly', 'quarterly', 'annually', 'as_needed'],
      default: 'as_needed'
    },
    lastMaintenance: Date,
    nextMaintenance: Date,
    maintenanceHistory: [toolMaintenanceSchema]
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    currentJob: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopJob' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    expectedReturn: Date
  },
  usage: {
    totalUsageHours: { type: Number, default: 0 },
    lastUsed: Date,
    usageCount: { type: Number, default: 0 }
  },
  safety: {
    requiresTraining: { type: Boolean, default: false },
    safetyInstructions: { type: String, trim: true },
    requiredPPE: [{ type: String, trim: true }], // Personal Protective Equipment
    hazardLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' }
  },
  calibration: {
    requiresCalibration: { type: Boolean, default: false },
    lastCalibrated: Date,
    nextCalibration: Date,
    calibrationInterval: { type: Number, default: 365 }, // days
    calibrationCertificate: { type: String, trim: true }
  },
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
toolSchema.index({ name: 1, category: 1 });
toolSchema.index({ status: 1, 'availability.isAvailable': 1 });
toolSchema.index({ toolNumber: 1 });
toolSchema.index({ 'availability.assignedTo': 1 });

// Virtual fields
toolSchema.virtual('isOverdueForMaintenance').get(function() {
  return this.maintenance.nextMaintenance && new Date() > this.maintenance.nextMaintenance;
});

toolSchema.virtual('isOverdueForCalibration').get(function() {
  return this.calibration.requiresCalibration && 
         this.calibration.nextCalibration && 
         new Date() > this.calibration.nextCalibration;
});

toolSchema.virtual('daysUntilMaintenance').get(function() {
  if (!this.maintenance.nextMaintenance) return null;
  const diffTime = this.maintenance.nextMaintenance - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

toolSchema.virtual('daysUntilCalibration').get(function() {
  if (!this.calibration.nextCalibration) return null;
  const diffTime = this.calibration.nextCalibration - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Instance methods
toolSchema.methods.assignTool = function(jobId, userId, expectedReturn) {
  this.availability.isAvailable = false;
  this.availability.currentJob = jobId;
  this.availability.assignedTo = userId;
  this.availability.assignedAt = new Date();
  this.availability.expectedReturn = expectedReturn;
  this.status = 'in_use';
};

toolSchema.methods.returnTool = function(condition) {
  this.availability.isAvailable = true;
  this.availability.currentJob = undefined;
  this.availability.assignedTo = undefined;
  this.availability.assignedAt = undefined;
  this.availability.expectedReturn = undefined;
  this.status = 'available';
  
  if (condition) {
    this.condition = condition;
  }
  
  // Update usage statistics
  this.usage.lastUsed = new Date();
  this.usage.usageCount += 1;
};

toolSchema.methods.addMaintenanceRecord = function(type, description, performedBy, cost, notes) {
  this.maintenance.maintenanceHistory.push({
    type,
    description,
    performedBy,
    cost,
    notes
  });
  this.maintenance.lastMaintenance = new Date();
  
  // Calculate next maintenance date based on schedule
  const nextDate = new Date();
  switch (this.maintenance.schedule) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    case 'as_needed':
      // Don't set next maintenance date
      break;
  }
  if (this.maintenance.schedule !== 'as_needed') {
    this.maintenance.nextMaintenance = nextDate;
  }
};

toolSchema.methods.calibrate = function(calibrationDate, certificate) {
  this.calibration.lastCalibrated = calibrationDate || new Date();
  this.calibration.calibrationCertificate = certificate;
  
  // Calculate next calibration date
  const nextDate = new Date(this.calibration.lastCalibrated);
  nextDate.setDate(nextDate.getDate() + this.calibration.calibrationInterval);
  this.calibration.nextCalibration = nextDate;
};

// Pre-save middleware
toolSchema.pre('save', function(next) {
  // Update status based on availability
  if (!this.availability.isAvailable && this.status === 'available') {
    this.status = 'in_use';
  } else if (this.availability.isAvailable && this.status === 'in_use') {
    this.status = 'available';
  }
  
  next();
});

module.exports = mongoose.model('Tool', toolSchema);
