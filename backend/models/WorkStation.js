const mongoose = require('mongoose');

const workstationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  stationNumber: { type: String, unique: true, sparse: true },
  type: { 
    type: String, 
    enum: ['repair_bay', 'diagnostic_bay', 'welding_station', 'assembly_station', 'inspection_station', 'paint_booth', 'other'],
    required: true 
  },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'maintenance', 'out_of_order'],
    default: 'available' 
  },
  location: {
    building: { type: String, trim: true },
    floor: { type: String, trim: true },
    section: { type: String, trim: true },
    coordinates: {
      x: { type: Number },
      y: { type: Number }
    }
  },
  capacity: {
    maxVehicleSize: { type: String, enum: ['small', 'medium', 'large', 'extra_large'] },
    maxWeight: { type: Number, min: 0 }, // in kg
    maxHeight: { type: Number, min: 0 }, // in cm
    maxLength: { type: Number, min: 0 }, // in cm
    maxWidth: { type: Number, min: 0 } // in cm
  },
  equipment: {
    hoist: { type: Boolean, default: false },
    hoistCapacity: { type: Number, min: 0 },
    compressedAir: { type: Boolean, default: false },
    electricalOutlets: { type: Number, default: 0 },
    lighting: { type: String, enum: ['standard', 'high_intensity', 'led'], default: 'standard' },
    ventilation: { type: Boolean, default: false },
    fireSuppression: { type: Boolean, default: false }
  },
  availability: {
    isAvailable: { type: Boolean, default: true },
    currentJob: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopJob' },
    bookedUntil: Date,
    bookedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    operatingHours: {
      start: { type: String, default: '08:00' }, // HH:MM format
      end: { type: String, default: '17:00' }, // HH:MM format
      timezone: { type: String, default: 'UTC' }
    },
    workingDays: [{ 
      type: String, 
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      default: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
    }]
  },
  safety: {
    safetyRequirements: [{ type: String, trim: true }],
    requiredCertifications: [{ type: String, trim: true }],
    hazardLevel: { type: String, enum: ['low', 'medium', 'high'], default: 'low' },
    emergencyProcedures: { type: String, trim: true }
  },
  maintenance: {
    lastCleaning: Date,
    lastMaintenance: Date,
    nextMaintenance: Date,
    maintenanceSchedule: { 
      type: String, 
      enum: ['daily', 'weekly', 'monthly', 'quarterly'],
      default: 'weekly'
    },
    maintenanceNotes: { type: String, trim: true }
  },
  utilization: {
    totalHoursUsed: { type: Number, default: 0 },
    totalJobsCompleted: { type: Number, default: 0 },
    averageJobDuration: { type: Number, default: 0 }, // in minutes
    lastUsed: Date
  },
  costs: {
    hourlyRate: { type: Number, min: 0 },
    setupCost: { type: Number, min: 0 },
    maintenanceCost: { type: Number, min: 0, default: 0 }
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
workstationSchema.index({ name: 1, type: 1 });
workstationSchema.index({ status: 1, 'availability.isAvailable': 1 });

// Virtual fields
workstationSchema.virtual('isOverdueForMaintenance').get(function() {
  return this.maintenance.nextMaintenance && new Date() > this.maintenance.nextMaintenance;
});

workstationSchema.virtual('daysUntilMaintenance').get(function() {
  if (!this.maintenance.nextMaintenance) return null;
  const diffTime = this.maintenance.nextMaintenance - new Date();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

workstationSchema.virtual('utilizationRate').get(function() {
  // This would be calculated based on actual usage data
  return 0; // Placeholder
});

workstationSchema.virtual('isCurrentlyAvailable').get(function() {
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'lowercase' });
  
  // Check if current day is a working day
  if (!this.availability.workingDays.includes(currentDay)) {
    return false;
  }
  
  // Check if current time is within operating hours
  const startHour = parseInt(this.availability.operatingHours.start.split(':')[0]);
  const endHour = parseInt(this.availability.operatingHours.end.split(':')[0]);
  
  if (currentHour < startHour || currentHour >= endHour) {
    return false;
  }
  
  return this.availability.isAvailable && this.status === 'available';
});

// Instance methods
workstationSchema.methods.bookWorkstation = function(jobId, userId, until) {
  this.availability.isAvailable = false;
  this.availability.currentJob = jobId;
  this.availability.bookedUntil = until;
  this.availability.bookedBy = userId;
  this.status = 'occupied';
};

workstationSchema.methods.releaseWorkstation = function() {
  this.availability.isAvailable = true;
  this.availability.currentJob = undefined;
  this.availability.bookedUntil = undefined;
  this.availability.bookedBy = undefined;
  this.status = 'available';
  
  // Update utilization statistics
  this.utilization.lastUsed = new Date();
  this.utilization.totalJobsCompleted += 1;
};

workstationSchema.methods.updateUtilization = function(jobDuration) {
  this.utilization.totalHoursUsed += jobDuration / 60; // Convert minutes to hours
  this.utilization.lastUsed = new Date();
  
  // Calculate average job duration
  if (this.utilization.totalJobsCompleted > 0) {
    this.utilization.averageJobDuration = 
      (this.utilization.averageJobDuration * (this.utilization.totalJobsCompleted - 1) + jobDuration) / 
      this.utilization.totalJobsCompleted;
  }
};

workstationSchema.methods.scheduleMaintenance = function(maintenanceDate, notes) {
  this.maintenance.lastMaintenance = maintenanceDate || new Date();
  this.maintenance.maintenanceNotes = notes;
  
  // Calculate next maintenance date based on schedule
  const nextDate = new Date(this.maintenance.lastMaintenance);
  switch (this.maintenance.maintenanceSchedule) {
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
  }
  this.maintenance.nextMaintenance = nextDate;
};

// Pre-save middleware
workstationSchema.pre('save', function(next) {
  // Update status based on availability
  if (!this.availability.isAvailable && this.status === 'available') {
    this.status = 'occupied';
  } else if (this.availability.isAvailable && this.status === 'occupied') {
    this.status = 'available';
  }
  
  next();
});

module.exports = mongoose.model('WorkStation', workstationSchema);
