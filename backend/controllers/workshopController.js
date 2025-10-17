const mongoose = require('mongoose');
const WorkshopJob = require('../models/WorkshopJob');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const StockMovement = require('../models/StockMovement');
const Machine = require('../models/Machine');
const Tool = require('../models/Tool');
const WorkStation = require('../models/WorkStation');
const ServiceTemplate = require('../models/ServiceTemplate');

// Internal helper to process completion: deduct inventory and create invoice
async function processJobCompletion(jobId, userId) {
  const Invoice = require('../models/Invoice');
  // Load latest job with parts populated
  const job = await WorkshopJob.findById(jobId).populate('parts.product', 'name sku pricing inventory');
  if (!job) return { job: null };

  // Load default tax rate from settings (fallback if product has no tax)
  const settingsDoc = await Setting.getSingleton();
  const defaultTaxRate = Number(settingsDoc?.company?.defaultTaxRate ?? 0);
  

  // Deduct used parts (fallback to quantityRequired if quantityUsed missing)
  
  for (const part of (job.parts || [])) {
    const rawProduct = part.product && (part.product._id || part.product);
    const qtyUsedRaw = Number(part.quantityUsed ?? 0);
    const qtyReqRaw = Number(part.quantityRequired ?? 0);
    const usedQty = qtyUsedRaw > 0 ? qtyUsedRaw : (qtyReqRaw > 0 ? qtyReqRaw : 0);
    
    if (!part.product || usedQty <= 0) continue;
    const product = await Product.findById(part.product._id || part.product);
    if (!product) continue;

    const previousStock = Number(product.inventory?.currentStock ?? 0);
    const newStock = Math.max(0, previousStock - usedQty);
    const unitCost = Number(product.pricing?.costPrice ?? 0);

    const movement = new StockMovement({
      product: product._id,
      movementType: 'out',
      quantity: usedQty,
      unitCost,
      totalCost: unitCost * usedQty,
      previousStock,
      newStock,
      reason: `Workshop job ${job._id} completion`,
      createdBy: userId,
    });
    await movement.save();
    

    product.inventory.currentStock = newStock;
    await product.save();
    
  }

  // Mark job completed
  job.status = 'completed';
  job.progress = 100;
  await job.save();
  
  // Complete job for all assigned technicians and make them available
  if (job.resources && job.resources.assignedTechnicians) {
    for (const assignedTech of job.resources.assignedTechnicians) {
      const technician = await Technician.findById(assignedTech.user);
      if (technician) {
        technician.completeJob(job._id);
        technician.isCurrentlyAvailable = true;
        await technician.save();
      }
    }
  }
  
  // Return all assigned tools
  if (job.tools && job.tools.length > 0) {
    for (const jobTool of job.tools) {
      if (jobTool.toolId) {
        const tool = await Tool.findById(jobTool.toolId);
        if (tool) {
          tool.returnTool();
          await tool.save();
        }
      }
    }
  }
  

  // Build invoice items from used parts
  const items = [];
  for (const part of (job.parts || [])) {
    const qtyUsedRaw = Number(part.quantityUsed ?? 0);
    const qtyReqRaw = Number(part.quantityRequired ?? 0);
    const usedQty = qtyUsedRaw > 0 ? qtyUsedRaw : (qtyReqRaw > 0 ? qtyReqRaw : 0);
    if (!part.product || usedQty <= 0) continue;
    const product = await Product.findById(part.product._id || part.product);
    if (!product) continue;
    const taxRate = Number(product.pricing?.taxRate ?? defaultTaxRate ?? 0);
    items.push({
      product: product._id,
      name: product.name,
      description: product.description || undefined,
      sku: product.sku,
      quantity: usedQty,
      unitPrice: Number(product.pricing?.sellingPrice ?? 0),
      discount: 0,
      taxRate,
      total: 0,
    });
  }

  if (items.length > 0) {
    try {
      // Validate that customerPhone is provided
      if (!job.customerPhone) {
        console.error('Workshop job completion failed: Customer phone number is required');
        return { job: null };
      }

      const invoiceNumber = await Invoice.generateInvoiceNumber('sale');
      const invoice = new Invoice({
        invoiceNumber,
        type: 'sale',
        status: 'pending',
        customer: job.customer || undefined,
        customerPhone: job.customerPhone,
        items,
        discounts: [],
        taxes: [],
        shipping: { cost: 0 },
        subtotal: 0,
        totalDiscount: 0,
        totalTax: 0,
        total: 0,
        balance: 0,
        paid: 0,
        notes: `Workshop Job ${job._id} - ${job.title || ''}`.trim(),
        isWorkshopTransaction: true, // Mark as workshop transaction
        createdBy: userId,
      });
      await invoice.save();
      
    } catch (e) {
      console.error('Workshop create invoice error:', e);
    }
  }
  
  return { job };
}

// Create job card
const createJob = async (req, res) => {
  try {
    const data = req.body;
    data.createdBy = req.user._id;
    
    // Handle phone-based customer linking
    if (data.customerPhone && !data.customer) {
      const Customer = require('../models/Customer');
      const existingCustomer = await Customer.findOne({ phone: data.customerPhone });
      if (existingCustomer) {
        data.customer = existingCustomer._id;
      }
    }
    
    // Validate parts availability
    if (Array.isArray(data.parts) && data.parts.length > 0) {
      const shortages = [];
      for (const p of data.parts) {
        if (!p.product || !p.quantityRequired || p.quantityRequired <= 0) continue;
        const prod = await Product.findById(p.product).select('name sku inventory');
        if (!prod) {
          shortages.push({ product: String(p.product), reason: 'Product not found' });
          continue;
        }
        if ((prod.inventory?.currentStock ?? 0) < p.quantityRequired) {
          shortages.push({ product: prod._id, name: prod.name, available: prod.inventory?.currentStock ?? 0, required: p.quantityRequired });
        }
      }
      if (shortages.length > 0) {
        return res.status(400).json({ success: false, message: 'Insufficient stock for required parts', shortages });
      }
    }
    // Set initial progress to 10% for quality check completion
    data.progress = 10;
    data.progressHistory = [{
      progress: 10,
      status: 'scheduled',
      step: 'quality_check',
      message: 'Job created - quality check completed',
      updatedBy: req.user._id,
      updatedAt: new Date()
    }];

    // Set createdBy for all tasks
    if (data.tasks && Array.isArray(data.tasks)) {
      data.tasks = data.tasks.map(task => ({
        ...task,
        createdBy: req.user._id
      }));
    }

    const job = await WorkshopJob.create(data);
    const populated = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('tasks.createdBy', 'firstName lastName');
    res.status(201).json({ success: true, message: 'Job created', data: populated });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// List jobs with filters
const getJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const { search = '', status = '', priority = '', customer = '', customerPhone = '' } = req.query;

    const filter = { isActive: true };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (customer) filter.customer = customer;
    if (customerPhone) filter.customerPhone = { $regex: customerPhone, $options: 'i' };
    if (search) {
      // Search by job title, job card number, or vehicle registration number
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { 'jobCard.cardNumber': { $regex: search, $options: 'i' } },
        { 'vehicle.regNumber': { $regex: search, $options: 'i' } }
      ];
    }

    const jobs = await WorkshopJob.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('parts.product', 'name sku pricing inventory')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await WorkshopJob.countDocuments(filter);

    res.json({
      success: true,
      data: jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get jobs error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Get single job
const getJobById = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id)
      .populate('customer', 'firstName lastName email')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('parts.product', 'name sku pricing inventory')
      .populate('createdBy', 'firstName lastName');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update job card (including tasks, parts, tools, schedule, part quantities, and progress)
const updateJob = async (req, res) => {
  try {
    const previous = await WorkshopJob.findById(req.params.id).select('status');
    if (!previous) return res.status(404).json({ success: false, message: 'Job not found' });

    const { partQuantities, incrementProgress, ...updateData } = req.body;
    
    // Handle part quantity updates if provided
    if (partQuantities && Array.isArray(partQuantities) && partQuantities.length > 0) {
      const StockMovement = require('../models/StockMovement');
      const Product = require('../models/Product');
      
      for (const { productId, quantity } of partQuantities) {
        try {
          const part = previous.parts?.find(p => p.product.toString() === productId || p.product._id?.toString() === productId);
          if (!part) continue;

          const product = await Product.findById(productId);
          if (!product) continue;

          const currentStock = product.inventory?.currentStock || 0;
          const oldQuantity = part.quantityRequired || 0;
          const quantityDifference = quantity - oldQuantity;

          // Check if we have enough stock for the increase
          if (quantityDifference > 0 && currentStock < quantityDifference) {
            return res.status(400).json({
              success: false,
              message: `Insufficient stock for ${product.name}. Available: ${currentStock}, Required increase: ${quantityDifference}`
            });
          }

          // Update the part quantity
          part.quantityRequired = quantity;

          // Note: Inventory will be updated only on job completion
        } catch (error) {
          console.error(`Failed to update part ${productId}:`, error);
        }
      }
    }

    // Handle progress increment if requested
    if (incrementProgress) {
      if (previous.status === 'in_progress' && previous.progress < 75) {
        const newProgress = Math.min(75, (previous.progress || 0) + 5);
        updateData.progress = newProgress;
        
        if (!updateData.progressHistory) updateData.progressHistory = [];
        updateData.progressHistory.push({
          progress: newProgress,
          status: previous.status,
          step: 'update',
          message: 'Job progress updated',
          updatedBy: req.user._id,
          updatedAt: new Date()
        });
      }
    }

  const update = { ...updateData, lastUpdatedBy: req.user._id };
  let job = await WorkshopJob.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('customer', 'firstName lastName email')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('parts.product', 'name sku pricing inventory')
      .populate('createdBy', 'firstName lastName');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

  // Auto-calculate progress strictly from task completion (no categories/tools influence)
  try {
    const totalTasks = Array.isArray(job.tasks) ? job.tasks.length : 0;
    const completedTasks = totalTasks > 0 ? job.tasks.filter(t => String(t.status) === 'completed').length : 0;
    const computedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (job.progress || 0);

    if (typeof computedProgress === 'number' && computedProgress !== job.progress) {
      // Append progress history entry
      if (!Array.isArray(job.progressHistory)) job.progressHistory = [];
      job.progressHistory.push({
        progress: computedProgress,
        status: job.status,
        step: 'auto_task_progress',
        message: `Progress updated from tasks: ${completedTasks}/${totalTasks} completed`,
        updatedBy: req.user._id,
        updatedAt: new Date()
      });

      job.progress = computedProgress;

      // If all tasks completed, mark job as completed (idempotent)
      if (computedProgress === 100 && job.status !== 'completed') {
        job.status = 'completed';
      }

      await job.save();

      // Re-populate relations potentially dropped by save
      job = await WorkshopJob.findById(job._id)
        .populate('customer', 'firstName lastName email')
        .populate('tasks.assignee', 'firstName lastName')
        .populate('parts.product', 'name sku pricing inventory')
        .populate('createdBy', 'firstName lastName');
    }
  } catch (e) {
    console.error('Auto progress calculation failed:', e);
  }

    // If status transitioned to completed, process completion side-effects
    if (String(req.body?.status) === 'completed' && previous.status !== 'completed') {
      try {
        const result = await processJobCompletion(job._id, req.user._id);
        const refreshed = await WorkshopJob.findById(job._id)
          .populate('customer', 'firstName lastName email')
          .populate('tasks.assignee', 'firstName lastName')
          .populate('parts.product', 'name sku pricing inventory')
          .populate('createdBy', 'firstName lastName');
        return res.json({ success: true, message: 'Job completed and inventory updated', data: refreshed });
      } catch (e) {
        console.error('Process completion from update error:', e);
        return res.json({ success: true, message: 'Job updated (completion processing encountered an issue)', data: job });
      }
    }

    res.json({ success: true, message: 'Job updated', data: job });
  } catch (error) {
    console.error('Update job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Schedule job (set start/end)
const scheduleJob = async (req, res) => {
  try {
    const { start, end } = req.body;
    // Validate parts availability before scheduling
    const current = await WorkshopJob.findById(req.params.id).populate('parts.product', 'name sku pricing inventory');
    if (!current) return res.status(404).json({ success: false, message: 'Job not found' });
    const shortages = [];
    for (const p of (current.parts || [])) {
      if (!p.product || !p.quantityRequired) continue;
      const prod = await Product.findById(p.product).select('name sku inventory');
      if (!prod) { shortages.push({ product: String(p.product), reason: 'Product not found' }); continue; }
      if ((prod.inventory?.currentStock ?? 0) < p.quantityRequired) {
        shortages.push({ product: prod._id, name: prod.name, available: prod.inventory?.currentStock ?? 0, required: p.quantityRequired });
      }
    }
    if (shortages.length > 0) {
      return res.status(400).json({ success: false, message: 'Insufficient stock for required parts', shortages });
    }

    const job = await WorkshopJob.findByIdAndUpdate(req.params.id, { scheduled: { start, end }, status: 'scheduled', lastUpdatedBy: req.user._id }, { new: true })
      .populate('customer', 'firstName lastName email');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job scheduled', data: job });
  } catch (error) {
    console.error('Schedule job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Update job progress/status
const updateJobProgress = async (req, res) => {
  try {
    const { progress, status, step, message } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    if (typeof progress === 'number') {
      job.progress = Math.max(0, Math.min(100, progress));
    }
    if (status) {
      job.status = status;
    }
    job.lastUpdatedBy = req.user._id;
    job.progressHistory.push({
      progress: job.progress,
      status: job.status,
      step: step || undefined,
      message: message || undefined,
      updatedBy: req.user._id,
      updatedAt: new Date()
    });
    await job.save();

    const populated = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('resources.assignedTechnicians.user', 'firstName lastName');

    res.json({ success: true, message: 'Job progress updated', data: populated });
  } catch (error) {
    console.error('Update job progress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



// Get job visualization data: core job details + progress history
const getJobVisualization = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id)
      .select('title jobNumber status priority progress progressHistory resources customer createdAt updatedAt')
      .populate('customer', 'firstName lastName email phone')
      .populate('resources.assignedTechnicians.user', 'firstName lastName');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, data: job });
  } catch (error) {
    console.error('Get job visualization error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Helper function to process inventory updates with returns
async function processJobCompletionWithReturns(jobId, userId, partsUsed, partsReturned) {
  const job = await WorkshopJob.findById(jobId).populate('parts.product', 'name sku pricing inventory');
  if (!job) return;

  for (const part of (job.parts || [])) {
    const product = part.product;
    if (!product) continue;

    const partId = product._id.toString();
    const usedQty = partsUsed && partsUsed[partId] ? partsUsed[partId] : (part.quantityUsed || part.quantityRequired || 0);
    const returnedQty = partsReturned && partsReturned[partId] ? partsReturned[partId] : 0;
    
    if (usedQty > 0) {
      // Deduct used quantity
      const previousStock = Number(product.inventory?.currentStock ?? 0);
      const newStock = Math.max(0, previousStock - usedQty);
      const unitCost = Number(product.pricing?.costPrice ?? 0);

      const movement = new StockMovement({
        product: product._id,
        movementType: 'out',
        quantity: usedQty,
        unitCost,
        totalCost: unitCost * usedQty,
        previousStock,
        newStock,
        reason: `Workshop job ${jobId} completion - parts used`,
        createdBy: userId,
      });
      await movement.save();

      product.inventory.currentStock = newStock;
    }

    if (returnedQty > 0) {
      // Add back returned quantity
      const previousStock = Number(product.inventory?.currentStock ?? 0);
      const newStock = previousStock + returnedQty;
      const unitCost = Number(product.pricing?.costPrice ?? 0);

      const movement = new StockMovement({
        product: product._id,
        movementType: 'in',
        quantity: returnedQty,
        unitCost,
        totalCost: unitCost * returnedQty,
        previousStock,
        newStock,
        reason: `Workshop job ${jobId} completion - parts returned`,
        createdBy: userId,
      });
      await movement.save();

      product.inventory.currentStock = newStock;
    }

    await product.save();
  }
}

// Helper function to release all assigned resources
async function releaseAllResources(job, userId) {
  // Release technicians
  if (job.resources?.assignedTechnicians) {
    for (const techAssignment of job.resources.assignedTechnicians) {
      const technician = await Technician.findById(techAssignment.technicianId);
      if (technician) {
        technician.removeJob(job._id);
        await technician.save();
      }
    }
  }

  // Release tools
  if (job.tools) {
    for (const toolAssignment of job.tools) {
      const tool = await Tool.findById(toolAssignment.toolId);
      if (tool) {
        tool.returnTool();
        await tool.save();
      }
    }
  }

  // Release machines
  if (job.resources?.requiredMachines) {
    for (const machineAssignment of job.resources.requiredMachines) {
      const machine = await Machine.findById(machineAssignment.machineId);
      if (machine) {
        machine.releaseMachine();
        await machine.save();
      }
    }
  }
}

// Helper function to create invoice for completed job
async function createJobInvoice(job, partsUsed, partsReturned) {
  const Invoice = require('../models/Invoice');
  const Setting = require('../models/Setting');
  const Customer = require('../models/Customer');
  
  const invoiceItems = [];

  // Add dynamic charges
  if (job.completionDetails?.charges && Array.isArray(job.completionDetails.charges)) {
    for (const charge of job.completionDetails.charges) {
      if (charge.name && charge.amount && parseFloat(charge.amount) > 0) {
        const amount = parseFloat(charge.amount);
        const tax = parseFloat(charge.tax) || 0;
        const taxAmount = (amount * tax) / 100;
        const totalAmount = amount + taxAmount;
        
        // For service charges, we need to find or create a service product
        // For now, we'll create a virtual service product entry
        const serviceProduct = {
          _id: new mongoose.Types.ObjectId(), // Generate a new ObjectId for service
          name: charge.name,
          sku: `SERVICE-${charge.name.toUpperCase().replace(/\s+/g, '-')}`
        };
        
        invoiceItems.push({
          product: serviceProduct._id,
          name: charge.name,
          description: charge.name,
          sku: serviceProduct.sku,
          quantity: 1,
          unitPrice: amount,
          taxRate: tax,
          total: totalAmount
        });
      }
    }
  }

  // Add parts used
  if (job.parts && partsUsed) {
    const settingsDoc = await Setting.getSingleton();
    const defaultTaxRate = Number(settingsDoc?.company?.defaultTaxRate ?? 0);
    for (const part of job.parts) {
      const partId = part.product._id.toString();
      const usedQty = partsUsed[partId] || 0;
      if (usedQty > 0) {
        // Use selling price for invoicing
        const unitPrice = part.product?.pricing?.sellingPrice ?? part.unitPrice ?? part.product?.pricing?.salePrice ?? part.product?.pricing?.costPrice ?? 0;
        const taxRate = Number(part.product?.pricing?.taxRate ?? defaultTaxRate);
        
        invoiceItems.push({
          product: part.product._id,
          name: part.productName || part.product?.name || 'Part',
          description: part.productSku || part.product?.sku || '',
          sku: part.productSku || part.product?.sku || '',
          quantity: usedQty,
          unitPrice,
          discount: 0,
          taxRate,
          total: 0
        });
      }
    }
  }

  // Calculate totals
  // Let the Invoice pre-save hook compute subtotal, totalTax, and total from items
  const subtotal = 0;
  const totalDiscount = 0;
  const tax = 0;
  const total = 0;

  // Generate invoice number
  const invoiceNumber = await Invoice.generateInvoiceNumber('sale');

  // Get customer phone from job
  const customerPhone = (job.customer && job.customer.phone) ? job.customer.phone : (job.customerPhone || '');
  // Resolve customer by phone if job has no linked customer
  let customerId = job.customer ? (job.customer._id || job.customer) : undefined;
  if (!customerId && customerPhone) {
    const existingCustomer = await Customer.findOne({ phone: customerPhone }).select('_id');
    if (existingCustomer) customerId = existingCustomer._id;
  }

  const invoice = new Invoice({
    invoiceNumber,
    type: 'sale',
    customer: customerId,
    customerPhone,
    items: invoiceItems,
    subtotal,
    totalDiscount,
    tax,
    total,
    status: 'pending',
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    notes: job.completionDetails?.completionNotes || `Invoice for job: ${job.title}`,
    createdBy: job.lastUpdatedBy,
    isWorkshopTransaction: true // Mark as workshop transaction
  });

  await invoice.save();
  return invoice;
}

// Complete job: deduct used parts from inventory and create invoice
const completeJob = async (req, res) => {
  try {
    const {
      actualDuration, 
      charges, 
      notes, 
      partsUsed, 
      partsReturned 
    } = req.body;

    const job = await WorkshopJob.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone')
      .populate('parts.product', 'name sku pricing inventory');

    if (!job) {
      return res.status(404).json({ 
        success: false, 
        message: 'Job not found' 
      });
    }

    // Derive and store a stable customerName for UI display
    if (!job.customerName) {
      if (job.customer && (job.customer.firstName || job.customer.lastName)) {
        job.customerName = `${job.customer.firstName || ''} ${job.customer.lastName || ''}`.trim();
      } else if (job.customerPhone) {
        job.customerName = job.customerPhone;
      }
    }

    // Update job with completion details
    job.status = 'completed';
    job.progress = 100;
    // Sanitize charges: drop empty rows so schema doesn't require fields
    const safeCharges = Array.isArray(charges)
      ? charges.filter((c) => c && String(c.name || '').trim().length > 0 && !isNaN(parseFloat(c.amount)))
      : [];

    job.completionDetails = {
      completedAt: new Date(),
      actualDuration: actualDuration,
      charges: safeCharges,
      completionNotes: notes,
      completedBy: req.user._id
    };
    job.lastUpdatedBy = req.user._id;

    // Update parts with actual usage and returns
    if (partsUsed && job.parts) {
      job.parts.forEach(part => {
        const partId = part.product._id || part.product;
        if (partsUsed[partId] !== undefined) {
          part.quantityUsed = partsUsed[partId];
          part.actualUsage = partsUsed[partId];
        }
        if (partsReturned && partsReturned[partId] !== undefined) {
          part.quantityReturned = partsReturned[partId];
        }
      });
    }

    // Release all assigned technicians (make them available again)
    if (job.resources && Array.isArray(job.resources.assignedTechnicians)) {
      for (const assignedTech of job.resources.assignedTechnicians) {
        if (!assignedTech?.user) continue;
        const technician = await Technician.findById(assignedTech.user);
        if (technician) {
          technician.completeJob(job._id);
          await technician.save();
        }
      }
    }

    // Update progress history
    job.progressHistory.push({
      progress: 100,
      status: 'completed',
      step: 'completion',
      message: 'Job completed successfully',
      updatedBy: req.user._id,
      updatedAt: new Date()
    });

    await job.save();

    // Process inventory updates (deduct used parts, add back returned parts)
    await processJobCompletionWithReturns(req.params.id, req.user._id, partsUsed, partsReturned);

    // Release all assigned resources
    await releaseAllResources(job, req.user._id);

    // Create invoice
    const invoiceData = await createJobInvoice(job, partsUsed, partsReturned);

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('parts.product', 'name sku pricing inventory')
      .populate('resources.assignedTechnicians.user', 'firstName lastName email');

    res.json({ 
      success: true, 
      message: 'Job completed successfully with invoice created',
      data: {
        job: updatedJob,
        invoice: invoiceData
      }
    });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Server error' 
    });
  }
};

// Delete/Cancel job
const cancelJob = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    
    // Complete job for all assigned technicians before cancelling
    if (job.resources && job.resources.assignedTechnicians) {
      for (const assignedTech of job.resources.assignedTechnicians) {
        const technician = await Technician.findById(assignedTech.user);
        if (technician) {
          technician.removeJob(job._id);
          await technician.save();
        }
      }
    }
    
    // Return all assigned tools before cancelling
    if (job.tools && job.tools.length > 0) {
      for (const jobTool of job.tools) {
        if (jobTool.toolId) {
          const tool = await Tool.findById(jobTool.toolId);
          if (tool) {
            tool.returnTool();
            await tool.save();
          }
        }
      }
    }
    
    const updatedJob = await WorkshopJob.findByIdAndUpdate(
      req.params.id, 
      { status: 'cancelled', isActive: false, lastUpdatedBy: req.user._id }, 
      { new: true }
    );
    
    res.json({ success: true, message: 'Job cancelled', data: updatedJob });
  } catch (error) {
    console.error('Cancel job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete job permanently
// @route   DELETE /api/workshop/jobs/:id
// @access  Private
const deleteJob = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Check if job can be deleted (only allow deletion of draft/scheduled jobs)
    if (job.status === 'in_progress' || job.status === 'completed') {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete job that is in progress or completed. Cancel the job instead.' 
      });
    }

    // Complete job for all assigned technicians before deleting
    if (job.resources && job.resources.assignedTechnicians) {
      for (const assignedTech of job.resources.assignedTechnicians) {
        const technician = await Technician.findById(assignedTech.user);
        if (technician) {
          technician.removeJob(job._id);
          await technician.save();
        }
      }
    }
    
    // Return all assigned tools before deleting
    if (job.tools && job.tools.length > 0) {
      for (const jobTool of job.tools) {
        if (jobTool.toolId) {
          const tool = await Tool.findById(jobTool.toolId);
          if (tool) {
            tool.returnTool();
            await tool.save();
          }
        }
      }
    }

    // Release all booked machines before deleting
    if (job.resources && job.resources.requiredMachines) {
      for (const machine of job.resources.requiredMachines) {
        if (machine.machineId) {
          const machineDoc = await Machine.findById(machine.machineId);
          if (machineDoc) {
            machineDoc.releaseMachine();
            await machineDoc.save();
          }
        }
      }
    }

    // Delete the job permanently
    await WorkshopJob.findByIdAndDelete(req.params.id);

    res.json({ 
      success: true, 
      message: 'Job deleted successfully' 
    });
  } catch (error) {
    console.error('Delete job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Assign technician to job
// @route   PUT /api/workshop/jobs/:id/assign-technician
// @access  Private
const assignTechnician = async (req, res) => {
  try {
    const { technicianId, role = 'technician' } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Get technician details
    const technician = await Technician.findById(technicianId).populate('user', 'firstName lastName');
    if (!technician) {
      return res.status(404).json({
        success: false,
        message: 'Technician not found'
      });
    }

    // Check if technician is available
    if (!technician.isCurrentlyAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Technician is not currently available'
      });
    }

    // Assign technician to job
    const technicianName = technician.user 
      ? `${technician.user.firstName} ${technician.user.lastName}`
      : technician.employeeId || 'Technician';
    job.assignTechnician(technicianId, technicianName, role, req.user._id);
    job.lastUpdatedBy = req.user._id;
    await job.save();

    // Update technician's current jobs (availability will be calculated by virtual field)
    technician.assignJob(job._id, role);
    await technician.save();

    // Update job status and progress when resources are assigned
    if (job.status === 'scheduled') {
      job.status = 'in_progress';
      job.progress = 30;
      job.progressHistory.push({
        progress: 30,
        status: 'in_progress',
        step: 'resource_assignment',
        message: 'Resources assigned - work started',
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
      await job.save();
    }

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('resources.assignedTechnicians.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Technician assigned successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Assign technician error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Remove technician from job
// @route   PUT /api/workshop/jobs/:id/remove-technician
// @access  Private
const removeTechnician = async (req, res) => {
  try {
    const { technicianId } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Remove technician from job
    job.removeTechnician(technicianId);
    job.lastUpdatedBy = req.user._id;
    await job.save();

    // Update technician's current jobs (availability will be calculated by virtual field)
    const technician = await Technician.findById(technicianId);
    if (technician) {
      technician.removeJob(job._id);
      await technician.save();
    }

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('resources.assignedTechnicians.user', 'firstName lastName email');

    res.json({
      success: true,
      message: 'Technician removed successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Remove technician error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Add task to job
// @route   POST /api/workshop/jobs/:id/tasks
// @access  Private
const addTask = async (req, res) => {
  try {
    const { title, description, assignee, priority, estimatedDuration } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const newTask = {
      title,
      description,
      assignee,
      priority: priority || 'medium',
      estimatedDuration: estimatedDuration || 0,
      createdBy: req.user._id
    };

    job.tasks.push(newTask);
    
    // Don't update progress when adding tasks - only when completing them
    
    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('tasks.assignee', 'firstName lastName email')
      .populate('tasks.createdBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Task added successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Add task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update task status
// @route   PUT /api/workshop/jobs/:id/tasks/:taskId
// @access  Private
const updateTaskStatus = async (req, res) => {
  try {
    const { status, notes, actualDuration } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const task = job.tasks.id(req.params.taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    task.status = status;
    task.lastUpdatedBy = req.user._id;
    
    if (notes) task.notes = notes;
    if (actualDuration) task.actualDuration = actualDuration;
    
    if (status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    
    if (status === 'completed' && !task.completedAt) {
      task.completedAt = new Date();
    }

    // Update job progress by 5% for each completed task
    if (status === 'completed') {
      const completedTasks = job.tasks.filter(task => task.status === 'completed').length;
      const newProgress = Math.min(100, 30 + (completedTasks * 5)); // Start from 30% after resource assignment, then 5% per task
      
      if (newProgress > job.progress) {
        job.progress = newProgress;
        
        // Add progress history entry
        if (!job.progressHistory) job.progressHistory = [];
        job.progressHistory.push({
          progress: newProgress,
          status: job.status,
          step: 'task_completion',
          message: `Task completed - progress updated to ${newProgress}%`,
          updatedBy: req.user._id,
          updatedAt: new Date()
        });
      }
    }
    
    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('tasks.assignee', 'firstName lastName email')
      .populate('tasks.createdBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Book machine for job
// @route   POST /api/workshop/jobs/:id/book-machine
// @access  Private
const bookMachine = async (req, res) => {
  try {
    const { machineId, until } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    if (!machine.availability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Machine is not available'
      });
    }

    // Book machine
    machine.bookMachine(job._id, req.user._id, new Date(until));
    await machine.save();

    // Add machine to job resources
    const existingMachine = job.resources.requiredMachines.find(m => m.machineId.toString() === machineId);
    if (!existingMachine) {
      job.resources.requiredMachines.push({
        name: machine.name,
        machineId: machine._id,
        requiredFrom: new Date(),
        requiredUntil: new Date(until),
        isAvailable: false,
        assignedAt: new Date(),
        assignedBy: req.user._id
      });
    }

    // Update job status and progress when resources are assigned
    if (job.status === 'scheduled') {
      job.status = 'in_progress';
      job.progress = 20;
      job.progressHistory.push({
        progress: 20,
        status: 'in_progress',
        step: 'resource_assignment',
        message: 'Machine booked - work started',
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    }

    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('resources.requiredMachines.machineId', 'name model category');

    res.json({
      success: true,
      message: 'Machine booked successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Book machine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Release machine from job
// @route   POST /api/workshop/jobs/:id/release-machine
// @access  Private
const releaseMachine = async (req, res) => {
  try {
    const { machineId } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const machine = await Machine.findById(machineId);
    if (!machine) {
      return res.status(404).json({
        success: false,
        message: 'Machine not found'
      });
    }

    // Release machine
    machine.releaseMachine();
    await machine.save();

    // Remove machine from job resources
    job.resources.requiredMachines = job.resources.requiredMachines.filter(
      m => m.machineId.toString() !== machineId
    );

    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('resources.requiredMachines.machineId', 'name model category');

    res.json({
      success: true,
      message: 'Machine released successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Release machine error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Book workstation for job
// @route   POST /api/workshop/jobs/:id/book-workstation
// @access  Private
const bookWorkStation = async (req, res) => {
  try {
    const { workstationId, until } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const workstation = await WorkStation.findById(workstationId);
    if (!workstation) {
      return res.status(404).json({
        success: false,
        message: 'Workstation not found'
      });
    }

    if (!workstation.isCurrentlyAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Workstation is not currently available'
      });
    }

    // Book workstation
    workstation.bookWorkstation(job._id, req.user._id, new Date(until));
    await workstation.save();

    // Add workstation to job resources
    const existingWorkstation = job.resources.workStations.find(w => w.stationId.toString() === workstationId);
    if (!existingWorkstation) {
      job.resources.workStations.push({
        name: workstation.name,
        stationId: workstation._id,
        requiredFrom: new Date(),
        requiredUntil: new Date(until),
        isAvailable: false
      });
    }

    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('resources.workStations.stationId', 'name type capacity');

    res.json({
      success: true,
      message: 'Workstation booked successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Book workstation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign tool to job
// @route   POST /api/workshop/jobs/:id/assign-tool
// @access  Private
const assignTool = async (req, res) => {
  try {
    const { toolId, expectedReturn } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    if (!tool.availability.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'Tool is not available'
      });
    }

    // Assign tool
    tool.assignTool(job._id, req.user._id, new Date(expectedReturn));
    await tool.save();

    // Add tool to job resources
    const existingTool = job.tools.find(t => t.toolId && t.toolId.toString() === toolId);
    if (!existingTool) {
      job.tools.push({
        name: tool.name,
        toolId: tool._id,
        category: tool.category,
        condition: tool.condition,
        requiredFrom: new Date(),
        requiredUntil: new Date(expectedReturn),
        assignedTo: req.user._id,
        assignedAt: new Date(),
        isAvailable: false
      });
    }

    // Update job status and progress when resources are assigned
    if (job.status === 'scheduled') {
      job.status = 'in_progress';
      job.progress = 20;
      job.progressHistory.push({
        progress: 20,
        status: 'in_progress',
        step: 'resource_assignment',
        message: 'Tool assigned - work started',
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    }

    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('tools.toolId', 'name category condition');

    res.json({
      success: true,
      message: 'Tool assigned successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Assign tool error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Bulk assign resources to job (technicians, tools, machines, parts)
// @route   POST /api/workshop/jobs/:id/assign-resources
// @access  Private
const assignResources = async (req, res) => {
  try {
    const { technicians = [], tools = [], machines = [], parts = [] } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const errors = [];
    const assignedResources = {
      technicians: [],
      tools: [],
      machines: [],
      parts: []
    };

    // Assign technicians
    for (const { technicianId, role = 'technician' } of technicians) {
      try {
        const technician = await Technician.findById(technicianId).populate('user', 'firstName lastName');
        if (!technician) {
          errors.push(`Technician with ID ${technicianId} not found`);
          continue;
        }

        if (!technician.isCurrentlyAvailable) {
          errors.push(`Technician ${technician.user ? `${technician.user.firstName} ${technician.user.lastName}` : technician.employeeId} is not currently available`);
          continue;
        }

        const technicianName = technician.user 
          ? `${technician.user.firstName} ${technician.user.lastName}`
          : technician.employeeId || 'Technician';
        
        job.assignTechnician(technicianId, technicianName, role, req.user._id);
        technician.assignJob(job._id, role);
        await technician.save();
        
        assignedResources.technicians.push({ technicianId, name: technicianName, role });
      } catch (error) {
        errors.push(`Failed to assign technician ${technicianId}: ${error.message}`);
      }
    }

    // Assign tools
    for (const { toolId } of tools) {
      try {
        const tool = await Tool.findById(toolId);
        if (!tool) {
          errors.push(`Tool with ID ${toolId} not found`);
          continue;
        }

        if (!tool.availability.isAvailable) {
          errors.push(`Tool ${tool.name} is not available`);
          continue;
        }

        tool.assignTool(job._id, req.user._id);
        await tool.save();

        // Add tool to job resources
        const existingTool = job.tools.find(t => t.toolId && t.toolId.toString() === toolId);
        if (!existingTool) {
          job.tools.push({
            name: tool.name,
            toolId: tool._id,
            category: tool.category,
            condition: tool.condition,
            requiredFrom: new Date(),
            assignedTo: req.user._id,
            assignedAt: new Date(),
            isAvailable: false
          });
        }
        
        assignedResources.tools.push({ toolId, name: tool.name });
      } catch (error) {
        errors.push(`Failed to assign tool ${toolId}: ${error.message}`);
      }
    }

    // Book machines
    for (const { machineId } of machines) {
      try {
        const machine = await Machine.findById(machineId);
        if (!machine) {
          errors.push(`Machine with ID ${machineId} not found`);
          continue;
        }

        if (!machine.availability.isAvailable) {
          errors.push(`Machine ${machine.name} is not available`);
          continue;
        }

        machine.bookMachine(job._id, req.user._id);
        await machine.save();

        // Add machine to job resources
        const existingMachine = job.resources?.requiredMachines?.find(m => m.machineId && m.machineId.toString() === machineId);
        if (!existingMachine) {
          if (!job.resources) {
            job.resources = { assignedTechnicians: [], requiredMachines: [], requiredTools: [] };
          }
          job.resources.requiredMachines.push({
            name: machine.name,
            machineId: machine._id,
            model: machine.model,
            category: machine.category,
            requiredFrom: new Date(),
            bookedBy: req.user._id,
            bookedAt: new Date(),
            isAvailable: false
          });
        }
        
        assignedResources.machines.push({ machineId, name: machine.name });
      } catch (error) {
        errors.push(`Failed to book machine ${machineId}: ${error.message}`);
      }
    }

    // Assign parts
    for (const { productId, quantity = 1 } of parts) {
      try {
        const product = await Product.findById(productId);
        if (!product) {
          errors.push(`Product with ID ${productId} not found`);
          continue;
        }

        // Check inventory availability (use currentStock instead of quantity)
        const availableStock = product.inventory?.currentStock || 0;
        if (availableStock < quantity) {
          errors.push(`Insufficient stock for ${product.name}. Available: ${availableStock}, Required: ${quantity}`);
          continue;
        }

        // Check if part already exists in job
        const existingPart = job.parts.find(p => p.product && p.product.toString() === productId);
        
        if (existingPart) {
          // Update existing part quantity and price
          const newQuantity = (existingPart.quantityRequired || 0) + quantity;
          existingPart.quantityRequired = newQuantity;
          // Update unitPrice in case it changed
          existingPart.unitPrice = product.pricing?.salePrice || product.pricing?.costPrice || product.pricing?.cost || existingPart.unitPrice || 0;
        } else {
          // Add new part
          if (!job.parts) {
            job.parts = [];
          }
          job.parts.push({
            product: product._id,
            productName: product.name,
            productSku: product.sku,
            quantityRequired: quantity,
            quantityUsed: 0,
            quantityReturned: 0,
            unitPrice: product.pricing?.salePrice || product.pricing?.costPrice || product.pricing?.cost || 0,
            status: 'reserved',
            reservedAt: new Date(),
            reservedBy: req.user._id
          });
        }

        // Note: Inventory will be updated only on job completion
        assignedResources.parts.push({ productId, name: product.name, quantity });
      } catch (error) {
        errors.push(`Failed to assign part ${productId}: ${error.message}`);
      }
    }

    // Update job status and progress if resources were assigned
    if (assignedResources.technicians.length > 0 || assignedResources.tools.length > 0 || 
        assignedResources.machines.length > 0 || assignedResources.parts.length > 0) {
      
      if (job.status === 'scheduled') {
        job.status = 'in_progress';
        job.progress = 30;
        job.progressHistory.push({
          progress: 30,
          status: 'in_progress',
          step: 'resource_assignment',
          message: 'Resources assigned - work started',
          updatedBy: req.user._id,
          updatedAt: new Date()
        });
      }
      
      job.lastUpdatedBy = req.user._id;
      await job.save();
    }

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('resources.assignedTechnicians.user', 'firstName lastName email')
      .populate('parts.product', 'name sku pricing inventory');

    res.json({
      success: true,
      message: `Successfully assigned resources: ${assignedResources.technicians.length} technicians, ${assignedResources.tools.length} tools, ${assignedResources.machines.length} machines, ${assignedResources.parts.length} parts`,
      data: {
        assignedResources,
        errors: errors.length > 0 ? errors : undefined,
        job: updatedJob
      }
    });
  } catch (error) {
    console.error('Assign resources error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Check parts availability for job
// @route   GET /api/workshop/jobs/:id/check-parts
// @access  Private
const checkPartsAvailability = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await job.checkPartsAvailability();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('parts.product', 'name sku inventory pricing');

    res.json({
      success: true,
      message: 'Parts availability checked',
      data: {
        parts: updatedJob.parts,
        allPartsAvailable: updatedJob.parts.every(part => part.isAvailable)
      }
    });
  } catch (error) {
    console.error('Check parts availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reserve parts for job
// @route   POST /api/workshop/jobs/:id/reserve-parts
// @access  Private
const reserveParts = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    await job.checkPartsAvailability();

    // Check if all parts are available
    const unavailableParts = job.parts.filter(part => !part.isAvailable);
    if (unavailableParts.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Some parts are not available in sufficient quantity',
        data: unavailableParts
      });
    }

    // Reserve parts
    for (const part of job.parts) {
      part.reservedAt = new Date();
      part.reservedBy = req.user._id;
    }

    job.lastUpdatedBy = req.user._id;
    await job.save();

    res.json({
      success: true,
      message: 'Parts reserved successfully',
      data: job.parts
    });
  } catch (error) {
    console.error('Reserve parts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get available resources for job
// @route   GET /api/workshop/jobs/:id/available-resources
// @access  Private
const getAvailableResources = async (req, res) => {
  try {
    const { type } = req.query; // 'machines', 'tools', 'workstations', 'technicians'
    
    let resources = {};
    
    if (!type || type === 'machines') {
      const machines = await Machine.find({ 
        'availability.isAvailable': true, 
        status: 'operational',
        isActive: true 
      }).select('name model category location');
      resources.machines = machines;
    }
    
    if (!type || type === 'tools') {
      const tools = await Tool.find({ 
        'availability.isAvailable': true, 
        status: 'available',
        isActive: true 
      }).select('name category condition location');
      resources.tools = tools;
    }
    
    if (!type || type === 'workstations') {
      const workstations = await WorkStation.find({ 
        'availability.isAvailable': true, 
        status: 'available',
        isActive: true 
      }).select('name type capacity location');
      resources.workstations = workstations;
    }
    
    if (!type || type === 'technicians') {
      const technicians = await Technician.find({ 
        employmentStatus: 'active',
        isActive: true
      }).populate('user', 'firstName lastName email').select('user employeeId department position skills name currentJobs currentLeave statistics preferences');
      
      // Filter by availability using the virtual field
      const availableTechnicians = technicians.filter(tech => tech.isCurrentlyAvailable);
      resources.technicians = availableTechnicians;
    }

    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    console.error('Get available resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get job statistics
// @route   GET /api/workshop/jobs/stats
// @access  Private
const getJobStats = async (req, res) => {
  try {
    const totalJobs = await WorkshopJob.countDocuments({ isActive: true });
    const scheduledJobs = await WorkshopJob.countDocuments({ status: 'scheduled', isActive: true });
    const inProgressJobs = await WorkshopJob.countDocuments({ status: 'in_progress', isActive: true });
    const completedJobs = await WorkshopJob.countDocuments({ status: 'completed', isActive: true });
    const overdueJobs = await WorkshopJob.countDocuments({ 
      deadline: { $lt: new Date() }, 
      status: { $nin: ['completed', 'cancelled'] },
      isActive: true 
    });

    // Get jobs by priority
    const urgentJobs = await WorkshopJob.countDocuments({ priority: 'urgent', isActive: true });
    const highPriorityJobs = await WorkshopJob.countDocuments({ priority: 'high', isActive: true });

    // Get average completion time
    const completedJobsWithDuration = await WorkshopJob.find({ 
      status: 'completed', 
      isActive: true,
      'scheduled.actualDuration': { $exists: true, $gt: 0 }
    });
    
    const avgCompletionTime = completedJobsWithDuration.length > 0 
      ? completedJobsWithDuration.reduce((sum, job) => sum + job.scheduled.actualDuration, 0) / completedJobsWithDuration.length
      : 0;

    res.json({
      success: true,
      data: {
        total: totalJobs,
        byStatus: {
          scheduled: scheduledJobs,
          in_progress: inProgressJobs,
          completed: completedJobs
        },
        overdue: overdueJobs,
        byPriority: {
          urgent: urgentJobs,
          high: highPriorityJobs
        },
        averageCompletionTime: Math.round(avgCompletionTime),
        completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
      }
    });
  } catch (error) {
    console.error('Get job stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get customer portal job data
// @route   GET /api/workshop/jobs/customer/:customerId
// @access  Private
const getCustomerJobs = async (req, res) => {
  try {
    const { customerId } = req.params;
    const jobs = await WorkshopJob.find({ 
      customer: customerId, 
      isActive: true,
      'customerPortal.isVisible': true
    })
    .populate('customer', 'firstName lastName email phone')
    .populate('createdBy', 'firstName lastName')
    .populate('resources.assignedTechnicians.user', 'firstName lastName')
    .select('title description status priority progress deadline scheduled jobCard customerPortal links createdAt updatedAt')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: jobs
    });
  } catch (error) {
    console.error('Get customer jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update job card with version control
// @route   PUT /api/workshop/jobs/:id/job-card
// @access  Private
const updateJobCard = async (req, res) => {
  try {
    const { changes, ...updateData } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Update job card data
    Object.assign(job.jobCard, updateData);
    
    // Add version history
    if (changes) {
      job.updateJobCardVersion(changes, req.user._id);
    }

    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('jobCard.history.changedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Job card updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update job card error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add customer comment to job
// @route   POST /api/workshop/jobs/:id/customer-comment
// @access  Private
const addCustomerComment = async (req, res) => {
  try {
    const { comment, customerName } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    job.addCustomerComment(comment, customerName);
    await job.save();

    res.json({
      success: true,
      message: 'Comment added successfully',
      data: job.customerPortal.customerComments
    });
  } catch (error) {
    console.error('Add customer comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add status update to job
// @route   POST /api/workshop/jobs/:id/status-update
// @access  Private
const addStatusUpdate = async (req, res) => {
  try {
    const { status, message, notifyCustomer = true } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    job.addStatusUpdate(status, message, req.user._id, notifyCustomer);
    await job.save();

    res.json({
      success: true,
      message: 'Status update added successfully',
      data: job.customerPortal.statusUpdates
    });
  } catch (error) {
    console.error('Add status update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check resource conflicts for job
// @route   GET /api/workshop/jobs/:id/check-conflicts
// @access  Private
const checkResourceConflicts = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const conflicts = await job.checkResourceConflicts();
    await job.save();

    res.json({
      success: true,
      data: {
        conflicts,
        hasConflicts: conflicts.length > 0
      }
    });
  } catch (error) {
    console.error('Check resource conflicts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get job analytics and insights
// @route   GET /api/workshop/jobs/:id/analytics
// @access  Private
const getJobAnalytics = async (req, res) => {
  try {
    const job = await WorkshopJob.findById(req.params.id)
      .populate('parts.product', 'name sku pricing')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('resources.assignedTechnicians.user', 'firstName lastName');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Calculate analytics
    const analytics = {
      efficiency: {
        estimatedDuration: job.scheduled.estimatedDuration || 0,
        actualDuration: job.scheduled.actualDuration || 0,
        efficiency: job.scheduled.actualDuration && job.scheduled.estimatedDuration 
          ? Math.round((job.scheduled.estimatedDuration / job.scheduled.actualDuration) * 100)
          : 0
      },
      costs: job.calculateJobCosts(),
      parts: {
        total: job.parts.length,
        available: job.parts.filter(p => p.isAvailable).length,
        shortage: job.parts.filter(p => p.status === 'shortage').length,
        used: job.parts.filter(p => p.quantityUsed > 0).length
      },
      tasks: {
        total: job.tasks.length,
        completed: job.tasks.filter(t => t.status === 'completed').length,
        inProgress: job.tasks.filter(t => t.status === 'in_progress').length,
        pending: job.tasks.filter(t => t.status === 'todo').length
      },
      timeline: {
        created: job.createdAt,
        scheduled: job.scheduled.start,
        deadline: job.deadline,
        completed: job.customerPortal.actualCompletion
      }
    };

    res.json({
      success: true,
      data: analytics
    });
  } catch (error) {
    console.error('Get job analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get workshop dashboard data
// @route   GET /api/workshop/dashboard
// @access  Private
const getWorkshopDashboard = async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    // Get job statistics
    const totalJobs = await WorkshopJob.countDocuments({ 
      isActive: true,
      createdAt: { $gte: startDate }
    });
    
    const completedJobs = await WorkshopJob.countDocuments({ 
      status: 'completed',
      isActive: true,
      createdAt: { $gte: startDate }
    });
    
    const inProgressJobs = await WorkshopJob.countDocuments({ 
      status: 'in_progress',
      isActive: true
    });
    
    const overdueJobs = await WorkshopJob.countDocuments({ 
      deadline: { $lt: now },
      status: { $nin: ['completed', 'cancelled'] },
      isActive: true
    });

    // Get efficiency metrics
    const completedJobsWithDuration = await WorkshopJob.find({
      status: 'completed',
      isActive: true,
      createdAt: { $gte: startDate },
      'scheduled.estimatedDuration': { $exists: true, $gt: 0 },
      'scheduled.actualDuration': { $exists: true, $gt: 0 }
    });

    const avgEfficiency = completedJobsWithDuration.length > 0
      ? completedJobsWithDuration.reduce((sum, job) => {
          const efficiency = (job.scheduled.estimatedDuration / job.scheduled.actualDuration) * 100;
          return sum + efficiency;
        }, 0) / completedJobsWithDuration.length
      : 0;

    // Get resource utilization
    const resourceStats = await WorkshopJob.aggregate([
      { $match: { isActive: true, createdAt: { $gte: startDate } } },
      { $unwind: '$resources.assignedTechnicians' },
      { $group: {
        _id: '$resources.assignedTechnicians.user',
        jobCount: { $sum: 1 },
        totalHours: { $sum: { $divide: ['$scheduled.actualDuration', 60] } }
      }},
      { $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'technician'
      }},
      { $unwind: '$technician' },
      { $project: {
        name: { $concat: ['$technician.firstName', ' ', '$technician.lastName'] },
        jobCount: 1,
        totalHours: 1
      }}
    ]);

    // Get recent activity
    const recentJobs = await WorkshopJob.find({ isActive: true })
      .populate('customer', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ updatedAt: -1 })
      .limit(10)
      .select('title status priority progress customer createdBy updatedAt');

    res.json({
      success: true,
      data: {
        overview: {
          totalJobs,
          completedJobs,
          inProgressJobs,
          overdueJobs,
          completionRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0
        },
        efficiency: {
          averageEfficiency: Math.round(avgEfficiency),
          onTimeCompletion: completedJobsWithDuration.filter(job => 
            job.scheduled.actualDuration <= job.scheduled.estimatedDuration
          ).length
        },
        resources: resourceStats,
        recentActivity: recentJobs
      }
    });
  } catch (error) {
    console.error('Get workshop dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark quality check status
// @route   PUT /api/workshop/jobs/:id/quality-check
// @access  Private
const markQualityCheck = async (req, res) => {
  try {
    const { checked = true } = req.body;
    const job = await WorkshopJob.findByIdAndUpdate(
      req.params.id,
      { qualityChecked: Boolean(checked), lastUpdatedBy: req.user._id },
      { new: true }
    );
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Quality check updated', data: job });
  } catch (error) {
    console.error('Mark quality check error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Mark follow-up done on customer portal
// @route   PUT /api/workshop/jobs/:id/follow-up
// @access  Private
const markFollowUp = async (req, res) => {
  try {
    const { done = true } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    job.customerPortal.followUpDone = Boolean(done);
    job.customerPortal.followUpAt = done ? new Date() : undefined;
    job.lastUpdatedBy = req.user._id;
    await job.save();
    res.json({ success: true, message: 'Follow-up status updated', data: job.customerPortal });
  } catch (error) {
    console.error('Mark follow-up error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update job task and resources (Task Update action)
// @route   PUT /api/workshop/:id/update-task
// @access  Private
const updateJobTask = async (req, res) => {
  try {
    const { 
      title, 
      description, 
      priority, 
      estimatedDuration,
      technicians, 
      tools, 
      parts,
      status,
      progress 
    } = req.body;
    
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Update basic job information
    if (title) job.title = title;
    if (description) job.description = description;
    if (priority) job.priority = priority;
    if (estimatedDuration) job.estimatedDuration = estimatedDuration;
    if (status) job.status = status;
    if (progress !== undefined) job.progress = progress;

    // Handle technician updates
    if (technicians) {
      const { added = [], removed = [] } = technicians;
      
      // Add new technicians
      for (const techData of added) {
        const technician = await Technician.findById(techData.technicianId);
        if (technician && technician.isCurrentlyAvailable) {
          // Check if technician is already assigned
          const alreadyAssigned = job.resources?.assignedTechnicians?.some(
            at => at.user && at.user.toString() === techData.technicianId
          );
          
          if (!alreadyAssigned) {
            job.assignTechnician(techData.technicianId, `${technician.user?.firstName || 'Tech'} ${technician.user?.lastName || technician.employeeId || ''}`, techData.role || 'technician', req.user._id);
            technician.assignJob(job._id, techData.role || 'technician');
            await technician.save();
          }
        }
      }
      
      // Remove technicians
      for (const technicianId of removed) {
        const technician = await Technician.findById(technicianId);
        if (technician) {
          job.removeTechnician(technicianId);
          technician.removeJob(job._id);
          await technician.save();
        }
      }
    }

    // Handle tool updates
    if (tools) {
      const { added = [], removed = [] } = tools;
      
      // Add new tools
      for (const toolData of added) {
        const tool = await Tool.findById(toolData.toolId);
        if (tool && tool.availability.isAvailable) {
          // Check if tool is already assigned
          const alreadyAssigned = job.tools?.some(
            t => t.toolId && t.toolId.toString() === toolData.toolId
          );
          
          if (!alreadyAssigned) {
            tool.assignTool(job._id, req.user._id, new Date(toolData.expectedReturn));
            await tool.save();
            
            job.tools.push({
              name: tool.name,
              toolId: tool._id,
              category: tool.category,
              condition: tool.condition,
              requiredFrom: new Date(),
              requiredUntil: new Date(toolData.expectedReturn),
              assignedTo: req.user._id,
              assignedAt: new Date(),
              isAvailable: false
            });
          }
        }
      }
      
      // Remove tools
      for (const toolId of removed) {
        const tool = await Tool.findById(toolId);
        if (tool) {
          tool.returnTool();
          await tool.save();
          job.tools = job.tools.filter(t => t.toolId && t.toolId.toString() !== toolId);
        }
      }
    }

    // Handle parts updates
    if (parts) {
      const { added = [], removed = [] } = parts;
      
      // Add new parts
      for (const partData of added) {
        const product = await Product.findById(partData.productId);
        if (product) {
          // Check if part already exists in job
          const existingPart = job.parts.find(p => p.product && p.product.toString() === partData.productId);
          
          if (existingPart) {
            // Update existing part quantity
            const additionalQty = partData.quantity || 0;
            existingPart.quantityRequired += additionalQty;
            existingPart.totalCost = existingPart.unitCost * existingPart.quantityRequired;
            existingPart.isAvailable = product.inventory.currentStock >= existingPart.quantityRequired;
            
            // Reserve additional inventory
            if (product.inventory.currentStock >= additionalQty) {
              product.inventory.currentStock -= additionalQty;
              product.inventory.reservedStock = (product.inventory.reservedStock || 0) + additionalQty;
              await product.save();
            }
          } else {
            // Add new part
            const quantity = partData.quantity || 1;
            job.parts.push({
              product: product._id,
              productName: product.name,
              productSku: product.sku,
              quantityRequired: quantity,
              quantityUsed: 0,
              quantityAvailable: product.inventory.currentStock,
              isAvailable: product.inventory.currentStock >= quantity,
              unitCost: product.pricing.costPrice,
              totalCost: product.pricing.costPrice * quantity
            });
            
            // Note: Inventory will be updated only on job completion
          }
        }
      }
      
      // Remove parts
      for (const partId of removed) {
        const partToRemove = job.parts.find(p => p._id && p._id.toString() === partId);
        if (partToRemove) {
          // Note: Inventory will be managed only on job completion
          
          // Remove part from job
          job.parts = job.parts.filter(p => p._id && p._id.toString() !== partId);
        }
      }
    }

    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('resources.assignedTechnicians.user', 'firstName lastName email')
      .populate('parts.product', 'name sku pricing inventory');

    res.json({
      success: true,
      message: 'Job task updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update job task error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update job resources (technicians, tools, machines, parts)
// @route   PUT /api/workshop/jobs/:id/update-resources
// @access  Private
const updateJobResources = async (req, res) => {
  try {
    const { technicians, tools, machines, parts } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    // Handle technician updates
    if (technicians) {
      const { added = [], removed = [] } = technicians;
      
      // Add new technicians
      for (const techData of added) {
        const technician = await Technician.findById(techData.technicianId);
        if (technician && technician.isCurrentlyAvailable) {
          const technicianName = technician.user 
            ? `${technician.user.firstName} ${technician.user.lastName}`
            : technician.employeeId || 'Technician';
          job.assignTechnician(techData.technicianId, technicianName, techData.role, req.user._id);
          technician.assignJob(job._id, techData.role);
          await technician.save();
        }
      }
      
      // Remove technicians
      for (const technicianId of removed) {
        const technician = await Technician.findById(technicianId);
        if (technician) {
          job.removeTechnician(technicianId);
          technician.removeJob(job._id);
          await technician.save();
        }
      }
    }

    // Handle tool updates
    if (tools) {
      const { added = [], removed = [] } = tools;
      
      // Add new tools
      for (const toolData of added) {
        const tool = await Tool.findById(toolData.toolId);
        if (tool && tool.availability.isAvailable) {
          tool.assignTool(job._id, req.user._id, new Date(toolData.expectedReturn));
          await tool.save();
          
          job.tools.push({
            name: tool.name,
            toolId: tool._id,
            category: tool.category,
            condition: tool.condition,
            requiredFrom: new Date(),
            requiredUntil: new Date(toolData.expectedReturn),
            assignedTo: req.user._id,
            assignedAt: new Date(),
            isAvailable: false
          });
        }
      }
      
      // Remove tools
      for (const toolId of removed) {
        const tool = await Tool.findById(toolId);
        if (tool) {
          tool.returnTool();
          await tool.save();
          job.tools = job.tools.filter(t => t.toolId && t.toolId.toString() !== toolId);
        }
      }
    }

    // Handle machines updates
    if (machines) {
      const { added = [], removed = [] } = machines;

      // Add (book) machines
      for (const machineData of added) {
        const machine = await Machine.findById(machineData.machineId);
        if (machine && machine.availability.isAvailable && machine.status === 'operational') {
          const untilDate = machineData.until ? new Date(machineData.until) : undefined;
          machine.bookMachine(job._id, req.user._id, untilDate);
          await machine.save();

          // Avoid duplicates in requiredMachines
          const alreadyAdded = job.resources?.requiredMachines?.some(
            m => m.machineId && m.machineId.toString() === machineData.machineId
          );
          if (!alreadyAdded) {
            job.resources.requiredMachines = job.resources.requiredMachines || [];
            job.resources.requiredMachines.push({
              name: machine.name,
              machineId: machine._id,
              requiredFrom: new Date(),
              requiredUntil: untilDate || null,
              isAvailable: false,
              assignedAt: new Date(),
              assignedBy: req.user._id
            });
          }
        }
      }

      // Remove (release) machines
      for (const machineId of removed) {
        const machine = await Machine.findById(machineId);
        if (machine) {
          machine.releaseMachine();
          await machine.save();
          job.resources.requiredMachines = (job.resources.requiredMachines || []).filter(
            m => m.machineId && m.machineId.toString() !== machineId
          );
        }
      }
    }

    // Handle parts updates
    if (parts) {
      const { added = [], removed = [] } = parts;
      
      // Add new parts
      for (const partData of added) {
        const product = await Product.findById(partData.productId);
        if (product) {
          // Check if part already exists in job
          const existingPart = job.parts.find(p => p.product && p.product.toString() === partData.productId);
          
          if (existingPart) {
            // Update existing part quantity
            existingPart.quantityRequired += partData.quantity;
            existingPart.totalCost = existingPart.unitCost * existingPart.quantityRequired;
            existingPart.isAvailable = product.inventory.currentStock >= existingPart.quantityRequired;
          } else {
            // Add new part
            job.parts.push({
              product: product._id,
              productName: product.name,
              productSku: product.sku,
              quantityRequired: partData.quantity,
              quantityUsed: 0,
              quantityAvailable: product.inventory.currentStock,
              isAvailable: product.inventory.currentStock >= partData.quantity,
              unitCost: product.pricing.costPrice,
              totalCost: product.pricing.costPrice * partData.quantity
            });
          }
          
          // Note: Inventory will be updated only on job completion
        }
      }
      
      // Remove parts
      for (const partId of removed) {
        const partToRemove = job.parts.find(p => p._id && p._id.toString() === partId);
        if (partToRemove) {
          // Note: Inventory will be managed only on job completion
          
          // Remove part from job
          job.parts = job.parts.filter(p => p._id && p._id.toString() !== partId);
        }
      }
    }

    // Check if any resources were added and update job status/progress accordingly
    let resourcesAdded = false;
    if (technicians && technicians.added && technicians.added.length > 0) resourcesAdded = true;
    if (tools && tools.added && tools.added.length > 0) resourcesAdded = true;
    if (machines && machines.added && machines.added.length > 0) resourcesAdded = true;
    if (parts && parts.added && parts.added.length > 0) resourcesAdded = true;

    // Update job status and progress when resources are assigned
    if (resourcesAdded && job.status === 'scheduled') {
      job.status = 'in_progress';
      job.progress = 20;
      job.progressHistory.push({
        progress: 20,
        status: 'in_progress',
        step: 'resource_assignment',
        message: 'Resources assigned - work started',
        updatedBy: req.user._id,
        updatedAt: new Date()
      });
    }

    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('resources.assignedTechnicians.user', 'firstName lastName email')
      .populate('parts.product', 'name sku pricing inventory');

    res.json({
      success: true,
      message: 'Job resources updated successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Update job resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get available technicians for workshop jobs
// @route   GET /api/workshop/available-technicians
// @access  Private
const getAvailableTechnicians = async (req, res) => {
  try {
    const technicians = await Technician.find({
      employmentStatus: 'active',
      isActive: true
    })
    .populate('user', 'firstName lastName email phone')
    .select('user employeeId department position statistics preferences');

    // Filter technicians who are currently available
    const availableTechnicians = technicians.filter(tech => {
      // Check if technician has user data (for standalone technicians without users)
      if (!tech.user) {
        return tech.employmentStatus === 'active' && tech.isActive;
      }
      
      // Use the virtual field to check availability
      return tech.isCurrentlyAvailable;
    });

    res.json({
      success: true,
      data: availableTechnicians.map(tech => ({
        _id: tech._id,
        user: tech.user,
        employeeId: tech.employeeId,
        department: tech.department,
        position: tech.position,
        currentWorkload: tech.statistics.currentWorkload,
        maxConcurrentJobs: tech.preferences.maxConcurrentJobs,
        isAvailable: tech.isCurrentlyAvailable
      }))
    });
  } catch (error) {
    console.error('Get available technicians error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Return tool from job
// @route   POST /api/workshop/jobs/:id/return-tool
// @access  Private
const returnTool = async (req, res) => {
  try {
    const { toolId, condition } = req.body;
    const job = await WorkshopJob.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const tool = await Tool.findById(toolId);
    if (!tool) {
      return res.status(404).json({
        success: false,
        message: 'Tool not found'
      });
    }

    // Return tool
    tool.returnTool(condition);
    await tool.save();

    // Remove tool from job resources
    job.tools = job.tools.filter(t => t.toolId && t.toolId.toString() !== toolId);
    job.lastUpdatedBy = req.user._id;
    await job.save();

    const updatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('tools.toolId', 'name category condition');

    res.json({
      success: true,
      message: 'Tool returned successfully',
      data: updatedJob
    });
  } catch (error) {
    console.error('Return tool error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get available machines for workshop jobs
// @route   GET /api/workshop/available-machines
// @access  Private
const getAvailableMachines = async (req, res) => {
  try {
    const machines = await Machine.find({
      status: 'operational',
      'availability.isAvailable': true,
      isActive: true
    })
    .select('name model manufacturer category location availability specifications');

    res.json({
      success: true,
      data: machines
    });
  } catch (error) {
    console.error('Get available machines error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Get available tools for workshop jobs
// @route   GET /api/workshop/available-tools
// @access  Private
const getAvailableTools = async (req, res) => {
  try {
    const tools = await Tool.find({
      status: 'available',
      'availability.isAvailable': true,
      isActive: true
    })
    .select('name toolNumber category condition location specifications availability usage');

    res.json({
      success: true,
      data: tools.map(tool => ({
        _id: tool._id,
        name: tool.name,
        toolNumber: tool.toolNumber,
        category: tool.category,
        condition: tool.condition,
        location: tool.location,
        specifications: tool.specifications,
        isAvailable: tool.availability.isAvailable,
        usageCount: tool.usage.usageCount,
        lastUsed: tool.usage.lastUsed
      }))
    });
  } catch (error) {
    console.error('Get available tools error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Apply service template to job
// @route   POST /api/workshop/jobs/:id/apply-template
// @access  Private
const applyServiceTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { templateId, customizations = {} } = req.body;

    const job = await WorkshopJob.findById(id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found'
      });
    }

    const template = await ServiceTemplate.findById(templateId);
    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Service template not found'
      });
    }

    // Apply template data to job
    const updatedJob = {
      title: customizations.title || template.name,
      description: customizations.description || template.description,
      priority: customizations.priority || template.priority,
      'scheduled.estimatedDuration': customizations.estimatedDuration || template.estimatedDuration,
      serviceTemplate: {
        template: template._id,
        templateName: template.name,
        appliedAt: new Date(),
        appliedBy: req.user._id,
        customizations: {
          modifiedTasks: [],
          addedTasks: [],
          removedTasks: [],
          modifiedParts: [],
          addedParts: [],
          removedParts: []
        }
      }
    };

    // Add template tasks to job
    if (template.tasks && template.tasks.length > 0) {
      const templateTasks = template.tasks.map(task => ({
        title: task.name,
        description: task.description,
        priority: template.priority,
        estimatedDuration: task.estimatedDuration,
        status: 'todo',
        createdBy: req.user._id
      }));
      
      updatedJob.tasks = [...(job.tasks || []), ...templateTasks];
    }

    // Add template parts to job
    if (template.requiredParts && template.requiredParts.length > 0) {
      const templateParts = [];
      
      for (const part of template.requiredParts) {
        // Try to find a matching product by name
        const Product = require('../models/Product');
        const matchingProduct = await Product.findOne({ 
          name: { $regex: new RegExp(part.name, 'i') } 
        });
        
        templateParts.push({
          product: matchingProduct ? matchingProduct._id : undefined,
          productName: part.name,
          productSku: matchingProduct ? matchingProduct.sku : undefined,
          quantityRequired: part.quantity,
          quantityAvailable: matchingProduct ? (matchingProduct.inventory?.currentStock || 0) : 0,
          unitCost: matchingProduct ? (matchingProduct.pricing?.costPrice || 0) : 0,
          totalCost: matchingProduct ? ((matchingProduct.pricing?.costPrice || 0) * part.quantity) : 0,
          isAvailable: matchingProduct ? ((matchingProduct.inventory?.currentStock || 0) >= part.quantity) : false,
          notes: part.optional ? 'Optional part' : undefined,
          status: matchingProduct ? 'pending' : 'shortage',
          createdBy: req.user._id
        });
      }
      
      updatedJob.parts = [...(job.parts || []), ...templateParts];
    }

    // Add template tools to job
    if (template.requiredTools && template.requiredTools.length > 0) {
      const templateTools = template.requiredTools.map(tool => ({
        name: tool.name,
        category: 'specialty_tool',
        notes: tool.optional ? 'Optional tool' : undefined,
        isAvailable: true,
        createdBy: req.user._id
      }));
      
      updatedJob.tools = [...(job.tools || []), ...templateTools];
    }

    // Update job with template data
    Object.assign(job, updatedJob);
    job.lastUpdatedBy = req.user._id;
    await job.save();

    const populatedJob = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('serviceTemplate.template', 'name description category')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('parts.product', 'name sku pricing')
      .populate('tools.toolId', 'name category')
      .populate('resources.assignedTechnicians.user', 'firstName lastName')
      .populate('resources.requiredMachines.machineId', 'name type')
      .populate('resources.workStations.stationId', 'name type');

    res.json({
      success: true,
      message: 'Service template applied successfully',
      data: populatedJob
    });
  } catch (error) {
    console.error('Apply service template error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  scheduleJob,
  updateJobProgress,
  completeJob,
  cancelJob,
  deleteJob,
  assignTechnician,
  removeTechnician,
  addTask,
  updateTaskStatus,
  bookMachine,
  releaseMachine,
  bookWorkStation,
  assignTool,
  assignResources,
  checkPartsAvailability,
  reserveParts,
  getAvailableResources,
  getJobStats,
  getCustomerJobs,
  updateJobCard,
  addCustomerComment,
  addStatusUpdate,
  checkResourceConflicts,
  getJobAnalytics,
  getWorkshopDashboard,
  markQualityCheck,
  markFollowUp,
  getAvailableTechnicians,
  returnTool,
  getAvailableTools,
  getAvailableMachines,
  updateJobResources,
  updateJobTask,
  getJobVisualization,
  applyServiceTemplate
};


