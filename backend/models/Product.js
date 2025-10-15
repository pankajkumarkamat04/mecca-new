const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters']
  },
  sku: {
    type: String,
    required: [true, 'SKU is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  barcode: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  pricing: {
    costPrice: {
      type: Number,
      required: [true, 'Cost price is required'],
      min: [0, 'Cost price cannot be negative']
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Selling price is required'],
      min: [0, 'Selling price cannot be negative']
    },
    markup: {
      type: Number,
      default: 0
    },
    discount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    taxSettings: {
      isTaxable: {
        type: Boolean,
        default: true
      },
      allowTaxOverride: {
        type: Boolean,
        default: true
      },
      taxExemptionCategories: [{
        type: String,
        trim: true
      }]
    }
  },
  inventory: {
    currentStock: {
      type: Number,
      default: 0,
      min: [0, 'Stock cannot be negative']
    },
    minStock: {
      type: Number,
      default: 0,
      min: [0, 'Minimum stock cannot be negative']
    },
    maxStock: {
      type: Number,
      default: 1000,
      min: [0, 'Maximum stock cannot be negative']
    },
    reorderPoint: {
      type: Number,
      default: 0,
      min: [0, 'Reorder point cannot be negative']
    },
    reorderQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Reorder quantity cannot be negative']
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse'
    },
    warehouseLocation: {
      zone: {
        type: String,
        default: 'A'
      },
      aisle: {
        type: String,
        default: '01'
      },
      shelf: {
        type: String,
        default: '01'
      },
      bin: {
        type: String,
        default: '01'
      },
      locationCode: {
        type: String,
        unique: true,
        sparse: true
      },
      floor: String,
      section: String,
      coordinates: {
        x: Number,
        y: Number,
        z: Number
      },
      capacity: {
        type: Number,
        default: 0
      },
      currentOccupancy: {
        type: Number,
        default: 0
      }
    },
    serialNumbers: [String],
    trackSerial: {
      type: Boolean,
      default: false
    },
    trackBatch: {
      type: Boolean,
      default: false
    },
    trackExpiry: {
      type: Boolean,
      default: false
    },
    alertOnLowStock: {
      type: Boolean,
      default: true
    },
    autoReorder: {
      type: Boolean,
      default: false
    },
    lastStockCheck: Date,
    lastMovement: Date,
    stockMovements: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StockMovement'
    }]
  },
  variations: [{
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['color', 'size', 'material', 'style', 'other'],
      required: true
    },
    values: [{
      value: String,
      priceAdjustment: {
        type: Number,
        default: 0
      },
      stock: {
        type: Number,
        default: 0
      },
      sku: String
    }]
  }],
  images: [{
    url: String,
    alt: String,
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],
  specifications: [{
    name: String,
    value: String,
    unit: String
  }],
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  tags: [String],
  isActive: {
    type: Boolean,
    default: true
  },
  isDigital: {
    type: Boolean,
    default: false
  },
  weight: {
    value: Number,
    unit: {
      type: String,
      enum: ['g', 'kg', 'lb', 'oz'],
      default: 'kg'
    }
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    unit: {
      type: String,
      enum: ['cm', 'm', 'in', 'ft'],
      default: 'cm'
    }
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

// Virtual for profit margin
productSchema.virtual('profitMargin').get(function() {
  const cost = this.pricing.costPrice;
  const selling = this.pricing.sellingPrice;
  if (cost > 0) {
    return ((selling - cost) / cost * 100).toFixed(2);
  }
  return 0;
});

// Virtual for stock status
productSchema.virtual('stockStatus').get(function() {
  const current = this.inventory.currentStock;
  const min = this.inventory.minStock;
  
  if (current === 0) return 'out_of_stock';
  if (current <= min) return 'low_stock';
  return 'in_stock';
});

// Indexes
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ category: 1 });
productSchema.index({ 'inventory.currentStock': 1 });

// Pre-save middleware to calculate markup
productSchema.pre('save', function(next) {
  if (this.isModified('pricing.costPrice') || this.isModified('pricing.sellingPrice')) {
    const cost = this.pricing.costPrice;
    const selling = this.pricing.sellingPrice;
    if (cost > 0) {
      this.pricing.markup = ((selling - cost) / cost * 100).toFixed(2);
    }
  }
  next();
});

module.exports = mongoose.model('Product', productSchema);
