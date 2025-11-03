const mongoose = require('mongoose');

const receivedItemSchema = new mongoose.Schema({
  purchaseOrderItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder.items',
    required: true
  },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
  productName: {
    type: String,
    required: true
  },
  productSku: String,
  orderedQuantity: {
      type: Number,
      required: true,
    min: 0
    },
    receivedQuantity: {
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
  batchNumber: String,
    expiryDate: Date,
  serialNumbers: [String],
    condition: {
      type: String,
    enum: ['excellent', 'good', 'fair', 'damaged', 'defective', 'shortage', 'excess'],
      default: 'good'
    },
  qualityNotes: String,
  // Quality control fields
  qualityStatus: {
    type: String,
    enum: ['pending', 'passed', 'failed', 'conditional'],
    default: 'pending'
  },
  defectiveQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  damagedQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  shortageQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  excessQuantity: {
    type: Number,
    default: 0,
    min: 0
  },
  // Discrepancy handling
  hasDiscrepancy: {
    type: Boolean,
    default: false
  },
  discrepancyType: {
    type: String,
    enum: ['quantity', 'quality', 'damage', 'missing', 'extra', 'none'],
    default: 'none'
  },
  discrepancyDescription: String,
  discrepancyResolved: {
    type: Boolean,
    default: false
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Supplier',
    required: true
  },
  supplierName: {
      type: String,
    required: true
  }
}, { timestamps: true });

const receivedGoodsSchema = new mongoose.Schema({
  receiptNumber: {
    type: String,
    required: true,
    unique: true
  },
  purchaseOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PurchaseOrder',
    required: true
  },
  purchaseOrderNumber: {
    type: String,
    required: true
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
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  warehouseName: String,
  receivedDate: {
    type: Date,
    default: Date.now
  },
  deliveryDate: Date,
  deliveryMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'courier', 'freight'],
    default: 'delivery'
  },
  carrier: String,
  trackingNumber: String,
  items: [receivedItemSchema],
  totalItems: {
    type: Number,
    default: 0
  },
  totalValue: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['pending', 'inspected', 'approved', 'rejected', 'partial_approval'],
    default: 'pending'
  },
  inspectionNotes: String,
  qualityControl: {
    inspectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
    inspectedAt: Date,
    inspectionResults: {
      passed: Boolean,
      failedItems: [String],
      notes: String
    }
  },
  discrepancies: [{
    itemId: mongoose.Schema.Types.ObjectId,
    type: {
      type: String,
      enum: ['quantity', 'quality', 'damage', 'missing', 'extra'],
      required: true
    },
    description: String,
    quantity: Number,
    resolved: {
      type: Boolean,
      default: false
    },
    resolution: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  }],
  documents: [{
    type: {
      type: String,
      enum: ['delivery_note', 'invoice', 'packing_list', 'certificate', 'other'],
      required: true
    },
    filename: String,
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notes: String,
  internalNotes: String,
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
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

// Virtual for receipt status color
receivedGoodsSchema.virtual('statusColor').get(function() {
  const statusColors = {
    pending: 'yellow',
    inspected: 'blue',
    approved: 'green',
    rejected: 'red',
    partial_approval: 'orange'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for days since received
receivedGoodsSchema.virtual('daysSinceReceived').get(function() {
  const now = new Date();
  const received = new Date(this.receivedDate);
  const diffTime = now - received;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for inspection status
receivedGoodsSchema.virtual('needsInspection').get(function() {
  return this.status === 'pending' && !this.qualityControl.inspectedBy;
});

// Indexes
receivedGoodsSchema.index({ purchaseOrder: 1 });
receivedGoodsSchema.index({ supplier: 1 });
receivedGoodsSchema.index({ receivedDate: -1 });
receivedGoodsSchema.index({ status: 1 });
receivedGoodsSchema.index({ warehouse: 1 });

// Pre-save middleware
receivedGoodsSchema.pre('save', async function(next) {
  // Calculate totals
  this.totalItems = this.items.length;
  this.totalValue = this.items.reduce((sum, item) => sum + item.totalCost, 0);

  // Generate receipt number if new or missing
  if (this.isNew && !this.receiptNumber) {
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    this.receiptNumber = `RG-${year}${month}${day}-${random}`;
  }
  
  next();
});

// Static method to generate receipt number
receivedGoodsSchema.statics.generateReceiptNumber = async function() {
  const count = await this.countDocuments();
  const date = new Date();
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `RG-${year}${month}-${number}`;
};

// Instance method to approve receipt
receivedGoodsSchema.methods.approve = function(approvedBy, notes) {
  this.status = 'approved';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  this.lastUpdatedBy = approvedBy;
  if (notes) {
    this.inspectionNotes = notes;
  }
  return this.save();
};

// Instance method to reject receipt
receivedGoodsSchema.methods.reject = function(rejectedBy, reason) {
  this.status = 'rejected';
  this.lastUpdatedBy = rejectedBy;
  this.inspectionNotes = (this.inspectionNotes || '') + `\n[REJECTED] ${new Date().toISOString()}: ${reason}`;
  return this.save();
};

// Instance method to add discrepancy
receivedGoodsSchema.methods.addDiscrepancy = function(type, description, quantity, addedBy) {
  this.discrepancies.push({
    type,
    description,
    quantity,
    resolved: false,
    addedBy
  });
  this.lastUpdatedBy = addedBy;
  return this.save();
};

// Instance method to resolve discrepancy
receivedGoodsSchema.methods.resolveDiscrepancy = function(discrepancyId, resolution, resolvedBy) {
  const discrepancy = this.discrepancies.id(discrepancyId);
  if (discrepancy) {
    discrepancy.resolved = true;
    discrepancy.resolution = resolution;
    discrepancy.resolvedBy = resolvedBy;
    discrepancy.resolvedAt = new Date();
    this.lastUpdatedBy = resolvedBy;
  }
  return this.save();
};

// Instance method to handle quality inspection
receivedGoodsSchema.methods.performQualityInspection = function(inspectionData, inspectedBy) {
  this.inspectedBy = inspectedBy;
  this.inspectedAt = new Date();
  this.lastUpdatedBy = inspectedBy;
  
  // Update item-level quality status
  if (this.items && this.items.length > 0 && inspectionData && inspectionData.items) {
    this.items.forEach(item => {
      const itemInspection = inspectionData.items.find(i => i.itemId.toString() === item._id.toString());
      if (itemInspection) {
        item.qualityStatus = itemInspection.qualityStatus || 'pending';
        item.defectiveQuantity = itemInspection.defectiveQuantity || 0;
        item.damagedQuantity = itemInspection.damagedQuantity || 0;
        item.shortageQuantity = itemInspection.shortageQuantity || 0;
        item.excessQuantity = itemInspection.excessQuantity || 0;
        item.hasDiscrepancy = itemInspection.hasDiscrepancy || false;
        item.discrepancyType = itemInspection.discrepancyType || 'none';
        item.discrepancyDescription = itemInspection.discrepancyDescription;
        item.qualityNotes = itemInspection.qualityNotes || item.qualityNotes;
      }
    });
  }
  
  // Update overall status based on inspection results
  const hasFailedItems = this.items && this.items.length > 0 ? this.items.some(item => item.qualityStatus === 'failed') : false;
  const hasConditionalItems = this.items && this.items.length > 0 ? this.items.some(item => item.qualityStatus === 'conditional') : false;
  
  if (hasFailedItems) {
    this.status = 'rejected';
  } else if (hasConditionalItems) {
    this.status = 'conditional';
  } else {
    this.status = 'inspected';
  }
  
  this.internalNotes = (this.internalNotes || '') + `\n[INSPECTED] ${new Date().toISOString()}: ${inspectionData?.notes || 'Quality inspection completed'}`;
  return this.save();
};

// Instance method to handle partial receipt
receivedGoodsSchema.methods.handlePartialReceipt = function(partialData, processedBy) {
  this.lastUpdatedBy = processedBy;
  
  // Update items with partial quantities
  if (this.items && this.items.length > 0 && partialData && partialData.items) {
    partialData.items.forEach(partialItem => {
      const item = this.items.id(partialItem.itemId);
      if (item) {
        item.receivedQuantity = partialItem.receivedQuantity;
        item.shortageQuantity = partialItem.shortageQuantity || 0;
        item.excessQuantity = partialItem.excessQuantity || 0;
        item.hasDiscrepancy = partialItem.hasDiscrepancy || false;
        item.discrepancyType = partialItem.discrepancyType || 'none';
        item.discrepancyDescription = partialItem.discrepancyDescription;
        item.qualityNotes = partialItem.qualityNotes || item.qualityNotes;
      }
    });
  }
  
  // Update overall status
  const allItemsReceived = this.items && this.items.length > 0 ? this.items.every(item => item.receivedQuantity >= item.orderedQuantity) : true;
  const hasDiscrepancies = this.items && this.items.length > 0 ? this.items.some(item => item.hasDiscrepancy) : false;
  
  if (allItemsReceived && !hasDiscrepancies) {
    this.status = 'inspected';
  } else if (hasDiscrepancies) {
    this.status = 'conditional';
  } else {
    this.status = 'partial';
  }
  
  this.internalNotes = (this.internalNotes || '') + `\n[PARTIAL RECEIPT] ${new Date().toISOString()}: ${partialData?.notes || 'Partial receipt processed'}`;
  return this.save();
};

// Instance method to resolve discrepancies
receivedGoodsSchema.methods.resolveDiscrepancy = function(resolutionData, resolvedBy) {
  this.lastUpdatedBy = resolvedBy;
  
  // Update item-level discrepancy resolution
  if (this.items && this.items.length > 0 && resolutionData && resolutionData.items) {
    resolutionData.items.forEach(resolutionItem => {
      const item = this.items.id(resolutionItem.itemId);
      if (item) {
        item.discrepancyResolved = true;
        item.discrepancyDescription = (item.discrepancyDescription || '') + `\n[RESOLVED] ${new Date().toISOString()}: ${resolutionItem.resolutionNotes}`;
      }
    });
  }
  
  // Check if all discrepancies are resolved
  const allDiscrepanciesResolved = this.items && this.items.length > 0 ? this.items.every(item => !item.hasDiscrepancy || item.discrepancyResolved) : true;
  
  if (allDiscrepanciesResolved) {
    this.status = 'inspected';
  }
  
  this.internalNotes = (this.internalNotes || '') + `\n[DISCREPANCY RESOLVED] ${new Date().toISOString()}: ${resolutionData?.notes || 'Discrepancies resolved'}`;
  return this.save();
};

// Virtual for usable quantity (received - defective - damaged)
receivedGoodsSchema.virtual('usableQuantity').get(function() {
  if (!this.items || this.items.length === 0) return 0;
  return this.items.reduce((sum, item) => {
    const usable = item.receivedQuantity - (item.defectiveQuantity || 0) - (item.damagedQuantity || 0);
    return sum + Math.max(0, usable);
  }, 0);
});

// Virtual for discrepancy summary
receivedGoodsSchema.virtual('discrepancySummary').get(function() {
  if (!this.items || this.items.length === 0) return { total: 0, types: [] };
  
  const summary = {
    total: 0,
    types: [],
    defective: 0,
    damaged: 0,
    shortage: 0,
    excess: 0
  };
  
  this.items.forEach(item => {
    if (item.hasDiscrepancy) {
      summary.total++;
      if (!summary.types.includes(item.discrepancyType)) {
        summary.types.push(item.discrepancyType);
      }
      summary.defective += item.defectiveQuantity || 0;
      summary.damaged += item.damagedQuantity || 0;
      summary.shortage += item.shortageQuantity || 0;
      summary.excess += item.excessQuantity || 0;
    }
  });
  
  return summary;
});

module.exports = mongoose.model('ReceivedGoods', receivedGoodsSchema);
