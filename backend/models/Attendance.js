const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  employee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: [true, 'Employee is required'],
    index: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required']
  },
  checkIn: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: {
      type: String,
      enum: ['manual', 'biometric', 'card', 'mobile'],
      default: 'manual'
    },
    notes: String
  },
  checkOut: {
    time: Date,
    location: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    method: {
      type: String,
      enum: ['manual', 'biometric', 'card', 'mobile'],
      default: 'manual'
    },
    notes: String
  },
  breaks: [{
    startTime: Date,
    endTime: Date,
    duration: Number, // in minutes
    type: {
      type: String,
      enum: ['lunch', 'coffee', 'personal', 'other'],
      default: 'personal'
    },
    notes: String
  }],
  totalHours: {
    type: Number,
    default: 0,
    min: [0, 'Total hours cannot be negative']
  },
  overtime: {
    type: Number,
    default: 0,
    min: [0, 'Overtime cannot be negative']
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day', 'sick', 'vacation', 'holiday'],
    default: 'present'
  },
  isApproved: {
    type: Boolean,
    default: false
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
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

// Virtual for attendance status color
attendanceSchema.virtual('statusColor').get(function() {
  const statusColors = {
    'present': 'green',
    'absent': 'red',
    'late': 'yellow',
    'half_day': 'orange',
    'sick': 'blue',
    'vacation': 'purple',
    'holiday': 'gray'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for working duration in hours
attendanceSchema.virtual('workingDuration').get(function() {
  if (!this.checkIn || !this.checkOut) return 0;
  
  const startTime = new Date(this.checkIn.time);
  const endTime = new Date(this.checkOut.time);
  const durationMs = endTime - startTime;
  
  // Subtract break time
  const breakDurationMs = this.breaks.reduce((total, breakItem) => {
    if (breakItem.startTime && breakItem.endTime) {
      return total + (new Date(breakItem.endTime) - new Date(breakItem.startTime));
    }
    return total;
  }, 0);
  
  const workingDurationMs = durationMs - breakDurationMs;
  return Math.max(0, workingDurationMs / (1000 * 60 * 60)); // Convert to hours
});

// Indexes
attendanceSchema.index({ employee: 1, date: 1 });
attendanceSchema.index({ date: -1 });
attendanceSchema.index({ status: 1 });
attendanceSchema.index({ isApproved: 1 });
attendanceSchema.index({ 'checkIn.time': 1 });

// Pre-save middleware to calculate total hours
attendanceSchema.pre('save', function(next) {
  if (this.checkIn && this.checkOut) {
    this.totalHours = this.workingDuration;
    
    // Calculate overtime (assuming 8 hours is standard)
    const standardHours = 8;
    this.overtime = Math.max(0, this.totalHours - standardHours);
  }
  next();
});

// Static method to get attendance summary for an employee
attendanceSchema.statics.getEmployeeSummary = async function(employeeId, startDate, endDate) {
  const attendance = await this.find({
    employee: employeeId,
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  }).sort({ date: -1 });

  const summary = {
    totalDays: attendance.length,
    presentDays: attendance.filter(a => a.status === 'present').length,
    absentDays: attendance.filter(a => a.status === 'absent').length,
    lateDays: attendance.filter(a => a.status === 'late').length,
    totalHours: attendance.reduce((sum, a) => sum + a.totalHours, 0),
    totalOvertime: attendance.reduce((sum, a) => sum + a.overtime, 0),
    averageHours: attendance.length > 0 ? 
      attendance.reduce((sum, a) => sum + a.totalHours, 0) / attendance.length : 0
  };

  return { attendance, summary };
};

// Static method to get attendance statistics
attendanceSchema.statics.getAttendanceStats = async function(startDate, endDate, department = null) {
  const filter = {
    date: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    }
  };

  if (department) {
    filter['employee.department'] = department;
  }

  const stats = await this.aggregate([
    { $match: filter },
    {
      $lookup: {
        from: 'employees',
        localField: 'employee',
        foreignField: '_id',
        as: 'employeeInfo'
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalHours: { $sum: '$totalHours' },
        totalOvertime: { $sum: '$overtime' }
      }
    }
  ]);

  const totalRecords = await this.countDocuments(filter);
  const approvedRecords = await this.countDocuments({ ...filter, isApproved: true });

  return {
    stats,
    totalRecords,
    approvedRecords,
    approvalRate: totalRecords > 0 ? (approvedRecords / totalRecords) * 100 : 0
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
