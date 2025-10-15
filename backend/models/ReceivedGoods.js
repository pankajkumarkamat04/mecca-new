const mongoose = require('mongoose');

const receivedGoodsSchema = new mongoose.Schema({
  receivedNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse',
    required: true
  },
  receivedDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  expectedDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'received', 'partially_received', 'cancelled'],
    default: 'pending'
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    expectedQuantity: {
      type: Number,
      required: true,
      min: [0, 'Expected quantity cannot be negative']
    },
    receivedQuantity: {
      type: Number,
      default: 0,
      min: [0, 'Received quantity cannot be negative']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    totalValue: {
      type: Number,
      required: true,
      min: [0, 'Total value cannot be negative']
    },
    batchNumber: {
      type: String,
      trim: true
    },
    expiryDate: Date,
    condition: {
      type: String,
      enum: ['good', 'damaged', 'expired', 'defective'],
      default: 'good'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notes cannot exceed 500 characters']
    }
  }],
  totalItems: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verificationDate: Date,
  deliveryNote: {
    type: String,
    trim: true
  },
  invoiceNumber: {
    type: String,
    trim: true
  },
  transportDetails: {
    vehicleNumber: {
      type: String,
      trim: true
    },
    driverName: {
      type: String,
      trim: true
    },
    driverPhone: {
      type: String,
      trim: true
    }
  },
  qualityCheck: {
    performed: {
      type: Boolean,
      default: false
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    performedDate: Date,
    results: {
      type: String,
      enum: ['passed', 'failed', 'conditional'],
      default: 'passed'
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Quality check notes cannot exceed 1000 characters']
    }
  },
  documents: [{
    type: {
      type: String,
      enum: ['invoice', 'delivery_note', 'quality_certificate', 'other'],
      required: true
    },
    fileName: {
      type: String,
      required: true
    },
    filePath: {
      type: String,
      required: true
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    uploadedAt: {
      type: Date,
      default: Date.now
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
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for received goods status
receivedGoodsSchema.virtual('isFullyReceived').get(function() {
  return this.items.every(item => item.receivedQuantity >= item.expectedQuantity);
});

receivedGoodsSchema.virtual('isPartiallyReceived').get(function() {
  return this.items.some(item => item.receivedQuantity > 0 && item.receivedQuantity < item.expectedQuantity);
});

receivedGoodsSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  const totalExpected = this.items.reduce((sum, item) => sum + item.expectedQuantity, 0);
  const totalReceived = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  return totalExpected > 0 ? Math.round((totalReceived / totalExpected) * 100) : 0;
});

// Pre-save middleware to calculate totals
receivedGoodsSchema.pre('save', function(next) {
  // Calculate total items
  this.totalItems = this.items.length;
  
  // Calculate total value
  this.totalValue = this.items.reduce((sum, item) => {
    return sum + (item.receivedQuantity * item.unitPrice);
  }, 0);
  
  // Update status based on received quantities
  if (this.items.length > 0) {
    const allReceived = this.items.every(item => item.receivedQuantity >= item.expectedQuantity);
    const someReceived = this.items.some(item => item.receivedQuantity > 0);
    
    if (allReceived) {
      this.status = 'received';
    } else if (someReceived) {
      this.status = 'partially_received';
    } else {
      this.status = 'pending';
    }
  }
  
  next();
});

// Static method to generate received goods number
receivedGoodsSchema.statics.generateReceivedNumber = async function() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  
  // Find the last received goods for this month
  const lastReceived = await this.findOne({
    receivedNumber: new RegExp(`^RG${year}${month}`)
  }).sort({ receivedNumber: -1 });
  
  let sequence = 1;
  if (lastReceived) {
    const lastSequence = parseInt(lastReceived.receivedNumber.slice(-4));
    sequence = lastSequence + 1;
  }
  
  return `RG${year}${month}${String(sequence).padStart(4, '0')}`;
};

// Index for better query performance
receivedGoodsSchema.index({ receivedNumber: 1 });
receivedGoodsSchema.index({ supplier: 1 });
receivedGoodsSchema.index({ warehouse: 1 });
receivedGoodsSchema.index({ receivedDate: -1 });
receivedGoodsSchema.index({ status: 1 });
receivedGoodsSchema.index({ 'items.product': 1 });

module.exports = mongoose.model('ReceivedGoods', receivedGoodsSchema);
