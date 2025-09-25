const WorkshopJob = require('../models/WorkshopJob');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');

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
      const invoiceNumber = await Invoice.generateInvoiceNumber('sale');
      const invoice = new Invoice({
        invoiceNumber,
        type: 'sale',
        status: 'pending',
        customer: job.customer || undefined,
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

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  scheduleJob,
  updateJobProgress,
  completeJob,
  cancelJob,
};


