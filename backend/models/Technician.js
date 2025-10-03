const mongoose = require('mongoose');

const certificationSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  issuingBody: { type: String, required: true, trim: true },
  certificateNumber: { type: String, trim: true },
  issuedDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true }
});

const skillSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  category: { 
    type: String, 
    enum: ['mechanical', 'electrical', 'diagnostic', 'welding', 'painting', 'assembly', 'other'],
    required: true 
  },
  level: { 
    type: String, 
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    required: true 
  },
  yearsExperience: { type: Number, min: 0, default: 0 },
  lastUsed: Date,
  isActive: { type: Boolean, default: true }
});

const availabilitySchema = new mongoose.Schema({
  dayOfWeek: { 
    type: String, 
    enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    required: true 
  },
  startTime: { type: String, required: true }, // HH:MM format
  endTime: { type: String, required: true }, // HH:MM format
  isAvailable: { type: Boolean, default: true }
});

const leaveSchema = new mongoose.Schema({
  type: { 
    type: String, 
    enum: ['vacation', 'sick', 'personal', 'training', 'emergency'],
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, trim: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending' 
  },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: Date,
  notes: { type: String, trim: true }
});

const performanceSchema = new mongoose.Schema({
  period: { type: String, required: true }, // e.g., "2024-Q1"
  jobsCompleted: { type: Number, default: 0 },
  averageCompletionTime: { type: Number, default: 0 }, // in minutes
  qualityRating: { type: Number, min: 1, max: 5 },
  customerSatisfaction: { type: Number, min: 1, max: 5 },
  safetyIncidents: { type: Number, default: 0 },
  trainingHours: { type: Number, default: 0 },
  notes: { type: String, trim: true }
});

const technicianSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  name: { 
    type: String, 
    required: [true, 'Technician name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  employeeId: { type: String, unique: true, sparse: true },
  department: { 
    type: String, 
    enum: ['workshop', 'diagnostics', 'body_shop', 'paint_shop', 'assembly', 'quality_control'],
    default: 'workshop' 
  },
  position: { 
    type: String, 
    enum: ['junior_technician', 'technician', 'senior_technician', 'lead_technician', 'specialist', 'supervisor'],
    default: 'technician' 
  },
  hireDate: { type: Date, default: Date.now },
  employmentStatus: { 
    type: String, 
    enum: ['active', 'on_leave', 'terminated', 'retired'],
    default: 'active' 
  },
  personalInfo: {
    dateOfBirth: Date,
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      zipCode: { type: String, trim: true },
      country: { type: String, trim: true }
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true },
      email: { type: String, trim: true }
    }
  },
  workInfo: {
    hourlyRate: { type: Number, min: 0 },
    overtimeRate: { type: Number, min: 0 },
    maxHoursPerWeek: { type: Number, default: 40 },
    preferredShift: { 
      type: String, 
      enum: ['morning', 'afternoon', 'night', 'flexible'],
      default: 'morning' 
    },
    workStation: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkStation' }
  },
  skills: [skillSchema],
  certifications: [certificationSchema],
  availability: [availabilitySchema],
  currentLeave: [leaveSchema],
  performance: [performanceSchema],
  currentJobs: [{ 
    job: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkshopJob' },
    assignedAt: { type: Date, default: Date.now },
    role: { type: String, default: 'technician' }
  }],
  statistics: {
    totalJobsCompleted: { type: Number, default: 0 },
    totalHoursWorked: { type: Number, default: 0 },
    averageJobRating: { type: Number, default: 0 },
    lastActiveDate: Date,
    currentWorkload: { type: Number, default: 0 } // Number of active jobs
  },
  preferences: {
    preferredJobTypes: [{ type: String, trim: true }],
    avoidJobTypes: [{ type: String, trim: true }],
    maxConcurrentJobs: { type: Number, default: 3 },
    autoAssignJobs: { type: Boolean, default: false }
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
technicianSchema.index({ user: 1 }, { unique: true, partialFilterExpression: { user: { $exists: true, $type: "objectId" } } });
technicianSchema.index({ employeeId: 1 }, { unique: true, sparse: true });
technicianSchema.index({ department: 1, position: 1 });
technicianSchema.index({ employmentStatus: 1, isActive: 1 });
technicianSchema.index({ 'skills.name': 1, 'skills.level': 1 });

// Virtual fields
technicianSchema.virtual('fullName').get(function() {
  if (this.user) {
    return `${this.user.firstName} ${this.user.lastName}`;
  }
  return this.name || 'Unknown';
});

technicianSchema.virtual('email').get(function() {
  return this.user ? this.user.email : '';
});

technicianSchema.virtual('phone').get(function() {
  return this.user ? this.user.phone : '';
});

technicianSchema.virtual('isCurrentlyAvailable').get(function() {
  if (this.employmentStatus !== 'active' || !this.isActive) {
    return false;
  }
  
  // Check if on leave
  const now = new Date();
  const currentLeave = this.currentLeave.find(leave => 
    leave.status === 'approved' && 
    now >= leave.startDate && 
    now <= leave.endDate
  );
  
  if (currentLeave) {
    return false;
  }
  
  // Check if currently assigned to any job
  if (this.currentJobs && this.currentJobs.length > 0) {
    return false;
  }
  
  // Check current workload
  if (this.statistics.currentWorkload >= this.preferences.maxConcurrentJobs) {
    return false;
  }
  
  return true;
});

technicianSchema.virtual('expiredCertifications').get(function() {
  const now = new Date();
  return this.certifications.filter(cert => 
    cert.isActive && cert.expiryDate < now
  );
});

technicianSchema.virtual('expiringCertifications').get(function() {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
  
  return this.certifications.filter(cert => 
    cert.isActive && 
    cert.expiryDate > now && 
    cert.expiryDate <= thirtyDaysFromNow
  );
});

// Instance methods
technicianSchema.methods.addSkill = function(name, category, level, yearsExperience = 0) {
  const existingSkill = this.skills.find(skill => 
    skill.name.toLowerCase() === name.toLowerCase() && 
    skill.category === category
  );
  
  if (existingSkill) {
    existingSkill.level = level;
    existingSkill.yearsExperience = yearsExperience;
    existingSkill.isActive = true;
  } else {
    this.skills.push({
      name,
      category,
      level,
      yearsExperience,
      isActive: true
    });
  }
};

technicianSchema.methods.addCertification = function(name, issuingBody, certificateNumber, issuedDate, expiryDate, notes) {
  this.certifications.push({
    name,
    issuingBody,
    certificateNumber,
    issuedDate,
    expiryDate,
    notes,
    isActive: true
  });
};

technicianSchema.methods.assignJob = function(jobId, role = 'technician') {
  this.currentJobs.push({
    job: jobId,
    role,
    assignedAt: new Date()
  });
  this.statistics.currentWorkload += 1;
};

technicianSchema.methods.completeJob = function(jobId, rating = 0) {
  this.currentJobs = this.currentJobs.filter(job => job.job.toString() !== jobId.toString());
  this.statistics.currentWorkload = Math.max(0, this.statistics.currentWorkload - 1);
  this.statistics.totalJobsCompleted += 1;
  this.statistics.lastActiveDate = new Date();
  
  if (rating > 0) {
    const totalRating = this.statistics.averageJobRating * (this.statistics.totalJobsCompleted - 1) + rating;
    this.statistics.averageJobRating = totalRating / this.statistics.totalJobsCompleted;
  }
};

technicianSchema.methods.removeJob = function(jobId) {
  this.currentJobs = this.currentJobs.filter(job => job.job.toString() !== jobId.toString());
  this.statistics.currentWorkload = Math.max(0, this.statistics.currentWorkload - 1);
};

technicianSchema.methods.requestLeave = function(type, startDate, endDate, reason) {
  this.currentLeave.push({
    type,
    startDate,
    endDate,
    reason,
    status: 'pending'
  });
};

technicianSchema.methods.approveLeave = function(leaveId, approvedBy, notes) {
  const leave = this.currentLeave.id(leaveId);
  if (leave) {
    leave.status = 'approved';
    leave.approvedBy = approvedBy;
    leave.approvedAt = new Date();
    leave.notes = notes;
  }
};

technicianSchema.methods.rejectLeave = function(leaveId, approvedBy, notes) {
  const leave = this.currentLeave.id(leaveId);
  if (leave) {
    leave.status = 'rejected';
    leave.approvedBy = approvedBy;
    leave.approvedAt = new Date();
    leave.notes = notes;
  }
};

technicianSchema.methods.updatePerformance = function(period, jobsCompleted, averageCompletionTime, qualityRating, customerSatisfaction, safetyIncidents, trainingHours, notes) {
  const existingPerformance = this.performance.find(p => p.period === period);
  
  if (existingPerformance) {
    existingPerformance.jobsCompleted = jobsCompleted;
    existingPerformance.averageCompletionTime = averageCompletionTime;
    existingPerformance.qualityRating = qualityRating;
    existingPerformance.customerSatisfaction = customerSatisfaction;
    existingPerformance.safetyIncidents = safetyIncidents;
    existingPerformance.trainingHours = trainingHours;
    existingPerformance.notes = notes;
  } else {
    this.performance.push({
      period,
      jobsCompleted,
      averageCompletionTime,
      qualityRating,
      customerSatisfaction,
      safetyIncidents,
      trainingHours,
      notes
    });
  }
};

// Pre-save middleware
technicianSchema.pre('save', function(next) {
  // Update current workload based on current jobs
  this.statistics.currentWorkload = this.currentJobs.length;
  
  next();
});

module.exports = mongoose.model('Technician', technicianSchema);
