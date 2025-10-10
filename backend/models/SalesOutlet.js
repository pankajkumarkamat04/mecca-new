const mongoose = require('mongoose');

const salesOutletSchema = new mongoose.Schema({
  outletCode: {
    type: String,
    required: [true, 'Outlet code is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Outlet name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['retail', 'warehouse', 'online', 'mobile', 'kiosk', 'branch'],
    default: 'retail'
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' }
  },
  contact: {
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    manager: { type: String, default: '' }
  },
  operatingHours: {
    monday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    tuesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    thursday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    friday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    saturday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
    sunday: { open: String, close: String, isClosed: { type: Boolean, default: true } }
  },
  warehouse: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Warehouse'
  },
  stats: {
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    lastSaleDate: Date,
    averageTransactionValue: { type: Number, default: 0 }
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
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full address
salesOutletSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.address.street,
    this.address.city,
    this.address.state,
    this.address.zipCode,
    this.address.country
  ].filter(Boolean);
  return parts.join(', ');
});

// Indexes
salesOutletSchema.index({ outletCode: 1 });
salesOutletSchema.index({ isActive: 1 });
salesOutletSchema.index({ type: 1 });

// Method to update sales stats
salesOutletSchema.methods.updateSalesStats = async function(saleAmount) {
  this.stats.totalSales += saleAmount;
  this.stats.totalTransactions += 1;
  this.stats.lastSaleDate = new Date();
  this.stats.averageTransactionValue = this.stats.totalSales / this.stats.totalTransactions;
  await this.save();
  return this;
};

module.exports = mongoose.model('SalesOutlet', salesOutletSchema);

