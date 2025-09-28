const mongoose = require('mongoose');

const quotationItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  name: {
    type: String,
    required: true
  },
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
  }
});

const quotationSchema = new mongoose.Schema({
  quotationNumber: {
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
  quotationDate: {
    type: Date,
    default: Date.now
  },
  validUntil: {
    type: Date,
    required: true
  },
  items: [quotationItemSchema],
  subtotal: {
    type: Number,
    required: true,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  taxes: [{
    name: String,
    rate: {
      type: Number,
      required: true
    },
    amount: {
      type: Number,
      required: true
    }
  }],
  totalTax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0
  },
  notes: String,
  terms: String,
  status: {
    type: String,
    enum: ['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted'],
    default: 'draft'
  },
  sentAt: Date,
  viewedAt: Date,
  acceptedAt: Date,
  rejectedAt: Date,
  convertedAt: Date,
  convertedToInvoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  convertedToOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
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
quotationSchema.pre('save', function(next) {
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

  // Calculate total tax from both taxes array and individual item taxes
  const taxesArrayTotal = this.taxes.reduce((sum, tax) => sum + tax.amount, 0);
  const itemTaxesTotal = this.items.reduce((sum, item) => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
    const taxAmount = (afterDiscount * item.taxRate) / 100;
    return sum + taxAmount;
  }, 0);
  this.totalTax = taxesArrayTotal + itemTaxesTotal;

  // Calculate total amount
  this.totalAmount = this.subtotal + this.totalTax;

  next();
});

// Generate quotation number
quotationSchema.statics.generateQuotationNumber = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `QUO-${year}${month}-${number}`;
};

// Check if quotation is expired
quotationSchema.methods.isExpired = function() {
  return this.validUntil < new Date() && this.status !== 'converted';
};

// Mark as sent
quotationSchema.methods.markAsSent = function() {
  this.status = 'sent';
  this.sentAt = new Date();
  return this.save();
};

// Mark as viewed
quotationSchema.methods.markAsViewed = function() {
  if (this.status === 'sent') {
    this.status = 'viewed';
    this.viewedAt = new Date();
    return this.save();
  }
  return Promise.resolve(this);
};

// Mark as accepted
quotationSchema.methods.markAsAccepted = function() {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  return this.save();
};

// Mark as rejected
quotationSchema.methods.markAsRejected = function() {
  this.status = 'rejected';
  this.rejectedAt = new Date();
  return this.save();
};

// Convert to invoice
quotationSchema.methods.convertToInvoice = function(invoiceId) {
  this.status = 'converted';
  this.convertedAt = new Date();
  this.convertedToInvoice = invoiceId;
  return this.save();
};

module.exports = mongoose.model('Quotation', quotationSchema);
