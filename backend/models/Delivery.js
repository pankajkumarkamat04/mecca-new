const mongoose = require('mongoose');

const deliveryItemSchema = new mongoose.Schema({
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
  total: {
    type: Number,
    required: true
  }
});

const deliveryStatusUpdateSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['preparing', 'ready_for_delivery', 'out_for_delivery', 'in_transit', 'delivered', 'failed', 'returned'],
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  location: {
    latitude: Number,
    longitude: Number,
    address: String,
    city: String,
    state: String,
    country: String
  },
  notes: String,
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  deliveryPerson: {
    name: String,
    phone: String,
    vehicleNumber: String
  }
});

const deliverySchema = new mongoose.Schema({
  deliveryNumber: {
    type: String,
    required: true,
    unique: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  orderNumber: {
    type: String,
    required: true
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
  customerPhone: {
    type: String,
    required: true
  },
  customerEmail: String,
  deliveryAddress: {
    street: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    state: {
      type: String,
      required: true
    },
    zipCode: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    landmark: String,
    instructions: String
  },
  items: [deliveryItemSchema],
  deliveryFee: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['preparing', 'ready_for_delivery', 'out_for_delivery', 'in_transit', 'delivered', 'failed', 'returned'],
    default: 'preparing'
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  },
  scheduledDate: Date,
  scheduledTimeSlot: {
    start: String, // HH:MM format
    end: String    // HH:MM format
  },
  actualDeliveryDate: Date,
  deliveryMethod: {
    type: String,
    enum: ['standard', 'express', 'same_day', 'scheduled'],
    default: 'standard'
  },
  carrier: {
    name: String,
    trackingNumber: String,
    contact: {
      phone: String,
      email: String
    }
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  driverDetails: {
    name: String,
    phone: String,
    vehicleNumber: String,
    licenseNumber: String
  },
  statusUpdates: [deliveryStatusUpdateSchema],
  deliveryProof: {
    signature: String, // Base64 encoded signature
    photo: String,     // URL to delivery photo
    receivedBy: String,
    idNumber: String,
    idType: {
      type: String,
      enum: ['drivers_license', 'passport', 'national_id', 'other']
    },
    notes: String
  },
  failureReason: {
    code: {
      type: String,
      enum: ['customer_not_available', 'wrong_address', 'damaged_goods', 'customer_refused', 'weather', 'vehicle_breakdown', 'other']
    },
    description: String,
    rescheduleDate: Date
  },
  returnDetails: {
    reason: String,
    returnDate: Date,
    returnLocation: String,
    items: [{
      product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      },
      quantity: Number,
      condition: {
        type: String,
        enum: ['good', 'damaged', 'defective']
      }
    }]
  },
  estimatedDeliveryTime: Date,
  actualDeliveryTime: Date,
  distance: Number, // in kilometers
  estimatedDuration: Number, // in minutes
  actualDuration: Number, // in minutes
  notes: String,
  internalNotes: String,
  tags: [String],
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

// Generate delivery number
deliverySchema.statics.generateDeliveryNumber = async function() {
  const count = await this.countDocuments();
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const number = String(count + 1).padStart(4, '0');
  return `DEL-${year}${month}-${number}`;
};

// Update delivery status
deliverySchema.methods.updateStatus = function(newStatus, notes = '', location = null, deliveryPerson = null) {
  this.status = newStatus;
  
  // Add status update
  this.statusUpdates.push({
    status: newStatus,
    timestamp: new Date(),
    location: location,
    notes: notes,
    deliveryPerson: deliveryPerson
  });

  // Set delivery date when delivered
  if (newStatus === 'delivered') {
    this.actualDeliveryDate = new Date();
    this.actualDeliveryTime = new Date();
  }

  return this.save();
};

// Check if delivery can be updated
deliverySchema.methods.canBeUpdated = function() {
  return !['delivered', 'returned'].includes(this.status);
};

// Check if delivery is overdue
deliverySchema.methods.isOverdue = function() {
  if (!this.scheduledDate) return false;
  const now = new Date();
  return now > this.scheduledDate && !['delivered', 'failed', 'returned'].includes(this.status);
};

// Calculate delivery duration
deliverySchema.methods.calculateDuration = function() {
  if (this.actualDeliveryTime && this.createdAt) {
    const diffTime = Math.abs(this.actualDeliveryTime - this.createdAt);
    this.actualDuration = Math.round(diffTime / (1000 * 60)); // in minutes
  }
  return this.save();
};

// Get delivery progress percentage
deliverySchema.methods.getProgressPercentage = function() {
  const statusOrder = ['preparing', 'ready_for_delivery', 'out_for_delivery', 'in_transit', 'delivered'];
  const currentIndex = statusOrder.indexOf(this.status);
  return currentIndex >= 0 ? ((currentIndex + 1) / statusOrder.length) * 100 : 0;
};

// Check if delivery requires signature
deliverySchema.methods.requiresSignature = function() {
  const totalAmount = this.items.reduce((sum, item) => sum + item.total, 0);
  return totalAmount > 100; // Require signature for orders over $100
};

module.exports = mongoose.model('Delivery', deliverySchema);
