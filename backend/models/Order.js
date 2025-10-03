const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
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
  unitPrice: {
    type: Number,
    required: true,
    min: 0
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
  total: {
    type: Number,
    required: true
  },
  notes: String
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: true
  },
  customerName: {
    type: String,
    required: true
  },
  customerEmail: {
    type: String,
    required: true
  },
  customerPhone: String,
  customerAddress: {
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
  actualDeliveryDate: Date,
  items: [orderItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'partial', 'paid', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank_transfer', 'check', 'online', 'other'],
    default: 'cash'
  },
  paymentDetails: {
    transactionId: String,
    reference: String,
    notes: String
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  fulfillmentStatus: {
    type: String,
    enum: ['unfulfilled', 'partial', 'fulfilled', 'shipped', 'delivered'],
    default: 'unfulfilled'
  },
  shippingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    contactName: String,
    contactPhone: String
  },
  billingAddress: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  shippingMethod: {
    type: String,
    enum: ['pickup', 'delivery', 'shipping', 'express'],
    default: 'pickup'
  },
  trackingNumber: String,
  carrier: String,
  notes: String,
  internalNotes: String,
  tags: [String],
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  source: {
    type: String,
    enum: ['pos', 'online', 'phone', 'email', 'walk_in', 'quotation'],
    default: 'pos'
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation'
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  assignedAt: {
    type: Date
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  // Calculate item totals
  this.items.forEach(item => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
    const taxAmount = (afterDiscount * item.taxRate) / 100;
    item.total = afterDiscount + taxAmount;
  });

  // Calculate subtotal (without taxes)
  this.subtotal = this.items.reduce((sum, item) => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
    return sum + afterDiscount;
  }, 0);

  // Calculate total discount
  this.totalDiscount = this.items.reduce((sum, item) => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    return sum + discountAmount;
  }, 0);

  // Calculate total tax
  this.totalTax = this.items.reduce((sum, item) => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
    const taxAmount = (afterDiscount * item.taxRate) / 100;
    return sum + taxAmount;
  }, 0);

  // Calculate total amount
  this.totalAmount = this.subtotal + this.totalTax + this.shippingCost;

  next();
});

// Generate order number
orderSchema.statics.generateOrderNumber = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `ORD-${year}${month}-${number}`;
};

// Check if order can be cancelled
orderSchema.methods.canBeCancelled = function() {
  return ['pending', 'confirmed'].includes(this.orderStatus);
};

// Check if order can be modified
orderSchema.methods.canBeModified = function() {
  return ['pending', 'confirmed'].includes(this.orderStatus);
};

// Update order status
orderSchema.methods.updateStatus = function(newStatus, notes = '') {
  this.orderStatus = newStatus;
  
  // Set fulfillment status based on order status
  if (newStatus === 'shipped') {
    this.fulfillmentStatus = 'shipped';
  } else if (newStatus === 'delivered') {
    this.fulfillmentStatus = 'delivered';
  } else if (newStatus === 'cancelled') {
    this.fulfillmentStatus = 'unfulfilled';
  }

  // Set delivery date
  if (newStatus === 'delivered') {
    this.actualDeliveryDate = new Date();
  }

  if (notes) {
    this.internalNotes = (this.internalNotes || '') + `\n[${new Date().toISOString()}] ${newStatus.toUpperCase()}: ${notes}`;
  }

  return this.save();
};

// Mark as paid
orderSchema.methods.markAsPaid = function(paymentMethod, paymentDetails = {}) {
  this.paymentStatus = 'paid';
  this.paymentMethod = paymentMethod;
  this.paymentDetails = { ...this.paymentDetails, ...paymentDetails };
  return this.save();
};

// Calculate fulfillment percentage
orderSchema.methods.getFulfillmentPercentage = function() {
  if (this.fulfillmentStatus === 'unfulfilled') return 0;
  if (this.fulfillmentStatus === 'fulfilled') return 100;
  if (this.fulfillmentStatus === 'shipped') return 90;
  if (this.fulfillmentStatus === 'delivered') return 100;
  return 50; // partial
};

// Get order age in days
orderSchema.methods.getAgeInDays = function() {
  const now = new Date();
  const orderDate = new Date(this.orderDate);
  const diffTime = Math.abs(now - orderDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

// Check if order is overdue
orderSchema.methods.isOverdue = function() {
  if (!this.expectedDeliveryDate) return false;
  const now = new Date();
  return now > this.expectedDeliveryDate && !['delivered', 'cancelled'].includes(this.orderStatus);
};

module.exports = mongoose.model('Order', orderSchema);
