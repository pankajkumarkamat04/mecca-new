const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, default: '' },
  code: { type: String, default: '' },
  taxId: { type: String, default: '' },
  website: { type: String, default: '' },
  email: { type: String, default: '' },
  phone: { type: String, default: '' },
  logo: { 
    url: { type: String, default: '' },
    filename: { type: String, default: '' },
    originalName: { type: String, default: '' }
  },
  address: {
    street: { type: String, default: '' },
    city: { type: String, default: '' },
    state: { type: String, default: '' },
    zipCode: { type: String, default: '' },
    country: { type: String, default: '' },
  },
  defaultCurrency: { type: String, default: 'USD' },
  defaultTaxRate: { type: Number, default: 10 },
  invoiceSettings: {
    prefix: { type: String, default: 'INV' },
    numberFormat: { type: String, default: 'INV-{YYYY}-{MM}-{####}' },
    footerText: { type: String, default: 'Thank you for your business!' },
    termsAndConditions: { type: String, default: '' },
  },
  posSettings: {
    receiptHeader: { type: String, default: '' },
    receiptFooter: { type: String, default: '' },
    showTaxBreakdown: { type: Boolean, default: true },
    autoPrint: { type: Boolean, default: false },
  },
}, { _id: false });

const appearanceSchema = new mongoose.Schema({
  theme: { type: String, enum: ['light', 'dark', 'auto'], default: 'light' },
  language: { type: String, default: 'en' },
  timezone: { type: String, default: 'UTC' },
  dateFormat: { type: String, default: 'MM/DD/YYYY' },
}, { _id: false });

const notificationsSchema = new mongoose.Schema({
  email: { type: Boolean, default: true },
  sms: { type: Boolean, default: false },
  push: { type: Boolean, default: true },
  lowStockAlert: { type: Boolean, default: true },
  newOrderAlert: { type: Boolean, default: true },
  paymentReminder: { type: Boolean, default: true },
}, { _id: false });

const systemSchema = new mongoose.Schema({
  maintenanceMode: { type: Boolean, default: false },
  allowRegistration: { type: Boolean, default: true },
  sessionTimeout: { type: Number, default: 30 }, // minutes
  maxLoginAttempts: { type: Number, default: 5 },
  passwordPolicy: {
    minLength: { type: Number, default: 8 },
    requireUppercase: { type: Boolean, default: true },
    requireLowercase: { type: Boolean, default: true },
    requireNumbers: { type: Boolean, default: true },
    requireSpecialChars: { type: Boolean, default: false },
  },
  backupSettings: {
    autoBackup: { type: Boolean, default: true },
    backupFrequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
    retentionDays: { type: Number, default: 30 },
  },
}, { _id: false });

const settingSchema = new mongoose.Schema({
  company: { type: companySchema, default: () => ({}) },
  appearance: { type: appearanceSchema, default: () => ({}) },
  notifications: { type: notificationsSchema, default: () => ({}) },
  system: { type: systemSchema, default: () => ({}) },
  isActive: { type: Boolean, default: true },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

settingSchema.statics.getSingleton = async function() {
  const Setting = this;
  let doc = await Setting.findOne({ isActive: true });
  if (!doc) {
    doc = await Setting.create({});
  }
  return doc;
};

module.exports = mongoose.model('Setting', settingSchema);


