const mongoose = require('mongoose');

const jobTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled'], default: 'todo' },
  startedAt: Date,
  completedAt: Date,
});

const jobPartSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantityRequired: { type: Number, required: true, min: 0 },
  quantityUsed: { type: Number, default: 0, min: 0 },
});

const jobToolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  notes: { type: String, trim: true },
});

const workshopJobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['draft', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled'], default: 'draft', index: true },
  deadline: Date,
  scheduled: {
    start: Date,
    end: Date,
  },
  // Vehicle details (from job card header)
  vehicle: {
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    odometer: { type: Number, min: 0 },
    regNumber: { type: String, trim: true },
    vinNumber: { type: String, trim: true },
    technicianNames: { type: String, trim: true },
    timeIn: { type: Date },
    timeForCollection: { type: Date },
    orderNumber: { type: String, trim: true },
    contactName: { type: String, trim: true },
    telCell: { type: String, trim: true },
    address: { type: String, trim: true },
  },
  // Repair request summary and notes
  repairRequest: { type: String, trim: true },

  // Sublets and parts lists captured on job card
  sublets: [{
    description: { type: String, trim: true },
    amount: { type: Number, min: 0 },
  }],
  tasks: [jobTaskSchema],
  parts: [jobPartSchema],
  tools: [jobToolSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  progress: { type: Number, default: 0, min: 0, max: 100 },
  isActive: { type: Boolean, default: true },
  links: {
    customerPortalUrl: { type: String, trim: true },
    workOrderRef: { type: String, trim: true },
  },
  // Vehicle pre-check form
  precheck: {
    alarms: { type: Boolean, default: false },
    scratches: { type: Boolean, default: false },
    lights: { type: Boolean, default: false },
    windows: { type: Boolean, default: false },
    mats: { type: Boolean, default: false },
    centralLocking: { type: Boolean, default: false },
    dents: { type: Boolean, default: false },
    spareWheel: { type: Boolean, default: false },
    windscreen: { type: Boolean, default: false },
    wheelLockNut: { type: Boolean, default: false },
    antiHijack: { type: Boolean, default: false },
    brokenParts: { type: Boolean, default: false },
    toolsAndJacks: { type: Boolean, default: false },
    hubCaps: { type: Boolean, default: false },
    radioFace: { type: Boolean, default: false },
    mirrors: { type: Boolean, default: false },
    tires: { type: Boolean, default: false },
    brakes: { type: Boolean, default: false },
    battery: { type: Boolean, default: false },
    engine: { type: Boolean, default: false },
    fuelLevel: { type: String, enum: ['E','1/4','1/2','3/4','F'], default: 'E' },
    overallCondition: { type: String, enum: ['poor','avg','good','excellent'], default: 'good' },
    otherComments: { type: String, trim: true },
    customerSignature: { type: String, trim: true }, // could store signature data/url
    customerSignedAt: { type: Date },
    meccaSignature: { type: String, trim: true },
    meccaSignedAt: { type: Date },
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

workshopJobSchema.index({ customer: 1, status: 1, priority: 1 });

module.exports = mongoose.model('WorkshopJob', workshopJobSchema);


