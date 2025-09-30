const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reportNumber: {
    type: String,
    unique: true,
    trim: true,
    sparse: true // Allow undefined values until pre-save hook generates it
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sales', 'inventory', 'purchase', 'profit_loss', 'balance_sheet', 'custom'],
    required: true
  },
  description: {
    type: String,
    trim: true
  },
  dateRange: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  filters: {
    category: String,
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer'
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier'
    },
    status: String,
    paymentMethod: String,
    location: String
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  summary: {
    totalSales: Number,
    totalInvoices: Number,
    totalPurchases: Number,
    totalProducts: Number,
    averageInvoice: Number,
    grossProfit: Number,
    netProfit: Number
  },
  status: {
    type: String,
    enum: ['draft', 'final', 'archived'],
    default: 'final'
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedAt: {
    type: Date,
    default: Date.now
  },
  format: {
    type: String,
    enum: ['json', 'pdf', 'excel', 'csv'],
    default: 'json'
  },
  fileUrl: String,
  notes: {
    type: String,
    maxlength: 1000
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

// Virtual for report period
reportSchema.virtual('period').get(function() {
  const start = this.dateRange.startDate.toISOString().split('T')[0];
  const end = this.dateRange.endDate.toISOString().split('T')[0];
  return `${start} to ${end}`;
});

// Indexes
reportSchema.index({ type: 1 });
reportSchema.index({ status: 1 });
reportSchema.index({ generatedBy: 1 });
reportSchema.index({ generatedAt: -1 });
reportSchema.index({ 'dateRange.startDate': 1, 'dateRange.endDate': 1 });

// Auto-generate report number
reportSchema.pre('save', async function(next) {
  if (!this.reportNumber) {
    try {
      const Report = mongoose.model('Report');
      const count = await Report.countDocuments();
      const typeCode = this.type.substring(0, 3).toUpperCase();
      this.reportNumber = `RPT-${typeCode}-${String(count + 1).padStart(5, '0')}`;
      next();
    } catch (error) {
      next(error);
    }
  } else {
    next();
  }
});

module.exports = mongoose.model('Report', reportSchema);
