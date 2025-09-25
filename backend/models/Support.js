const mongoose = require('mongoose');

const supportSchema = new mongoose.Schema({
  ticketNumber: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true
  },
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true,
    maxlength: [200, 'Subject cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    maxlength: [5000, 'Description cannot exceed 5000 characters']
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: [true, 'Customer is required']
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    enum: ['technical', 'billing', 'general', 'bug_report', 'feature_request', 'complaint'],
    default: 'general'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'waiting_customer', 'waiting_support', 'resolved', 'closed'],
    default: 'open'
  },
  type: {
    type: String,
    enum: ['customer', 'employee'],
    default: 'customer'
  },
  attachments: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    url: {
      type: String,
      required: true
    },
    size: Number,
    type: String,
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  conversations: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters']
    },
    isInternal: {
      type: Boolean,
      default: false
    },
    attachments: [{
      name: String,
      url: String,
      size: Number,
      type: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  sla: {
    responseTime: {
      type: Number, // in hours
      default: 24
    },
    resolutionTime: {
      type: Number, // in hours
      default: 72
    },
    firstResponseAt: Date,
    resolvedAt: Date,
    closedAt: Date
  },
  satisfaction: {
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    feedback: String,
    ratedAt: Date
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for ticket status color
supportSchema.virtual('statusColor').get(function() {
  const statusColors = {
    'open': 'red',
    'in_progress': 'blue',
    'waiting_customer': 'yellow',
    'waiting_support': 'orange',
    'resolved': 'green',
    'closed': 'gray'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for priority color
supportSchema.virtual('priorityColor').get(function() {
  const priorityColors = {
    'low': 'green',
    'medium': 'yellow',
    'high': 'orange',
    'urgent': 'red'
  };
  return priorityColors[this.priority] || 'gray';
});

// Virtual for age in days
supportSchema.virtual('age').get(function() {
  return Math.ceil((new Date() - this.createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual for SLA status
supportSchema.virtual('slaStatus').get(function() {
  if (this.status === 'closed' || this.status === 'resolved') return 'met';
  
  const now = new Date();
  const ageInHours = (now - this.createdAt) / (1000 * 60 * 60);
  
  if (!this.sla.firstResponseAt && ageInHours > this.sla.responseTime) {
    return 'overdue_response';
  }
  
  if (ageInHours > this.sla.resolutionTime) {
    return 'overdue_resolution';
  }
  
  return 'on_track';
});

// Indexes
supportSchema.index({ subject: 'text', description: 'text' });
supportSchema.index({ customer: 1 });
supportSchema.index({ assignedTo: 1 });
supportSchema.index({ status: 1 });
supportSchema.index({ priority: 1 });
supportSchema.index({ category: 1 });
supportSchema.index({ createdAt: -1 });
supportSchema.index({ isActive: 1 });

// Pre-save middleware to generate ticket number
supportSchema.pre('save', async function(next) {
  if (this.isNew && !this.ticketNumber) {
    const count = await this.constructor.countDocuments();
    this.ticketNumber = `TKT${(count + 1).toString().padStart(6, '0')}`;
  }
  next();
});

// Method to add conversation
supportSchema.methods.addConversation = function(conversationData) {
  this.conversations.push(conversationData);
  
  // Update SLA first response if this is the first support response
  if (!this.sla.firstResponseAt && conversationData.user.toString() !== this.createdBy.toString()) {
    this.sla.firstResponseAt = new Date();
  }
  
  return this.save();
};

// Method to update status
supportSchema.methods.updateStatus = function(newStatus) {
  this.status = newStatus;
  
  if (newStatus === 'resolved') {
    this.sla.resolvedAt = new Date();
  } else if (newStatus === 'closed') {
    this.sla.closedAt = new Date();
  }
  
  return this.save();
};

// Method to assign ticket
supportSchema.methods.assignTo = function(userId) {
  this.assignedTo = userId;
  return this.save();
};

// Method to add satisfaction rating
supportSchema.methods.addSatisfaction = function(rating, feedback) {
  this.satisfaction.rating = rating;
  this.satisfaction.feedback = feedback;
  this.satisfaction.ratedAt = new Date();
  return this.save();
};

// Static method to get tickets by status
supportSchema.statics.getTicketsByStatus = function(status, options = {}) {
  const filter = { status, isActive: true };
  
  if (options.assignedTo) filter.assignedTo = options.assignedTo;
  if (options.category) filter.category = options.category;
  if (options.priority) filter.priority = options.priority;
  
  return this.find(filter)
    .populate('customer', 'firstName lastName email')
    .populate('assignedTo', 'firstName lastName email')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get SLA overdue tickets
supportSchema.statics.getOverdueTickets = function() {
  const now = new Date();
  
  return this.find({
    status: { $nin: ['closed', 'resolved'] },
    isActive: true,
    $or: [
      {
        'sla.firstResponseAt': { $exists: false },
        createdAt: { $lte: new Date(now - 24 * 60 * 60 * 1000) } // 24 hours ago
      },
      {
        createdAt: { $lte: new Date(now - 72 * 60 * 60 * 1000) } // 72 hours ago
      }
    ]
  })
  .populate('customer', 'firstName lastName email')
  .populate('assignedTo', 'firstName lastName email')
  .sort({ createdAt: 1 });
};

module.exports = mongoose.model('Support', supportSchema);
