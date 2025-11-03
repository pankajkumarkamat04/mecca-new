const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const StockMovement = require('../models/StockMovement');
const Setting = require('../models/Setting');
const SalesOutlet = require('../models/SalesOutlet');
const { prepareCurrencyData, convertToBaseCurrency } = require('../utils/currencyUtils');
const SalesTransactionService = require('../services/salesTransactionService');

// @desc    Open POS register
// @route   POST /api/pos/registers/:registerId/open
// @access  Private
const openRegister = async (req, res) => {
  try {
    // POS register feature removed with Store module
    return res.status(410).json({ success: false, message: 'POS register feature removed' });
  } catch (error) {
    console.error('Open register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Close POS register
// @route   POST /api/pos/registers/:registerId/close
// @access  Private
const closeRegister = async (req, res) => {
  try {
    return res.status(410).json({ success: false, message: 'POS register feature removed' });
  } catch (error) {
    console.error('Close register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create POS transaction
// @route   POST /api/pos/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const transactionData = req.body;
    transactionData.createdBy = req.user._id;

    // Get settings for currency information
    const settings = await Setting.getSingleton();
    const displayCurrency = transactionData.displayCurrency || settings.company.currencySettings?.defaultDisplayCurrency || 'USD';
    const currencyData = prepareCurrencyData(settings, displayCurrency);
    const exchangeRate = currencyData.exchangeRate || 1;

    // Validate items and stock availability (no stock changes here)
    for (const item of transactionData.items) {
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
    }

    // Generate invoice number
    const invoiceNumber = await Invoice.generateInvoiceNumber('sale');

    // Get customer tax exemption status
    let customerTaxExempt = false;
    if (transactionData.customer) {
      const customer = await Customer.findById(transactionData.customer);
      if (customer) {
        customerTaxExempt = customer.taxSettings?.isTaxExempt || false;
      }
    }

    // Build invoice items from products to ensure correct pricing and tax
    const items = [];
    let subtotal = 0;
    let totalDiscount = 0; // no line discounts for POS simple sale
    let totalTax = 0;
    const shippingCost = 0;
    for (const item of transactionData.items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({ success: false, message: `Product not found: ${item.product}` });
      }
      
      // Use price from frontend which is in BASE (USD); do NOT reconvert
      const unitPriceBase = Number(item.price) || product.pricing.sellingPrice;
      
      const quantity = Number(item.quantity) || 0;
      const lineBase = unitPriceBase * quantity;
      
      // Determine tax rate based on multiple factors
      let effectiveTaxRate = 0;

      // 0. Respect explicit item-level taxRate override if valid (0-100)
      if (typeof item.taxRate === 'number' && item.taxRate >= 0 && item.taxRate <= 100) {
        effectiveTaxRate = item.taxRate;
      } else {
      
      // 1. Check if universal tax override is applied
      if (transactionData.applyTax !== undefined) {
        effectiveTaxRate = transactionData.applyTax ? (product.pricing.taxRate || 0) : 0;
      }
      // 2. Check if customer is tax exempt
      else if (customerTaxExempt) {
        effectiveTaxRate = 0;
      }
      // 3. Check if product is taxable
      else if (!product.taxSettings?.isTaxable) {
        effectiveTaxRate = 0;
      }
      // 4. Check if item has specific tax override
      else if (item.applyTax !== undefined) {
        effectiveTaxRate = item.applyTax ? (product.pricing.taxRate || 0) : 0;
      }
      // 5. Use default product tax rate
      else {
        effectiveTaxRate = product.pricing.taxRate || 0;
      }
      }
      
      const lineTax = (lineBase * effectiveTaxRate) / 100;
      subtotal += lineBase;
      totalTax += lineTax;
      
      items.push({
        product: product._id,
        name: product.name,
        description: product.description || undefined,
        sku: product.sku,
        quantity,
        unitPrice: unitPriceBase, // Store in base currency (USD)
        discount: 0,
        taxRate: effectiveTaxRate, // Store the effective tax rate used
        total: 0, // calculated by pre-save, but we keep our totals above
        taxOverride: {
          applied: transactionData.applyTax !== undefined || item.applyTax !== undefined,
          universalOverride: transactionData.applyTax !== undefined,
          itemOverride: item.applyTax !== undefined,
          customerExempt: customerTaxExempt,
          productTaxable: product.taxSettings?.isTaxable !== false
        }
      });
    }

    const total = subtotal - totalDiscount + totalTax + shippingCost;

    // Handle tendered amount and partial payments (currency-aware)
    const paymentMethod = transactionData.paymentMethod || 'cash';
    const tenderedDisplay = Number(transactionData.tenderedAmount) || 0;
    const tenderedBase = convertToBaseCurrency(tenderedDisplay, exchangeRate);

    // Calculate change amount
    const changeAmount = Math.max(0, tenderedBase - total);
    
    // Build payments array (store amounts in base currency)
    const payments = [];
    if (tenderedBase > 0) {
      payments.push({
        method: paymentMethod,
        amount: Number(tenderedBase.toFixed(2)),
        metadata: {
          tenderedDisplay: Number(tenderedDisplay.toFixed(2)),
          tenderedAmount: Number(tenderedBase.toFixed(2)),
          changeAmount: Number(changeAmount.toFixed(2)),
          exchangeRate
        },
        date: new Date(),
        processedBy: req.user._id
      });
    }

    // Now that validation passed, update stock ONCE and create stock movements
    for (const item of transactionData.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.inventory.currentStock < item.quantity) {
        return res.status(400).json({ success: false, message: `Insufficient stock for product: ${product.name}` });
      }
      const previousStock = Number(product.inventory.currentStock || 0);
      const quantity = Number(item.quantity || 0);
      const newStock = Math.max(0, previousStock - quantity);
      product.inventory.currentStock = newStock;
      await product.save();

      try {
        const unitCost = Number(product.pricing?.costPrice || 0);
        const movement = new StockMovement({
          product: product._id,
          movementType: 'out',
          quantity,
          unitCost,
          totalCost: unitCost * quantity,
          previousStock,
          newStock,
          reason: `POS sale ${invoiceNumber}`,
          createdBy: req.user._id,
        });
        await movement.save();
      } catch (e) {
        console.error('POS StockMovement create error:', e);
      }
    }

    // Validate that customerPhone is provided
    if (!transactionData.customerPhone) {
      return res.status(400).json({
        success: false,
        message: 'Customer phone number is required for POS transactions'
      });
    }

    // Validate/resolve sales outlet if provided (accepts ObjectId, outletCode, or name)
    if (transactionData.salesOutlet) {
      let outlet = null;
      const param = transactionData.salesOutlet;
      // Accept: ObjectId string, full object with _id, or code/name
      if (typeof param === 'object' && param !== null) {
        if (param._id && mongoose.Types.ObjectId.isValid(String(param._id))) {
          outlet = await SalesOutlet.findById(String(param._id));
        }
        if (!outlet && param.outletCode) {
          outlet = await SalesOutlet.findOne({ outletCode: String(param.outletCode).toUpperCase() });
        }
        if (!outlet && param.name) {
          outlet = await SalesOutlet.findOne({ name: String(param.name) });
        }
      } else if (typeof param === 'string') {
        const trimmed = param.trim();
        if (mongoose.Types.ObjectId.isValid(trimmed)) {
          outlet = await SalesOutlet.findById(trimmed);
        }
        if (!outlet) {
          outlet = await SalesOutlet.findOne({ $or: [
            { outletCode: trimmed.toUpperCase() },
            { name: trimmed }
          ]});
        }
      }
      if (!outlet) {
        return res.status(400).json({ success: false, message: 'Invalid sales outlet' });
      }
      transactionData.salesOutlet = outlet._id;
    }

    // Create invoice with computed totals (no due date for POS transactions)
    // Determine paid/balance and status (support partial)
    const paidAmount = Math.min(tenderedBase, total);
    const balanceAmount = Math.max(0, total - paidAmount);
    const invoiceStatus = balanceAmount === 0 ? 'paid' : (paidAmount > 0 ? 'partial' : 'pending');

    const invoice = new Invoice({
      invoiceNumber,
      type: 'sale',
      status: invoiceStatus,
      customer: transactionData.customer || undefined,
      customerPhone: transactionData.customerPhone,
      salesOutlet: transactionData.salesOutlet || undefined,
      salesPerson: req.user.role === 'sales_person' ? req.user._id : undefined,
      salesPersonName: req.user.role === 'sales_person' ? `${req.user.firstName} ${req.user.lastName}` : undefined,
      salesPersonEmail: req.user.role === 'sales_person' ? req.user.email : undefined,
      items,
      discounts: [],
      taxes: [],
      shipping: { cost: shippingCost },
      subtotal,
      totalDiscount,
      totalTax,
      total,
      paid: Number(paidAmount.toFixed(2)),
      balance: Number(balanceAmount.toFixed(2)),
      currency: currencyData, // Store currency information
      payments: payments, // Include payment details with tender/change
      notes: transactionData.note || undefined,
      isPosTransaction: true, // Mark as POS transaction
      createdBy: req.user._id
    });

    await invoice.save();

    // Create automatic finance transaction for tracking sales by sales person
    try {
      await SalesTransactionService.createPOSTransaction(transactionData, invoice, req.user);
    } catch (error) {
      console.error('Failed to create finance transaction for POS sale:', error);
      // Don't fail the POS transaction if finance transaction creation fails
    }

    // Update sales outlet stats
    if (transactionData.salesOutlet) {
      try {
        const outlet = await SalesOutlet.findById(transactionData.salesOutlet);
        if (outlet) {
          await outlet.updateSalesStats(total);
        }
      } catch (e) {
        console.error('Update outlet stats error:', e);
      }
    }

    // Update register session
    // Update customer stats if customer exists or if phone number is provided
    if (transactionData.customer) {
      const customer = await Customer.findById(transactionData.customer);
      if (customer) {
        await customer.updatePurchaseStats(total);
      }
    } else if (transactionData.customerPhone) {
      // Try to find customer by phone number
      const customer = await Customer.findOne({ phone: transactionData.customerPhone });
      if (customer) {
        // Update the invoice with the found customer
        invoice.customer = customer._id;
        await invoice.save();
        await customer.updatePurchaseStats(total);
      }
    }

    const populatedInvoice = await Invoice.findById(invoice._id)
      .populate('customer', 'firstName lastName email')
      .populate('items.product', 'name sku')
      .populate('salesOutlet', 'outletCode name type address');

    // Accounting transaction is now created by SalesTransactionService.createPOSTransaction above
    // Removed duplicate manual transaction creation to avoid double booking

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: populatedInvoice
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get register status
// @route   GET /api/pos/registers/:registerId/status
// @access  Private
const getRegisterStatus = async (req, res) => {
  try {
    return res.status(410).json({ success: false, message: 'POS register feature removed' });
  } catch (error) {
    console.error('Get register status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get register session history
// @route   GET /api/pos/registers/:registerId/sessions
// @access  Private
const getRegisterSessions = async (req, res) => {
  try {
    return res.status(410).json({ success: false, message: 'POS register feature removed' });
  } catch (error) {
    console.error('Get register sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get POS dashboard data
// @route   GET /api/pos/dashboard
// @access  Private
const getPOSDashboard = async (req, res) => {
  try {
    // POS register feature removed
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const transactionFilter = {
      invoiceDate: { $gte: today, $lt: tomorrow },
      type: 'sale'
    };

    const todayTransactions = await Invoice.find(transactionFilter)
      .sort({ createdAt: -1 })
      .limit(10);

    const todayStats = await Invoice.aggregate([
      { $match: transactionFilter },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageTransaction: { $avg: '$total' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        activeRegisters: [],
        todayTransactions,
        todayStats: todayStats[0] || {
          totalTransactions: 0,
          totalRevenue: 0,
          averageTransaction: 0
        }
      }
    });
  } catch (error) {
    console.error('Get POS dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  openRegister,
  closeRegister,
  createTransaction,
  getRegisterStatus,
  getRegisterSessions,
  getPOSDashboard
};
