const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  level: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  path: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    default: []
  },
  // Ensure path is always an array
  // Using schema-level default to prevent undefined
  // (kept after the array definition for clarity)
  
  image: {
    type: String,
    default: null
  },
  icon: {
    type: String,
    default: null
  },
  color: {
    type: String,
    default: '#3B82F6'
  },
  sortOrder: {
    type: Number,
    default: 0
  },
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

// Virtual for category path string
categorySchema.virtual('pathString').get(function() {
  const pathArray = Array.isArray(this.path) ? this.path : [];
  const names = pathArray
    .map(cat => (cat && typeof cat === 'object' && cat.name ? cat.name : null))
    .filter(Boolean);
  return names.join(' > ');
});

// Indexes
categorySchema.index({ name: 1 });
categorySchema.index({ parent: 1 });
categorySchema.index({ level: 1 });
categorySchema.index({ isActive: 1 });

// Pre-save middleware to set level and path
categorySchema.pre('save', async function(next) {
  if (this.parent) {
    const parent = await this.constructor.findById(this.parent);
    if (parent) {
      this.level = parent.level + 1;
      this.path = [...parent.path, this.parent];
    }
  } else {
    this.level = 0;
    this.path = [];
  }
  next();
});

module.exports = mongoose.model('Category', categorySchema);
