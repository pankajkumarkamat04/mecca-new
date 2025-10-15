const Invoice = require('../models/Invoice');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Setting = require('../models/Setting');
const { prepareCurrencyData } = require('../utils/currencyUtils');

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
      data: invoices,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
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

    // Normalize status defensively (validator also sanitizes)
    if (invoiceData.status) {
      const status = String(invoiceData.status).toLowerCase();
      const allowed = new Set(['draft','pending','paid','partial','overdue','cancelled','refunded']);
      const aliasMap = { unpaid: 'pending', processing: 'pending', open: 'pending', closed: 'paid' };
      const normalized = aliasMap[status] || status;
      if (!allowed.has(normalized)) delete invoiceData.status;
      else invoiceData.status = normalized;
    }

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

    // Process items to ensure all required fields are present
    for (let i = 0; i < invoiceData.items.length; i++) {
      const item = invoiceData.items[i];

      // Normalize possibly empty strings to undefined
      const isEmpty = (v) => v === '' || v === null || v === undefined;

      // Fetch product and ensure existence
      let product = null;
      if (item.product) {
        product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found for item ${i + 1}`
          });
        }
      }

      // Populate name/sku/description from product when missing
      if (product) {
        if (isEmpty(item.name)) item.name = product.name;
        if (isEmpty(item.sku)) item.sku = product.sku;
        if (isEmpty(item.description)) item.description = product.description;
      }

      // Validate name
      if (isEmpty(item.name)) {
        return res.status(400).json({
          success: false,
          message: `Item name is required for item ${i + 1}`
        });
      }

      // Resolve numeric fields with sane defaults
      const resolvedUnitPrice = !isEmpty(item.unitPrice)
        ? Number(item.unitPrice)
        : Number(product?.pricing?.sellingPrice ?? 0);
      const resolvedQuantity = !isEmpty(item.quantity) ? Number(item.quantity) : 1;
      const resolvedDiscount = !isEmpty(item.discount) ? Number(item.discount) : 0;
      const resolvedTaxRate = !isEmpty(item.taxRate)
        ? Number(item.taxRate)
        : Number(product?.pricing?.taxRate ?? 0);

      if (Number.isNaN(resolvedTaxRate) || resolvedTaxRate < 0 || resolvedTaxRate > 100) {
        return res.status(400).json({
          success: false,
          message: `Tax rate must be a number between 0 and 100 for item ${i + 1}`
        });
      }

      // Compute item totals (always compute to avoid stale/invalid totals from client)
      const itemSubtotal = Math.max(0, (Number(resolvedUnitPrice) * Number(resolvedQuantity)) - Number(resolvedDiscount));
      const itemTaxAmount = (itemSubtotal * resolvedTaxRate) / 100;
      const itemTotal = itemSubtotal + itemTaxAmount;

      // Assign normalized/calculated fields back
      item.unitPrice = Number.isFinite(resolvedUnitPrice) ? resolvedUnitPrice : 0;
      item.quantity = Number.isFinite(resolvedQuantity) ? resolvedQuantity : 1;
      item.discount = Number.isFinite(resolvedDiscount) ? resolvedDiscount : 0;
      item.taxRate = resolvedTaxRate; // can be 0
      item.taxAmount = Number.isFinite(itemTaxAmount) ? itemTaxAmount : 0;
      item.total = Number.isFinite(itemTotal) ? itemTotal : 0;

      // Final validation for item total
      if (Number.isNaN(item.total) || item.total < 0) {
        return res.status(400).json({
          success: false,
          message: `Item total must be a non-negative number for item ${i + 1}`
        });
      }
    }

    // Calculate invoice totals
    const subtotal = invoiceData.items.reduce((sum, item) => sum + (Number(item.unitPrice) * Number(item.quantity) - Number(item.discount || 0)), 0);
    const totalTax = invoiceData.items.reduce((sum, item) => {
      const itemSubtotal = (Number(item.unitPrice) * Number(item.quantity)) - Number(item.discount || 0);
      return sum + ((itemSubtotal * Number(item.taxRate || 0)) / 100);
    }, 0);
    const totalDiscount = invoiceData.items.reduce((sum, item) => sum + Number(item.discount || 0), 0);
    const shippingCost = Number(invoiceData.shippingCost || 0);
    const total = subtotal + totalTax + shippingCost;

    // Set calculated totals
    invoiceData.subtotal = subtotal;
    invoiceData.totalTax = totalTax;
    invoiceData.totalDiscount = totalDiscount;
    invoiceData.total = total;
    invoiceData.balance = total - Number(invoiceData.paid || 0);

    // Get settings for currency information
    const settings = await Setting.getSingleton();
    const displayCurrency = invoiceData.displayCurrency || settings.company.currencySettings?.defaultDisplayCurrency || 'USD';
    
    // Add currency data to invoice if not already present
    if (!invoiceData.currency) {
      // Handle ZWL currency specifically - ensure it has proper exchange rate
      let currencyData = prepareCurrencyData(settings, displayCurrency);
      
      // If ZWL is requested but not found in settings, create default ZWL config
      if (displayCurrency === 'ZWL' && (!currencyData.exchangeRate || currencyData.exchangeRate === 1)) {
        currencyData = {
          baseCurrency: 'USD',
          displayCurrency: 'ZWL',
          exchangeRate: 30, // Default ZWL rate if not configured
          exchangeRateDate: new Date()
        };
      }
      
      invoiceData.currency = currencyData;
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
    .populate('items.product', 'name sku');

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    // Update corresponding order payment status if order exists and status was changed
    if (invoice.order && updateData.status) {
      const Order = require('../models/Order');
      const order = await Order.findById(invoice.order);
      
      if (order) {
        // Map invoice status to order payment status
        let orderPaymentStatus = order.paymentStatus;
        switch (updateData.status) {
          case 'pending':
            orderPaymentStatus = 'pending';
            break;
          case 'partial':
            orderPaymentStatus = 'partial';
            break;
          case 'paid':
            orderPaymentStatus = 'paid';
            break;
          case 'refunded':
            orderPaymentStatus = 'refunded';
            break;
          case 'cancelled':
            orderPaymentStatus = 'cancelled';
            break;
          default:
            orderPaymentStatus = 'pending';
        }
        
        if (order.paymentStatus !== orderPaymentStatus) {
          order.paymentStatus = orderPaymentStatus;
          await order.save();
          console.log(`Order ${order.orderNumber} payment status updated to ${orderPaymentStatus} for invoice ${invoice.invoiceNumber}`);
        }
      }
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
