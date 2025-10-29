const SalesOutlet = require('../models/SalesOutlet');

// @desc    Get all sales outlets
// @route   GET /api/sales-outlets
// @access  Private
const getSalesOutlets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { outletCode: { $regex: search, $options: 'i' } },
        { 'address.city': { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const outlets = await SalesOutlet.find(filter)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await SalesOutlet.countDocuments(filter);

    res.json({
      success: true,
      data: outlets,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sales outlets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get sales outlet by ID
// @route   GET /api/sales-outlets/:id
// @access  Private
const getSalesOutletById = async (req, res) => {
  try {
    const outlet = await SalesOutlet.findById(req.params.id)
      .populate('warehouse', 'name code address')
      .populate('createdBy', 'firstName lastName')
      .populate('updatedBy', 'firstName lastName');

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    res.json({
      success: true,
      data: outlet
    });
  } catch (error) {
    console.error('Get sales outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new sales outlet
// @route   POST /api/sales-outlets
// @access  Private
const createSalesOutlet = async (req, res) => {
  try {
    const outletData = req.body;
    outletData.createdBy = req.user._id;

    const outlet = new SalesOutlet(outletData);
    await outlet.save();

    const populatedOutlet = await SalesOutlet.findById(outlet._id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Sales outlet created successfully',
      data: populatedOutlet
    });
  } catch (error) {
    console.error('Create sales outlet error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Outlet code already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update sales outlet
// @route   PUT /api/sales-outlets/:id
// @access  Private
const updateSalesOutlet = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedBy = req.user._id;

    const outlet = await SalesOutlet.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('warehouse', 'name code')
    .populate('createdBy', 'firstName lastName')
    .populate('updatedBy', 'firstName lastName');

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    res.json({
      success: true,
      message: 'Sales outlet updated successfully',
      data: outlet
    });
  } catch (error) {
    console.error('Update sales outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete sales outlet
// @route   DELETE /api/sales-outlets/:id
// @access  Private
const deleteSalesOutlet = async (req, res) => {
  try {
    const outlet = await SalesOutlet.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    // Check if outlet has associated invoices or transactions
    const Invoice = require('../models/Invoice');
    const Transaction = require('../models/Transaction');
    
    const invoiceCount = await Invoice.countDocuments({ salesOutlet: outlet._id });
    
    if (invoiceCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete outlet. It has ${invoiceCount} associated invoice(s). Please reassign or remove these invoices first.`
      });
    }

    // Hard delete - permanently remove from database
    await SalesOutlet.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Sales outlet deleted successfully'
    });
  } catch (error) {
    console.error('Delete sales outlet error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get active sales outlets (for dropdown selection)
// @route   GET /api/sales-outlets/active/list
// @access  Private
const getActiveOutlets = async (req, res) => {
  try {
    const outlets = await SalesOutlet.find({ isActive: true })
      .select('outletCode name type address.city')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: outlets
    });
  } catch (error) {
    console.error('Get active outlets error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get sales outlet stats
// @route   GET /api/sales-outlets/:id/stats
// @access  Private
const getOutletStats = async (req, res) => {
  try {
    const outlet = await SalesOutlet.findById(req.params.id);

    if (!outlet) {
      return res.status(404).json({
        success: false,
        message: 'Sales outlet not found'
      });
    }

    // Import required models
    const Invoice = require('../models/Invoice');
    const Transaction = require('../models/Transaction');

    // Calculate stats from actual transactions and invoices
    const outletId = outlet._id;

    // First, get all invoice IDs for this outlet
    // MongoDB will handle ObjectId comparison correctly
    const outletInvoiceIds = await Invoice.find({
      salesOutlet: outletId
    }).select('_id salesOutlet').lean();
    
    console.log('Outlet Stats Query:', {
      outletId: outletId.toString(),
      outletName: outlet.name,
      invoicesFound: outletInvoiceIds.length,
      invoiceIds: outletInvoiceIds.map(inv => inv._id.toString())
    });
    
    const invoiceIds = outletInvoiceIds.map(inv => inv._id);

    // Get transactions linked to invoices with this outlet
    const transactions = await Transaction.find({
      type: 'sale',
      status: 'posted',
      invoice: { $in: invoiceIds }
    })
    .populate('invoice', 'invoiceNumber salesOutlet status total paid balance isPosTransaction')
    .lean();

    // All transactions are valid since we filtered by invoice IDs
    const validTransactions = transactions.filter(t => t.invoice);

    // Get invoices directly linked to this outlet (non-POS invoices)
    const invoices = await Invoice.find({
      salesOutlet: outletId,
      isPosTransaction: { $ne: true }
    }).lean();

    // Get transaction invoice IDs to avoid double counting
    const transactionInvoiceIds = new Set(
      validTransactions.map(t => t.invoice?._id?.toString()).filter(Boolean)
    );

    // Calculate total sales from transactions
    // Use invoice total when available (same logic as sales report)
    const transactionTotal = validTransactions.reduce((sum, t) => {
      let transactionAmount = t.amount || 0;
      
      // If transaction is linked to an invoice, use invoice total
      if (t.invoice && typeof t.invoice === 'object' && t.invoice.total) {
        transactionAmount = Number(t.invoice.total || transactionAmount);
      }
      
      return sum + transactionAmount;
    }, 0);

    // Calculate total from invoices (excluding those already counted in transactions)
    const invoiceTotal = invoices
      .filter(inv => !transactionInvoiceIds.has(inv._id.toString()))
      .reduce((sum, inv) => sum + (inv.total || 0), 0);

    const totalSales = transactionTotal + invoiceTotal;
    const totalTransactions = validTransactions.length + invoices.filter(inv => !transactionInvoiceIds.has(inv._id.toString())).length;
    
    console.log('Outlet Stats Final Calculation:', {
      outletId: outletId.toString(),
      outletName: outlet.name,
      invoiceIdsForTransactions: invoiceIds.length,
      validTransactionsCount: validTransactions.length,
      nonPosInvoicesCount: invoices.length,
      excludedInvoiceIds: transactionInvoiceIds.size,
      transactionTotal,
      invoiceTotal,
      totalSales,
      totalTransactions,
      averageTransactionValue
    });

    // Get last sale date
    const allDates = [
      ...validTransactions.map(t => t.date ? new Date(t.date) : null),
      ...invoices.map(inv => inv.invoiceDate ? new Date(inv.invoiceDate) : null)
    ].filter(Boolean).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const lastSaleDate = allDates.length > 0 ? allDates[0] : null;
    const averageTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;

    res.json({
      success: true,
      data: {
        totalSales,
        totalTransactions,
        lastSaleDate,
        averageTransactionValue
      }
    });
  } catch (error) {
    console.error('Get outlet stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSalesOutlets,
  getSalesOutletById,
  createSalesOutlet,
  updateSalesOutlet,
  deleteSalesOutlet,
  getActiveOutlets,
  getOutletStats
};

