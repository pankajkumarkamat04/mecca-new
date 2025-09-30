const mongoose = require('mongoose');

const machineMaintenanceSchema = new mongoose.Schema({
  type: { type: String, enum: ['preventive', 'corrective', 'emergency'], required: true },
  description: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  performedAt: { type: Date, default: Date.now },
  nextMaintenanceDate: Date,
  cost: { type: Number, min: 0 },
  notes: { type: String, trim: true }
});

const machineSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  model: { type: String, trim: true },
  manufacturer: { type: String, trim: true },
  serialNumber: { type: String, unique: true, sparse: true },
  category: { 
    type: String, 
    enum: ['diagnostic', 'repair', 'lifting', 'welding', 'machining', 'testing', 'other'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['operational', 'maintenance', 'broken', 'retired'],
    default: 'operational' 
  },
  location: {
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    room: { type: String, trim: true },
    bay: { type: String, trim: true }
  },
  specifications: {
    powerRating: { type: String, trim: true },
    dimensions: { type: String, trim: true },
    weight: { type: Number, min: 0 },
    capacity: { type: String, trim: true },
    operatingPressure: { type: String, trim: true },
    operatingTemperature: { type: String, trim: true }
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
      enum: ['daily', 'weekly', 'monthly', 'quarterly', 'annually'],
      default: 'monthly'
    },
    lastMaintenance: Date,
    nextMaintenance: Date,
    maintenanceHistory: [machineMaintenanceSchema]
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    currentJob: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopJob' },
    bookedUntil: Date,
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  operatingInstructions: { type: String, trim: true },
  safetyRequirements: { type: String, trim: true },
  requiredCertifications: [{ type: String, trim: true }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes (avoid duplicating unique indexes)
machineSchema.index({ name: 1, category: 1 });
machineSchema.index({ status: 1, 'availability.isAvailable': 1 });

// Virtual fields
machineSchema.virtual('isOverdueForMaintenance').get(function() {
  return this.maintenance.nextMaintenance && new Date() > this.maintenance.nextMaintenance;
});

machineSchema.virtual('daysUntilMaintenance').get(function() {
  if (!this.maintenance.nextMaintenance) return null;
  const diffTime = this.maintenance.nextMaintenance - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

machineSchema.virtual('utilizationRate').get(function() {
  // This would be calculated based on actual usage data
  return 0; // Placeholder
});

// Instance methods
machineSchema.methods.bookMachine = function(jobId, userId, until) {
  this.availability.isAvailable = false;
  this.availability.currentJob = jobId;
  this.availability.bookedUntil = until;
  this.availability.bookedBy = userId;
};

machineSchema.methods.releaseMachine = function() {
  this.availability.isAvailable = true;
  this.availability.currentJob = undefined;
  this.availability.bookedUntil = undefined;
  this.availability.bookedBy = undefined;
};

machineSchema.methods.addMaintenanceRecord = function(type, description, performedBy, cost, notes) {
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
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
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
  }
  this.maintenance.nextMaintenance = nextDate;
};

// Pre-save middleware
machineSchema.pre('save', function(next) {
  // Update status based on availability
  if (!this.availability.isAvailable && this.status === 'operational') {
    this.status = 'operational'; // Keep operational but booked
  }
  
  next();
});

module.exports = mongoose.model('Machine', machineSchema);
