const Quotation = require('../models/Quotation');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Order = require('../models/Order');

// @desc    Get all quotations
// @route   GET /api/quotations
// @access  Private
const getQuotations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const customerId = req.query.customerId || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { quotationNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (customerId) filter.customer = customerId;

    const quotations = await Quotation.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('convertedToInvoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Quotation.countDocuments(filter);

    res.json({
      success: true,
      data: quotations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get quotations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get quotation by ID
// @route   GET /api/quotations/:id
// @access  Private
const getQuotationById = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('createdBy', 'firstName lastName')
      .populate('convertedToInvoice', 'invoiceNumber')
      .populate('items.product', 'name sku description pricing inventory');

    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    res.json({
      success: true,
      data: quotation
    });
  } catch (error) {
    console.error('Get quotation by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new quotation
// @route   POST /api/quotations
// @access  Private
const createQuotation = async (req, res) => {
  try {
    const quotationData = req.body;
    quotationData.createdBy = req.user._id;

    // Generate quotation number
    quotationData.quotationNumber = await Quotation.generateQuotationNumber();

    // Validate customer exists
    if (quotationData.customer) {
      const customer = await Customer.findById(quotationData.customer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      quotationData.customerName = `${customer.firstName} ${customer.lastName}`;
      quotationData.customerEmail = customer.email;
      quotationData.customerPhone = customer.phone;
      quotationData.customerAddress = customer.address;
    }

    // Validate products exist and populate item details
    for (let item of quotationData.items) {
      if (item.product) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }
        item.name = product.name;
        item.description = product.description;
        if (!item.unitPrice) {
          item.unitPrice = product.pricing.salePrice;
        }
      }
    }

    const quotation = new Quotation(quotationData);
    await quotation.save();

    const populatedQuotation = await Quotation.findById(quotation._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name sku description');

    res.status(201).json({
      success: true,
      data: populatedQuotation
    });
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update quotation
// @route   PUT /api/quotations/:id
// @access  Private
const updateQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Don't allow updates to converted quotations
    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update converted quotation'
      });
    }

    const updateData = req.body;

    // Validate customer if provided
    if (updateData.customer) {
      const customer = await Customer.findById(updateData.customer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      updateData.customerName = `${customer.firstName} ${customer.lastName}`;
      updateData.customerEmail = customer.email;
      updateData.customerPhone = customer.phone;
      updateData.customerAddress = customer.address;
    }

    // Validate products if provided
    if (updateData.items) {
      for (let item of updateData.items) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product not found: ${item.product}`
            });
          }
          item.name = product.name;
          item.description = product.description;
        }
      }
    }

    const updatedQuotation = await Quotation.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name sku description');

    res.json({
      success: true,
      data: updatedQuotation
    });
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete quotation
// @route   DELETE /api/quotations/:id
// @access  Private
const deleteQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    // Don't allow deletion of converted quotations
    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete converted quotation'
      });
    }

    quotation.isActive = false;
    await quotation.save();

    res.json({
      success: true,
      message: 'Quotation deleted successfully'
    });
  } catch (error) {
    console.error('Delete quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Send quotation
// @route   POST /api/quotations/:id/send
// @access  Private
const sendQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft quotations can be sent'
      });
    }

    await quotation.markAsSent();

    res.json({
      success: true,
      message: 'Quotation sent successfully',
      data: quotation
    });
  } catch (error) {
    console.error('Send quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark quotation as viewed
// @route   POST /api/quotations/:id/view
// @access  Public (for customer viewing)
const markQuotationAsViewed = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    await quotation.markAsViewed();

    res.json({
      success: true,
      message: 'Quotation marked as viewed'
    });
  } catch (error) {
    console.error('Mark quotation as viewed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Accept quotation
// @route   POST /api/quotations/:id/accept
// @access  Public (for customer acceptance)
const acceptQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation already converted to invoice'
      });
    }

    if (quotation.isExpired()) {
      return res.status(400).json({
        success: false,
        message: 'Quotation has expired'
      });
    }

    await quotation.markAsAccepted();

    res.json({
      success: true,
      message: 'Quotation accepted successfully',
      data: quotation
    });
  } catch (error) {
    console.error('Accept quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Reject quotation
// @route   POST /api/quotations/:id/reject
// @access  Public (for customer rejection)
const rejectQuotation = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id);
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation already converted to invoice'
      });
    }

    await quotation.markAsRejected();

    res.json({
      success: true,
      message: 'Quotation rejected successfully',
      data: quotation
    });
  } catch (error) {
    console.error('Reject quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Convert quotation to order
// @route   POST /api/quotations/:id/convert-to-order
// @access  Private
const convertQuotationToOrder = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation already converted'
      });
    }

    if (quotation.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted quotations can be converted to orders'
      });
    }

    // Create order from quotation
    const orderData = {
      customer: quotation.customer._id,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      orderDate: new Date(),
      expectedDeliveryDate: quotation.validUntil,
      items: quotation.items.map(item => ({
        product: item.product,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        total: item.total
      })),
      subtotal: quotation.subtotal,
      totalDiscount: quotation.totalDiscount,
      totalTax: quotation.totalTax,
      totalAmount: quotation.totalAmount,
      notes: quotation.notes,
      terms: quotation.terms,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      source: 'quotation',
      quotation: quotation._id,
      createdBy: req.user._id
    };

    const order = new Order(orderData);
    await order.save();

    // Mark quotation as converted
    quotation.status = 'converted';
    quotation.convertedAt = new Date();
    quotation.convertedToOrder = order._id;
    await quotation.save();

    res.json({
      success: true,
      message: 'Quotation converted to order successfully',
      data: {
        quotation,
        order
      }
    });
  } catch (error) {
    console.error('Convert quotation to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Convert quotation to invoice
// @route   POST /api/quotations/:id/convert
// @access  Private
const convertQuotationToInvoice = async (req, res) => {
  try {
    const quotation = await Quotation.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!quotation) {
      return res.status(404).json({
        success: false,
        message: 'Quotation not found'
      });
    }

    if (quotation.status === 'converted') {
      return res.status(400).json({
        success: false,
        message: 'Quotation already converted to invoice'
      });
    }

    if (quotation.status !== 'accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only accepted quotations can be converted to invoice'
      });
    }

    // Create invoice from quotation
    const invoiceData = {
      customer: quotation.customer._id,
      customerName: quotation.customerName,
      customerEmail: quotation.customerEmail,
      customerPhone: quotation.customerPhone,
      customerAddress: quotation.customerAddress,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: quotation.items.map(item => ({
        product: item.product,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        total: item.total
      })),
      subtotal: quotation.subtotal,
      totalDiscount: quotation.totalDiscount,
      totalTax: quotation.totalTax,
      totalAmount: quotation.totalAmount,
      notes: quotation.notes,
      terms: quotation.terms,
      status: 'draft',
      createdBy: req.user._id
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Mark quotation as converted
    await quotation.convertToInvoice(invoice._id);

    res.json({
      success: true,
      message: 'Quotation converted to invoice successfully',
      data: {
        quotation,
        invoice
      }
    });
  } catch (error) {
    console.error('Convert quotation to invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get quotation statistics
// @route   GET /api/quotations/stats
// @access  Private
const getQuotationStats = async (req, res) => {
  try {
    const totalQuotations = await Quotation.countDocuments({ isActive: true });
    const draftQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'draft' 
    });
    const sentQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'sent' 
    });
    const viewedQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'viewed' 
    });
    const acceptedQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'accepted' 
    });
    const convertedQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'converted' 
    });
    const expiredQuotations = await Quotation.countDocuments({ 
      isActive: true, 
      status: 'expired' 
    });

    // Calculate conversion rate
    const conversionRate = totalQuotations > 0 ? (convertedQuotations / totalQuotations) * 100 : 0;

    // Get total value of quotations
    const totalValue = await Quotation.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalQuotations,
        draft: draftQuotations,
        sent: sentQuotations,
        viewed: viewedQuotations,
        accepted: acceptedQuotations,
        converted: convertedQuotations,
        expired: expiredQuotations,
        conversionRate: Math.round(conversionRate * 100) / 100,
        totalValue: totalValue[0]?.total || 0
      }
    });
  } catch (error) {
    console.error('Get quotation stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  sendQuotation,
  markQuotationAsViewed,
  acceptQuotation,
  rejectQuotation,
  convertQuotationToOrder,
  convertQuotationToInvoice,
  getQuotationStats
};
