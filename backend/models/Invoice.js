const mongoose = require('mongoose');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: [true, 'Invoice number is required'],
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sale', 'proforma', 'credit_note', 'debit_note', 'delivery_note'],
    default: 'sale'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'paid', 'partial', 'overdue', 'cancelled', 'refunded'],
    default: 'pending'
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer'
  },
  customerPhone: {
    type: String,
    required: [true, 'Customer phone number is required'],
    trim: true,
    match: [/^\+?[\d\s\-\(\)]+$/, 'Please enter a valid phone number']
  },
  location: {
    type: String,
    default: 'default'
  },
  salesOutlet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SalesOutlet'
  },
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  salesPersonName: {
    type: String,
    trim: true
  },
  salesPersonEmail: {
    type: String,
    trim: true
  },
  items: [{
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
    sku: String,
    quantity: {
      type: Number,
      required: true,
      min: [0.01, 'Quantity must be greater than 0']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
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
  }],
  subtotal: {
    type: Number,
    required: true,
    min: [0, 'Subtotal cannot be negative']
  },
  discounts: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    value: {
      type: Number,
      required: true
    },
    description: String
  }],
  totalDiscount: {
    type: Number,
    default: 0,
    min: [0, 'Total discount cannot be negative']
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
    default: 0,
    min: [0, 'Total tax cannot be negative']
  },
  shipping: {
    method: String,
    cost: {
      type: Number,
      default: 0,
      min: [0, 'Shipping cost cannot be negative']
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String
    }
  },
  total: {
    type: Number,
    required: true,
    min: [0, 'Total cannot be negative']
  },
  paid: {
    type: Number,
    default: 0,
    min: [0, 'Paid amount cannot be negative']
  },
  balance: {
    type: Number,
    default: 0
  },
  currency: {
    baseCurrency: { type: String, default: 'USD' },
    displayCurrency: { type: String, default: 'USD' },
    exchangeRate: { type: Number, default: 1 },
    exchangeRateDate: { type: Date, default: Date.now }
  },
  payments: [{
    method: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'stripe', 'paypal', 'other'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    reference: String,
    transactionId: String,
    gatewayResponse: mongoose.Schema.Types.Mixed,
    metadata: mongoose.Schema.Types.Mixed,
    date: {
      type: Date,
      default: Date.now
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  dueDate: Date,
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  notes: String,
  terms: String,
  qrCode: {
    data: String,
    url: String
  },
  pdfUrl: String,
  emailSent: {
    type: Boolean,
    default: false
  },
  smsSent: {
    type: Boolean,
    default: false
  },
  onlinePaymentLink: {
    url: String,
    token: String,
    expiresAt: Date
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringSettings: {
    frequency: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'yearly']
    },
    interval: Number,
    nextDate: Date,
    endDate: Date,
    parentInvoice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPosTransaction: {
    type: Boolean,
    default: false
  },
  isWorkshopTransaction: {
    type: Boolean,
    default: false
  },
  workshopJob: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'WorkshopJob'
  },
  workshopJobNumber: {
    type: String,
    trim: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for invoice status color
invoiceSchema.virtual('statusColor').get(function() {
  const statusColors = {
    draft: 'gray',
    pending: 'yellow',
    paid: 'green',
    partial: 'blue',
    overdue: 'red',
    cancelled: 'gray',
    refunded: 'purple'
  };
  return statusColors[this.status] || 'gray';
});

// Virtual for days overdue
invoiceSchema.virtual('daysOverdue').get(function() {
  if (this.status === 'overdue' && this.dueDate) {
    return Math.max(0, Math.floor((new Date() - this.dueDate) / (1000 * 60 * 60 * 24)));
  }
  return 0;
});

// Indexes
invoiceSchema.index({ customer: 1 });
invoiceSchema.index({ customerPhone: 1 });
invoiceSchema.index({ location: 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ invoiceDate: -1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ 'onlinePaymentLink.token': 1 });

// Pre-save middleware to calculate totals
invoiceSchema.pre('save', function(next) {
  // Calculate item totals (without tax for subtotal calculation)
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
  this.totalDiscount = this.discounts.reduce((sum, discount) => {
    if (discount.type === 'percentage') {
      return sum + (this.subtotal * discount.value / 100);
    } else {
      return sum + discount.value;
    }
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

  // Calculate final total
  this.total = this.subtotal - this.totalDiscount + this.totalTax + (this.shipping?.cost || 0);

  // Calculate balance
  this.balance = this.total - this.paid;

  // Update status based on payment
  if (this.balance <= 0 && this.total > 0) {
    this.status = 'paid';
  } else if (this.paid > 0) {
    this.status = 'partial';
  } else if (this.dueDate && new Date() > this.dueDate && this.balance > 0) {
    this.status = 'overdue';
  }

  next();
});

// Method to add payment
invoiceSchema.methods.addPayment = async function(paymentData) {
  this.payments.push(paymentData);
  this.paid += paymentData.amount;
  
  // Save the invoice first to trigger pre-save hooks
  await this.save();
  
  // Create accounting transaction for the payment
  try {
    const Transaction = require('./Transaction');
    const Account = require('./Account');
    
    // Find the appropriate accounts
    const cashAccount = await Account.findOne({ 
      $or: [
        { name: /cash/i },
        { code: 'CASH' },
        { type: 'asset', category: 'current_assets' }
      ]
    });
    
    const salesAccount = await Account.findOne({ 
      $or: [
        { name: /sales/i },
        { code: 'SALES' },
        { type: 'revenue', category: 'sales_revenue' }
      ]
    });
    
    if (cashAccount && salesAccount) {
      const transaction = new Transaction({
        transactionNumber: undefined, // Will be auto-generated
        date: paymentData.date || new Date(),
        description: `Payment received for invoice ${this.invoiceNumber}`,
        type: 'sale',
        reference: this.invoiceNumber,
        referenceId: this._id,
        amount: paymentData.amount,
        currency: this.currency?.baseCurrency || 'USD',
        entries: [
          { 
            account: cashAccount._id, 
            debit: paymentData.amount, 
            credit: 0, 
            description: `Payment received for invoice ${this.invoiceNumber}` 
          },
          { 
            account: salesAccount._id, 
            debit: 0, 
            credit: paymentData.amount, 
            description: `Sales revenue from invoice ${this.invoiceNumber}` 
          }
        ],
        customer: this.customer,
        invoice: this._id,
        paymentMethod: paymentData.method,
        status: 'posted',
        createdBy: paymentData.processedBy,
        metadata: {
          salesPerson: this.salesPerson ? {
            id: this.salesPerson,
            name: this.salesPersonName || 'Unknown',
            email: this.salesPersonEmail || ''
          } : undefined,
          salesOutlet: this.salesOutlet,
          workshopJob: this.workshopJob ? {
            id: this.workshopJob,
            jobNumber: this.workshopJobNumber || 'Unknown'
          } : undefined,
          paymentReference: paymentData.reference,
          paymentTransactionId: paymentData.transactionId
        }
      });
      
      await transaction.save();
      console.log(`Accounting transaction created for invoice ${this.invoiceNumber} payment of ${paymentData.amount}`);
    } else {
      console.warn('Could not find cash or sales account for payment transaction');
    }
  } catch (error) {
    console.error('Error creating payment transaction:', error);
    // Don't fail the payment if transaction creation fails
  }
  
  // Update corresponding order payment status if order exists
  if (this.order) {
    const Order = require('./Order');
    const order = await Order.findById(this.order);
    
    if (order) {
      // Map invoice status to order payment status
      let orderPaymentStatus = order.paymentStatus;
      switch (this.status) {
        case 'pending':
          orderPaymentStatus = 'pending';
          break;
        case 'partial':
          orderPaymentStatus = 'partial';
          break;
        case 'paid':
          orderPaymentStatus = 'paid';
          break;
        case 'refunded':
          orderPaymentStatus = 'refunded';
          break;
        case 'cancelled':
          orderPaymentStatus = 'cancelled';
          break;
        default:
          orderPaymentStatus = 'pending';
      }
      
      if (order.paymentStatus !== orderPaymentStatus) {
        order.paymentStatus = orderPaymentStatus;
        await order.save();
        console.log(`Order ${order.orderNumber} payment status updated to ${orderPaymentStatus} for invoice ${this.invoiceNumber}`);
      }
    }
  }
  
  return this;
};

// Method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function(type = 'sale') {
  const prefix = type.toUpperCase().substring(0, 3);
  const count = await this.countDocuments({ type });
  const year = new Date().getFullYear();
  const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
  const number = (count + 1).toString().padStart(4, '0');
  return `${prefix}-${year}${month}-${number}`;
};

module.exports = mongoose.model('Invoice', invoiceSchema);
