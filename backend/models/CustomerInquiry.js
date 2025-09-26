const mongoose = require('mongoose');

const inquiryItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
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
  estimatedPrice: {
    type: Number,
    min: 0
  },
  specifications: String,
  notes: String
});

const customerInquirySchema = new mongoose.Schema({
  inquiryNumber: {
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
  customerCompany: String,
  inquiryDate: {
    type: Date,
    default: Date.now
  },
  source: {
    type: String,
    enum: ['website', 'email', 'phone', 'walk_in', 'referral', 'social_media', 'other'],
    default: 'website'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['new', 'under_review', 'quoted', 'converted_to_order', 'closed', 'cancelled'],
    default: 'new'
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  items: [inquiryItemSchema],
  estimatedBudget: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD'
    }
  },
  requiredDeliveryDate: Date,
  preferredContactMethod: {
    type: String,
    enum: ['email', 'phone', 'in_person'],
    default: 'email'
  },
  quotation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quotation'
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  internalNotes: String,
  customerNotes: String,
  followUpDate: Date,
  tags: [String],
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
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

// Generate inquiry number
customerInquirySchema.statics.generateInquiryNumber = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `INQ-${year}${month}-${number}`;
};

// Check if inquiry can be converted to quotation
customerInquirySchema.methods.canBeQuoted = function() {
  return ['new', 'under_review'].includes(this.status);
};

// Check if inquiry can be converted to order
customerInquirySchema.methods.canBeOrdered = function() {
  return ['quoted'].includes(this.status);
};

// Update inquiry status
customerInquirySchema.methods.updateStatus = function(newStatus, notes = '') {
  this.status = newStatus;
  
  if (notes) {
    this.internalNotes = (this.internalNotes || '') + `\n[${new Date().toISOString()}] ${newStatus.toUpperCase()}: ${notes}`;
  }

  return this.save();
};

// Mark as quoted
customerInquirySchema.methods.markAsQuoted = function(quotationId) {
  this.status = 'quoted';
  this.quotation = quotationId;
  return this.save();
};

// Mark as converted to order
customerInquirySchema.methods.markAsConvertedToOrder = function(orderId) {
  this.status = 'converted_to_order';
  this.order = orderId;
  return this.save();
};

// Check if inquiry is overdue for follow-up
customerInquirySchema.methods.isOverdueForFollowUp = function() {
  if (!this.followUpDate) return false;
  return new Date() > this.followUpDate && ['new', 'under_review'].includes(this.status);
};

// Get inquiry age in days
customerInquirySchema.methods.getAgeInDays = function() {
  const now = new Date();
  const inquiryDate = new Date(this.inquiryDate);
  const diffTime = Math.abs(now - inquiryDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = mongoose.model('CustomerInquiry', customerInquirySchema);
