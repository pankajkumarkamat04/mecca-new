const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const type = req.query.type || '';
    const customerPhone = req.query.customerPhone || '';

    // Build filter object
    const filter = {};
    if (search) {
      // Try multiple phone number formats for search
      const phoneVariations = [
        search,
        search.replace(/\D/g, ''), // Remove all non-digits
        `+${search.replace(/\D/g, '')}`, // Add + prefix
        search.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3'), // Format as (123) 456-7890
      ];
      
      filter.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customer.firstName': { $regex: search, $options: 'i' } },
        { 'customer.lastName': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } },
        { 'customer.phone': { $in: phoneVariations } },
        { customerPhone: { $in: phoneVariations } }
      ];
    }
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (customerPhone) {
      // Try multiple phone number formats
      const phoneVariations = [
        customerPhone,
        customerPhone.replace(/\D/g, ''), // Remove all non-digits
        `+${customerPhone.replace(/\D/g, '')}`, // Add + prefix
        customerPhone.replace(/\D/g, '').replace(/^(\d{3})(\d{3})(\d{4})$/, '($1) $2-$3'), // Format as (123) 456-7890
      ];
      
      filter.$or = [
        { 'customer.phone': { $in: phoneVariations } },
        { customerPhone: { $in: phoneVariations } }
      ];
    }

    const invoices = await Invoice.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Invoice.countDocuments(filter);
    

    res.json({
      success: true,
      data: {
        data: invoices,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('items.product', 'name sku description images')
      .populate('createdBy', 'firstName lastName')
      .populate('payments.processedBy', 'firstName lastName');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      data: invoice
    });
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  try {
    const invoiceData = req.body;
    invoiceData.createdBy = req.user._id;

    // Generate invoice number if not provided
    if (!invoiceData.invoiceNumber) {
      invoiceData.invoiceNumber = await Invoice.generateInvoiceNumber(invoiceData.type);
    }

    // Validate that customerPhone is provided
    if (!invoiceData.customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone number is required'
      });
    }

    // If customerPhone is provided but no customer ID, try to find customer by phone
    if (invoiceData.customerPhone && !invoiceData.customer) {
      const customer = await Customer.findOne({ phone: invoiceData.customerPhone });
      if (customer) {
        invoiceData.customer = customer._id;
        // Set due date based on customer's payment terms (only for non-POS/workshop invoices)
        if (!invoiceData.dueDate && customer.paymentTerms > 0 && !invoiceData.isPosTransaction && !invoiceData.isWorkshopTransaction) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + customer.paymentTerms);
          invoiceData.dueDate = dueDate;
        }
      }
    }

    // Set default due date if not provided (30 days from invoice date)
    // Skip due date for POS and workshop transactions
    if (!invoiceData.dueDate && !invoiceData.isPosTransaction && !invoiceData.isWorkshopTransaction) {
      const dueDate = new Date(invoiceData.invoiceDate || new Date());
      dueDate.setDate(dueDate.getDate() + 30);
      invoiceData.dueDate = dueDate;
    }

    // Validate items and calculate totals
    if (!invoiceData.items || invoiceData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must have at least one item'
      });
    }

    // Update product stock for sale invoices
    if (invoiceData.type === 'sale') {
      for (const item of invoiceData.items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        // Check stock availability
        if (product.inventory.currentStock < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Insufficient stock for product: ${product.name}`
          });
        }

        // Update stock
        product.inventory.currentStock -= item.quantity;
        await product.save();
      }
    }

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Update customer purchase stats
    if (invoiceData.customer && invoiceData.type === 'sale') {
      const customer = await Customer.findById(invoiceData.customer);
      if (customer) {
        await customer.updatePurchaseStats(invoiceData.total);
      }
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name sku');

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: populatedInvoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Invoice with this number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
const updateInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedBy = req.user._id;

    const invoice = await Invoice.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )
    .populate('customer', 'firstName lastName email')
    .populate('store', 'name code')
    .populate('items.product', 'name sku');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: invoice
    });
  } catch (error) {
    console.error('Update invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add payment to invoice
// @route   POST /api/invoices/:id/payments
// @access  Private
const addPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const paymentData = req.body;
    paymentData.processedBy = req.user._id;
    paymentData.date = new Date();

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Check if payment exceeds remaining balance
    const remainingBalance = invoice.total - invoice.paid;
    if (paymentData.amount > remainingBalance) {
      return res.status(400).json({
        success: false,
        message: 'Payment amount exceeds remaining balance'
      });
    }

    await invoice.addPayment(paymentData);

    res.json({
      success: true,
      message: 'Payment added successfully',
      data: {
        invoiceId: id,
        newPaid: invoice.paid,
        remainingBalance: invoice.balance
      }
    });
  } catch (error) {
    console.error('Add payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Generate QR code for invoice
// @route   GET /api/invoices/:id/qr
// @access  Private
const generateQRCode = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const qrData = {
      invoiceId: invoice._id,
      invoiceNumber: invoice.invoiceNumber,
      total: invoice.total,
      status: invoice.status,
      url: `${process.env.FRONTEND_URL}/invoice/${invoice._id}`
    };

    invoice.qrCode = {
      data: JSON.stringify(qrData),
      url: qrData.url
    };
    await invoice.save();

    res.json({
      success: true,
      data: {
        qrData,
        qrUrl: invoice.qrCode.url
      }
    });
  } catch (error) {
    console.error('Generate QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats
// @access  Private
const getInvoiceStats = async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setDate(1)); // First day of current month
    const endDate = req.query.endDate || new Date(); // Today

    const filter = {
      invoiceDate: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    

    const totalInvoices = await Invoice.countDocuments(filter);
    const totalRevenue = await Invoice.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$total' } } }
    ]);

    const statusStats = await Invoice.aggregate([
      { $match: filter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    const dailyStats = await Invoice.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: {
        totalInvoices,
        totalRevenue: totalRevenue[0]?.total || 0,
        statusStats,
        dailyStats
      }
    });
  } catch (error) {
    console.error('Get invoice stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Check if invoice can be deleted (e.g., not paid)
    if (invoice.status === 'paid' && invoice.paid > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete paid invoice. Consider cancelling instead.' 
      });
    }

    await Invoice.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    console.error('Delete invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  addPayment,
  generateQRCode,
  getInvoiceStats
};
