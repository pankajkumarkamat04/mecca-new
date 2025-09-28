const WorkshopJob = require('../models/WorkshopJob');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const Machine = require('../models/Machine');
const Tool = require('../models/Tool');
const WorkStation = require('../models/WorkStation');
const Technician = require('../models/Technician');

// Internal helper to process completion: deduct inventory and create invoice
async function processJobCompletion(jobId, userId) {
  const Invoice = require('../models/Invoice');
  // Load latest job with parts populated
  const job = await WorkshopJob.findById(jobId).populate('parts.product');
  if (!job) return { job: null };

  

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
  

  // Build invoice items from used parts
  const items = [];
  for (const part of (job.parts || [])) {
    const qtyUsedRaw = Number(part.quantityUsed ?? 0);
    const qtyReqRaw = Number(part.quantityRequired ?? 0);
    const usedQty = qtyUsedRaw > 0 ? qtyUsedRaw : (qtyReqRaw > 0 ? qtyReqRaw : 0);
    if (!part.product || usedQty <= 0) continue;
    const product = await Product.findById(part.product._id || part.product);
    if (!product) continue;
    items.push({
      product: product._id,
      name: product.name,
      description: product.description || undefined,
      sku: product.sku,
      quantity: usedQty,
      unitPrice: Number(product.pricing?.sellingPrice ?? 0),
      discount: 0,
      taxRate: Number(product.pricing?.taxRate ?? 0),
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
    const job = await WorkshopJob.create(data);
    const populated = await WorkshopJob.findById(job._id)
      .populate('customer', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('tasks.assignee', 'firstName lastName');
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
    if (search) filter.title = { $regex: search, $options: 'i' };

    const jobs = await WorkshopJob.find(filter)
      .populate('customer', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .populate('tasks.assignee', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    const total = await WorkshopJob.countDocuments(filter);

    res.json({ success: true, data: jobs, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
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

// Update job card (including tasks, parts, tools, schedule)
const updateJob = async (req, res) => {
  try {
    const previous = await WorkshopJob.findById(req.params.id).select('status');
    if (!previous) return res.status(404).json({ success: false, message: 'Job not found' });

    const update = { ...req.body, lastUpdatedBy: req.user._id };
    const job = await WorkshopJob.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true })
      .populate('customer', 'firstName lastName email')
      .populate('tasks.assignee', 'firstName lastName')
      .populate('parts.product', 'name sku pricing inventory')
      .populate('createdBy', 'firstName lastName');
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

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
    const current = await WorkshopJob.findById(req.params.id).populate('parts.product');
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
    const { progress, status } = req.body;
    const job = await WorkshopJob.findByIdAndUpdate(req.params.id, { progress, status, lastUpdatedBy: req.user._id }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job progress updated', data: job });
  } catch (error) {
    console.error('Update job progress error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Complete job: deduct used parts from inventory
const completeJob = async (req, res) => {
  try {
    const result = await processJobCompletion(req.params.id, req.user._id);
    if (!result.job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job completed and inventory updated', data: result.job });
  } catch (error) {
    console.error('Complete job error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Delete/Cancel job
const cancelJob = async (req, res) => {
  try {
    const job = await WorkshopJob.findByIdAndUpdate(req.params.id, { status: 'cancelled', isActive: false, lastUpdatedBy: req.user._id }, { new: true });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job cancelled', data: job });
  } catch (error) {
    console.error('Cancel job error:', error);
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
    job.assignTechnician(technicianId, `${technician.user.firstName} ${technician.user.lastName}`, role, req.user._id);
    job.lastUpdatedBy = req.user._id;
    await job.save();

    // Update technician's current jobs
    technician.assignJob(job._id, role);
    await technician.save();

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
      message: 'Server error'
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

    // Update technician's current jobs
    const technician = await Technician.findById(technicianId);
    if (technician) {
      technician.completeJob(job._id);
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
      message: 'Server error'
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
      message: 'Server error'
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
      message: 'Server error'
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
      }).populate('user', 'firstName lastName email').select('user employeeId department position skills');
      resources.technicians = technicians;
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
    const draftJobs = await WorkshopJob.countDocuments({ status: 'draft', isActive: true });
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
          draft: draftJobs,
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

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  scheduleJob,
  updateJobProgress,
  completeJob,
  cancelJob,
  assignTechnician,
  removeTechnician,
  addTask,
  updateTaskStatus,
  bookMachine,
  bookWorkStation,
  assignTool,
  checkPartsAvailability,
  reserveParts,
  getAvailableResources,
  getJobStats,
  getCustomerJobs
};


