const mongoose = require('mongoose');

const purchaseOrderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  sku: String,
  description: String,
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitCost: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  receivedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  pendingQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  expectedDeliveryDate: Date,
  actualDeliveryDate: Date,
  batchNumber: String,
  expiryDate: Date,
  serialNumbers: [String],
  notes: String
});

const purchaseOrderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  supplierName: {
    type: String,
    required: true
  },
  supplierEmail: String,
  supplierPhone: String,
  supplierAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  orderDate: {
    type: Date,
    default: Date.now
  },
  expectedDeliveryDate: Date,
  items: [purchaseOrderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  taxAmount: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  discountAmount: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'confirmed', 'partial', 'received', 'completed', 'cancelled'],
    default: 'draft'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'overdue'],
    default: 'pending'
  },
  paymentTerms: {
    type: String,
    enum: ['net_15', 'net_30', 'net_45', 'net_60', 'due_on_receipt', 'prepaid'],
    default: 'net_30'
  },
  shippingMethod: {
    type: String,
    enum: ['standard', 'express', 'overnight', 'pickup'],
    default: 'standard'
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  reference: String,
  notes: String,
  internalNotes: String,
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  receivedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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

// Virtual for completion percentage
purchaseOrderSchema.virtual('completionPercentage').get(function() {
  if (this.items.length === 0) return 0;
  
  const totalQuantity = this.items.reduce((sum, item) => sum + item.quantity, 0);
  const receivedQuantity = this.items.reduce((sum, item) => sum + item.receivedQuantity, 0);
  
  return totalQuantity > 0 ? ((receivedQuantity / totalQuantity) * 100).toFixed(2) : 0;
});

// Virtual for days overdue
purchaseOrderSchema.virtual('daysOverdue').get(function() {
  if (!this.expectedDeliveryDate || this.status === 'completed' || this.status === 'cancelled') {
    return 0;
  }
  
  const now = new Date();
  const expected = new Date(this.expectedDeliveryDate);
  const diffTime = now - expected;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return Math.max(0, diffDays);
});

// Virtual for is overdue
purchaseOrderSchema.virtual('isOverdue').get(function() {
  return this.daysOverdue > 0;
});

// Virtual for status color
purchaseOrderSchema.virtual('statusColor').get(function() {
  const statusColors = {
    draft: 'gray',
    sent: 'blue',
    confirmed: 'green',
    partial: 'yellow',
    received: 'green',
    completed: 'green',
    cancelled: 'red'
  };
  return statusColors[this.status] || 'gray';
});

// Indexes
purchaseOrderSchema.index({ orderNumber: 1 });
purchaseOrderSchema.index({ supplier: 1 });
purchaseOrderSchema.index({ status: 1 });
purchaseOrderSchema.index({ orderDate: -1 });
purchaseOrderSchema.index({ expectedDeliveryDate: 1 });
purchaseOrderSchema.index({ createdBy: 1 });
purchaseOrderSchema.index({ assignedTo: 1 });

// Pre-save middleware to calculate totals
purchaseOrderSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    item.totalCost = item.quantity * item.unitCost;
    item.pendingQuantity = item.quantity - item.receivedQuantity;
  });

  // Calculate subtotal
  this.subtotal = this.items.reduce((sum, item) => sum + item.totalCost, 0);

  // Calculate discount amount
  this.discountAmount = (this.subtotal * this.discount) / 100;

  // Calculate tax amount
  const afterDiscount = this.subtotal - this.discountAmount;
  this.taxAmount = (afterDiscount * this.taxRate) / 100;

  // Calculate total amount
  this.totalAmount = afterDiscount + this.taxAmount + this.shippingCost;

  // Generate order number if new
  if (this.isNew && !this.orderNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.orderNumber = `PO-${year}${month}${day}-${random}`;
  }

  next();
});

// Static method to generate order number
purchaseOrderSchema.statics.generateOrderNumber = async function() {
  const count = await this.countDocuments();
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `PO-${year}${month}-${number}`;
};

// Static method to get purchase order statistics
purchaseOrderSchema.statics.getStatistics = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalOrders: { $sum: 1 },
        draftOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
        },
        sentOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'sent'] }, 1, 0] }
        },
        confirmedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'confirmed'] }, 1, 0] }
        },
        partialOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] }
        },
        completedOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        cancelledOrders: {
          $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
        },
        totalValue: { $sum: '$totalAmount' },
        pendingValue: {
          $sum: {
            $cond: [
              { $in: ['$status', ['draft', 'sent', 'confirmed', 'partial']] },
              '$totalAmount',
              0
            ]
          }
        }
      }
    }
  ]);

  if (stats.length === 0) {
    return {
      totalOrders: 0,
      draftOrders: 0,
      sentOrders: 0,
      confirmedOrders: 0,
      partialOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      totalValue: 0,
      pendingValue: 0
    };
  }

  return stats[0];
};

// Instance method to mark as received
purchaseOrderSchema.methods.markAsReceived = function(receivedItems, receivedBy) {
  receivedItems.forEach(receivedItem => {
    const item = this.items.id(receivedItem.itemId);
    if (item) {
      item.receivedQuantity += receivedItem.quantity;
      if (receivedItem.batchNumber) item.batchNumber = receivedItem.batchNumber;
      if (receivedItem.expiryDate) item.expiryDate = receivedItem.expiryDate;
      if (receivedItem.serialNumbers) item.serialNumbers = receivedItem.serialNumbers;
      if (receivedItem.notes) item.notes = receivedItem.notes;
    }
  });

  // Update status based on received quantities
  const allItemsReceived = this.items.every(item => item.receivedQuantity >= item.quantity);
  const someItemsReceived = this.items.some(item => item.receivedQuantity > 0);

  if (allItemsReceived) {
    this.status = 'completed';
  } else if (someItemsReceived) {
    this.status = 'partial';
  }

  this.receivedBy = receivedBy;
  this.receivedAt = new Date();
  this.lastUpdatedBy = receivedBy;

  return this.save();
};

// Instance method to cancel order
purchaseOrderSchema.methods.cancel = function(reason, cancelledBy) {
  this.status = 'cancelled';
  this.internalNotes = (this.internalNotes || '') + `\n[CANCELLED] ${new Date().toISOString()}: ${reason}`;
  this.lastUpdatedBy = cancelledBy;
  return this.save();
};

module.exports = mongoose.model('PurchaseOrder', purchaseOrderSchema);
