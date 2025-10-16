const mongoose = require('mongoose');

const ServiceTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
    maxlength: [100, 'Service name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Service category is required'],
    enum: [
      'engine',
      'transmission',
      'suspension',
      'brakes',
      'electrical',
      'air_conditioning',
      'bodywork',
      'maintenance',
      'diagnostic',
      'other'
    ]
  },
  estimatedDuration: {
    type: Number,
    required: [true, 'Estimated duration is required'],
    min: [1, 'Duration must be at least 1 minute'],
    max: [10080, 'Duration cannot exceed 1 week'] // 7 days in minutes
  },
  estimatedCost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  requiredTools: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    optional: {
      type: Boolean,
      default: false
    }
  }],
  requiredParts: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    optional: {
      type: Boolean,
      default: false
    }
  }],
  tasks: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    estimatedDuration: {
      type: Number,
      min: [1, 'Task duration must be at least 1 minute'],
      default: 30
    },
    order: {
      type: Number,
      default: 0
    },
    required: {
      type: Boolean,
      default: true
    }
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for efficient searching
ServiceTemplateSchema.index({ name: 'text', description: 'text' });
ServiceTemplateSchema.index({ category: 1, isActive: 1 });

// Pre-save middleware to update lastUpdatedBy
ServiceTemplateSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.lastUpdatedBy = this.createdBy; // In real app, this would be the current user
  }
  next();
});

// Static method to get services by category
ServiceTemplateSchema.statics.getByCategory = function(category) {
  return this.find({ category, isActive: true }).sort({ name: 1 });
};

// Static method to search services
ServiceTemplateSchema.statics.searchServices = function(query) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
          { category: { $regex: query, $options: 'i' } }
        ]
      }
    ]
  }).sort({ name: 1 });
};

module.exports = mongoose.model('ServiceTemplate', ServiceTemplateSchema);
