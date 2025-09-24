const mongoose = require('mongoose');

const stockMovementSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'Product is required']
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  movementType: {
    type: String,
    enum: ['in', 'out', 'transfer', 'adjustment', 'return', 'damage', 'expired'],
    required: [true, 'Movement type is required']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantity is required'],
    min: [0.01, 'Quantity must be greater than 0']
  },
  unitCost: {
    type: Number,
    required: [true, 'Unit cost is required'],
    min: [0, 'Unit cost cannot be negative']
  },
  totalCost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0, 'Total cost cannot be negative']
  },
  previousStock: {
    type: Number,
    required: [true, 'Previous stock is required'],
    min: [0, 'Previous stock cannot be negative']
  },
  newStock: {
    type: Number,
    required: [true, 'New stock is required'],
    min: [0, 'New stock cannot be negative']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  referenceType: {
    type: String,
    enum: ['purchase_order', 'sale', 'invoice', 'transfer', 'adjustment', 'manual'],
    default: 'manual'
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier'
  },
  batchNumber: {
    type: String,
    trim: true,
    maxlength: [50, 'Batch number cannot exceed 50 characters']
  },
  expiryDate: Date,
  serialNumbers: [String],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
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

// Virtual for movement description
stockMovementSchema.virtual('description').get(function() {
  const type = this.movementType;
  const quantity = this.quantity;
  const product = this.product?.name || 'Product';
  
  const descriptions = {
    'in': `${quantity} units added to ${product}`,
    'out': `${quantity} units removed from ${product}`,
    'transfer': `${quantity} units transferred for ${product}`,
    'adjustment': `Stock adjusted by ${quantity} units for ${product}`,
    'return': `${quantity} units returned for ${product}`,
    'damage': `${quantity} units marked as damaged for ${product}`,
    'expired': `${quantity} units expired for ${product}`
  };
  
  return descriptions[type] || `${quantity} units ${type} for ${product}`;
});

// Virtual for movement status color
stockMovementSchema.virtual('statusColor').get(function() {
  const statusColors = {
    'in': 'green',
    'out': 'red',
    'transfer': 'blue',
    'adjustment': 'yellow',
    'return': 'purple',
    'damage': 'red',
    'expired': 'orange'
  };
  return statusColors[this.movementType] || 'gray';
});

// Indexes
stockMovementSchema.index({ product: 1 });
stockMovementSchema.index({ movementType: 1 });
stockMovementSchema.index({ createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });
stockMovementSchema.index({ supplier: 1 });
stockMovementSchema.index({ batchNumber: 1 });

// Pre-save middleware to calculate total cost
stockMovementSchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('unitCost')) {
    this.totalCost = this.quantity * this.unitCost;
  }
  next();
});

// Static method to get stock movements for a product
stockMovementSchema.statics.getProductMovements = function(productId, options = {}) {
  const filter = { product: productId };
  
  if (options.startDate || options.endDate) {
    filter.createdAt = {};
    if (options.startDate) filter.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) filter.createdAt.$lte = new Date(options.endDate);
  }
  
  if (options.movementType) filter.movementType = options.movementType;
  
  return this.find(filter)
    .populate('product', 'name sku')
    .populate('supplier', 'name')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 });
};

// Static method to get current stock for a product
stockMovementSchema.statics.getCurrentStock = async function(productId) {
  const movements = await this.aggregate([
    {
      $match: {
        product: mongoose.Types.ObjectId(productId)
      }
    },
    {
      $group: {
        _id: null,
        totalIn: {
          $sum: {
            $cond: [
              { $in: ['$movementType', ['in', 'return']] },
              '$quantity',
              0
            ]
          }
        },
        totalOut: {
          $sum: {
            $cond: [
              { $in: ['$movementType', ['out', 'damage', 'expired']] },
              '$quantity',
              0
            ]
          }
        }
      }
    }
  ]);
  
  if (movements.length === 0) return 0;
  
  const movement = movements[0];
  return Math.max(0, movement.totalIn - movement.totalOut);
};

module.exports = mongoose.model('StockMovement', stockMovementSchema);
