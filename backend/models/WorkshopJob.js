const mongoose = require('mongoose');

const jobTaskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assigneeName: { type: String, trim: true }, // Cached name for performance
  status: { type: String, enum: ['todo', 'in_progress', 'review', 'completed', 'cancelled'], default: 'todo' },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  estimatedDuration: { type: Number, min: 0 }, // in minutes
  actualDuration: { type: Number, min: 0 }, // in minutes
  startedAt: Date,
  completedAt: Date,
  notes: { type: String, trim: true },
  attachments: [{
    filename: { type: String, required: true },
    url: { type: String, required: true },
    fileType: { type: String },
    size: { type: Number },
    uploadedAt: { type: Date, default: Date.now }
  }],
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'JobTask' }], // Task dependencies
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  lastUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const jobPartSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, trim: true }, // Cached name for performance
  productSku: { type: String, trim: true }, // Cached SKU for performance
  quantityRequired: { type: Number, required: true, min: 0 },
  quantityUsed: { type: Number, default: 0, min: 0 },
  quantityAvailable: { type: Number, default: 0, min: 0 }, // Current stock level
  unitCost: { type: Number, min: 0 }, // Cost per unit
  totalCost: { type: Number, min: 0 }, // Total cost for this part
  isAvailable: { type: Boolean, default: true }, // Whether part is available in stock
  notes: { type: String, trim: true },
  reservedAt: { type: Date }, // When part was reserved
  reservedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  issuedAt: { type: Date }, // When part was issued for use
  issuedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

const jobToolSchema = new mongoose.Schema({
  name: { type: String, required: true },
  toolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tool' }, // Reference to tool inventory
  category: { type: String, trim: true }, // e.g., 'hand_tool', 'power_tool', 'specialty_tool'
  condition: { type: String, enum: ['excellent', 'good', 'fair', 'poor'], default: 'good' },
  notes: { type: String, trim: true },
  requiredFrom: { type: Date }, // When tool is needed
  requiredUntil: { type: Date }, // When tool should be returned
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedAt: { type: Date },
  returnedAt: { type: Date },
  returnedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

const workshopJobSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  customerPhone: { type: String, trim: true },
  priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' },
  status: { type: String, enum: ['draft', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled'], default: 'draft', index: true },
  deadline: Date,
  scheduled: {
    start: Date,
    end: Date,
    estimatedDuration: { type: Number, min: 0 }, // in minutes
    actualDuration: { type: Number, min: 0 }, // in minutes
  },
  // Resource allocation
  resources: {
    assignedTechnicians: [{ 
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: { type: String, trim: true }, // Cached name
      role: { type: String, trim: true }, // e.g., 'lead_technician', 'assistant', 'specialist'
      assignedAt: { type: Date, default: Date.now },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    requiredMachines: [{
      name: { type: String, required: true },
      machineId: { type: mongoose.Schema.Types.ObjectId, ref: 'Machine' },
      requiredFrom: { type: Date },
      requiredUntil: { type: Date },
      isAvailable: { type: Boolean, default: true },
      assignedAt: { type: Date },
      assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
    }],
    workStations: [{
      name: { type: String, required: true },
      stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkStation' },
      requiredFrom: { type: Date },
      requiredUntil: { type: Date },
      isAvailable: { type: Boolean, default: true }
    }]
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
    customerInquiry: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerInquiry' },
    quotation: { type: mongoose.Schema.Types.ObjectId, ref: 'Quotation' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }
  },
  // Job card management
  jobCard: {
    cardNumber: { type: String, unique: true, sparse: true },
    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
    lastPrintedAt: { type: Date },
    printedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerSignature: { type: String, trim: true },
    customerSignedAt: { type: Date },
    technicianSignature: { type: String, trim: true },
    technicianSignedAt: { type: Date },
    supervisorSignature: { type: String, trim: true },
    supervisorSignedAt: { type: Date }
  },
  // Customer portal visibility
  customerPortal: {
    isVisible: { type: Boolean, default: true },
    showProgress: { type: Boolean, default: true },
    showTasks: { type: Boolean, default: true },
    showParts: { type: Boolean, default: false }, // Hide parts from customer by default
    showTools: { type: Boolean, default: false }, // Hide tools from customer by default
    allowComments: { type: Boolean, default: true },
    lastViewedAt: { type: Date },
    notificationsEnabled: { type: Boolean, default: true }
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

// Indexes for better performance
workshopJobSchema.index({ customer: 1, status: 1, priority: 1 });
workshopJobSchema.index({ 'jobCard.cardNumber': 1 });
workshopJobSchema.index({ 'scheduled.start': 1, 'scheduled.end': 1 });
workshopJobSchema.index({ 'resources.assignedTechnicians.user': 1 });
workshopJobSchema.index({ createdBy: 1, createdAt: -1 });

// Virtual fields
workshopJobSchema.virtual('isOverdue').get(function() {
  return this.deadline && new Date() > this.deadline && this.status !== 'completed';
});

workshopJobSchema.virtual('totalEstimatedDuration').get(function() {
  return this.tasks.reduce((total, task) => total + (task.estimatedDuration || 0), 0);
});

workshopJobSchema.virtual('totalActualDuration').get(function() {
  return this.tasks.reduce((total, task) => total + (task.actualDuration || 0), 0);
});

workshopJobSchema.virtual('completionPercentage').get(function() {
  if (!this.tasks || this.tasks.length === 0) return 0;
  const completedTasks = this.tasks.filter(task => task.status === 'completed').length;
  return Math.round((completedTasks / this.tasks.length) * 100);
});

workshopJobSchema.virtual('assignedTechnicianNames').get(function() {
  return this.resources.assignedTechnicians.map(t => t.name).join(', ');
});

// Instance methods
workshopJobSchema.methods.generateJobCardNumber = async function() {
  const count = await this.constructor.countDocuments();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `JC-${year}${month}-${number}`;
};

workshopJobSchema.methods.assignTechnician = function(userId, userName, role = 'technician', assignedBy) {
  const existing = this.resources.assignedTechnicians.find(t => t.user.toString() === userId.toString());
  if (!existing) {
    this.resources.assignedTechnicians.push({
      user: userId,
      name: userName,
      role: role,
      assignedAt: new Date(),
      assignedBy: assignedBy
    });
  }
};

workshopJobSchema.methods.removeTechnician = function(userId) {
  this.resources.assignedTechnicians = this.resources.assignedTechnicians.filter(
    t => t.user.toString() !== userId.toString()
  );
};

workshopJobSchema.methods.updateProgress = function() {
  if (!this.tasks || this.tasks.length === 0) {
    this.progress = 0;
    return;
  }
  this.progress = this.completionPercentage;
};

workshopJobSchema.methods.checkPartsAvailability = async function() {
  const Product = require('./Product');
  
  for (const part of this.parts) {
    const product = await Product.findById(part.product);
    if (product) {
      part.productName = product.name;
      part.productSku = product.sku;
      part.quantityAvailable = product.inventory?.currentStock || 0;
      part.unitCost = product.pricing?.costPrice || 0;
      part.totalCost = part.unitCost * part.quantityRequired;
      part.isAvailable = part.quantityAvailable >= part.quantityRequired;
    }
  }
  
  await this.save();
};

// Pre-save middleware
workshopJobSchema.pre('save', async function(next) {
  // Generate job card number if not exists
  if (!this.jobCard.cardNumber && this.status !== 'draft') {
    this.jobCard.cardNumber = await this.generateJobCardNumber();
  }
  
  // Update progress based on tasks
  this.updateProgress();
  
  next();
});

module.exports = mongoose.model('WorkshopJob', workshopJobSchema);


