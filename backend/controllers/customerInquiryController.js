const CustomerInquiry = require('../models/CustomerInquiry');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const { notifyWarehouseOfNewOrder } = require('../utils/warehouseNotification');

// @desc    Get all customer inquiries
// @route   GET /api/customer-inquiries
// @access  Private
const getCustomerInquiries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const priority = req.query.priority || '';
    const source = req.query.source || '';
    const assignedTo = req.query.assignedTo || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { inquiryNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;
    if (assignedTo) filter.assignedTo = assignedTo;

    const inquiries = await CustomerInquiry.find(filter)
      .populate('customer', 'firstName lastName email phone customerCode')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('quotation', 'quotationNumber status')
      .populate('order', 'orderNumber orderStatus')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await CustomerInquiry.countDocuments(filter);

    res.json({
      success: true,
      data: inquiries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get customer inquiries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get customer inquiry by ID
// @route   GET /api/customer-inquiries/:id
// @access  Private
const getCustomerInquiryById = async (req, res) => {
  try {
    const inquiry = await CustomerInquiry.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone customerCode address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('quotation', 'quotationNumber status totalAmount')
      .populate('order', 'orderNumber orderStatus totalAmount')
      .populate('items.product', 'name sku description pricing inventory');

    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Customer inquiry not found'
      });
    }

    res.json({
      success: true,
      data: inquiry
    });
  } catch (error) {
    console.error('Get customer inquiry by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new customer inquiry
// @route   POST /api/customer-inquiries
// @access  Private
const createCustomerInquiry = async (req, res) => {
  try {
    const inquiryData = req.body;
    inquiryData.createdBy = req.user._id;

    // Generate inquiry number
    inquiryData.inquiryNumber = await CustomerInquiry.generateInquiryNumber();

    // Validate customer exists
    if (inquiryData.customer) {
      const customer = await Customer.findById(inquiryData.customer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      inquiryData.customerName = `${customer.firstName} ${customer.lastName}`;
      inquiryData.customerEmail = customer.email;
      inquiryData.customerPhone = customer.phone;
    }

    // Validate products exist and populate item details
    if (inquiryData.productsOfInterest) {
      for (let item of inquiryData.productsOfInterest) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product not found: ${item.product}`
            });
          }
          // Populate the name field from the product
          item.name = product.name;
        }
      }
    }

    const inquiry = new CustomerInquiry(inquiryData);
    await inquiry.save();

    const populatedInquiry = await CustomerInquiry.findById(inquiry._id)
      .populate('customer', 'firstName lastName email phone customerCode')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedInquiry
    });
  } catch (error) {
    console.error('Create customer inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update customer inquiry
// @route   PUT /api/customer-inquiries/:id
// @access  Private
const updateCustomerInquiry = async (req, res) => {
  try {
    const inquiry = await CustomerInquiry.findById(req.params.id);
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Customer inquiry not found'
      });
    }

    // Don't allow updates to converted inquiries
    if (['converted_to_order', 'closed', 'cancelled'].includes(inquiry.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update inquiry in current status'
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
    }

    // Validate products if provided
    if (updateData.productsOfInterest) {
      for (let item of updateData.productsOfInterest) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (!product) {
            return res.status(404).json({
              success: false,
              message: `Product not found: ${item.product}`
            });
          }
        }
      }
    }

    const updatedInquiry = await CustomerInquiry.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'firstName lastName email phone customerCode')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    res.json({
      success: true,
      data: updatedInquiry
    });
  } catch (error) {
    console.error('Update customer inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update customer inquiry status
// @route   PUT /api/customer-inquiries/:id/status
// @access  Private
const updateCustomerInquiryStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const inquiry = await CustomerInquiry.findById(req.params.id);
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Customer inquiry not found'
      });
    }

    inquiry.status = status;
    if (notes) {
      inquiry.internalNotes = notes;
    }
    await inquiry.save();

    const updatedInquiry = await CustomerInquiry.findById(inquiry._id)
      .populate('customer', 'firstName lastName email phone customerCode')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    res.json({
      success: true,
      message: 'Inquiry status updated successfully',
      data: updatedInquiry
    });
  } catch (error) {
    console.error('Update customer inquiry status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign inquiry to user
// @route   PUT /api/customer-inquiries/:id/assign
// @access  Private
const assignCustomerInquiry = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const inquiry = await CustomerInquiry.findById(req.params.id);
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Customer inquiry not found'
      });
    }

    inquiry.assignedTo = assignedTo;
    await inquiry.save();

    const updatedInquiry = await CustomerInquiry.findById(inquiry._id)
      .populate('assignedTo', 'firstName lastName');

    res.json({
      success: true,
      message: 'Inquiry assigned successfully',
      data: updatedInquiry
    });
  } catch (error) {
    console.error('Assign customer inquiry error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Convert inquiry to quotation
// @route   POST /api/customer-inquiries/:id/convert-to-quotation
// @access  Private
const convertInquiryToQuotation = async (req, res) => {
  try {
    const inquiry = await CustomerInquiry.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Customer inquiry not found'
      });
    }

    if (inquiry.status !== 'new' && inquiry.status !== 'under_review') {
      return res.status(400).json({
        success: false,
        message: 'Inquiry cannot be converted to quotation in current status'
      });
    }

    if (inquiry.quotation) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry already has a quotation'
      });
    }

    if (!inquiry.productsOfInterest || inquiry.productsOfInterest.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry must have products of interest to convert to quotation'
      });
    }

    // Create quotation from inquiry
    const quotationData = {
      customer: inquiry.customer._id,
      customerName: inquiry.customerName,
      customerEmail: inquiry.customerEmail,
      customerPhone: inquiry.customerPhone,
      customerAddress: inquiry.customer.address,
      quotationDate: new Date(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
       items: (inquiry.productsOfInterest || []).map(item => ({
         product: item.product,
         quantity: item.quantity || 1,
         unitPrice: 0, // Will be set when creating actual quotation
         discount: 0,
         taxRate: 0,
         total: 0
       })),
       notes: inquiry.message,
      status: 'draft',
      createdBy: req.user._id
    };

    const quotation = new Quotation(quotationData);
    await quotation.save();

    // Link quotation to inquiry and update status
    inquiry.quotation = quotation._id;
    inquiry.status = 'quoted';
    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry converted to quotation successfully',
      data: {
        inquiry,
        quotation
      }
    });
  } catch (error) {
    console.error('Convert inquiry to quotation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Convert inquiry to order
// @route   POST /api/customer-inquiries/:id/convert-to-order
// @access  Private
const convertInquiryToOrder = async (req, res) => {
  try {
    const inquiry = await CustomerInquiry.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: 'Customer inquiry not found'
      });
    }

    if (!inquiry.quotation) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry must be quoted before converting to order'
      });
    }

    if (inquiry.order) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry already has an order'
      });
    }

    if (!inquiry.productsOfInterest || inquiry.productsOfInterest.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Inquiry must have products of interest to convert to order'
      });
    }

    // Create order from inquiry
    const orderData = {
      customer: inquiry.customer._id,
      customerName: inquiry.customerName,
      customerEmail: inquiry.customerEmail,
      customerPhone: inquiry.customerPhone,
      customerAddress: inquiry.customer.address,
      orderDate: new Date(),
      expectedDeliveryDate: inquiry.followUpDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
       items: (inquiry.productsOfInterest || []).map(item => ({
         product: item.product,
         quantity: item.quantity || 1,
         unitPrice: 0, // Will be set when creating actual order
         discount: 0,
         taxRate: 0,
         total: 0
       })),
       notes: inquiry.message,
      orderStatus: 'pending',
      paymentStatus: 'pending',
      fulfillmentStatus: 'unfulfilled',
      source: 'inquiry',
      createdBy: req.user._id
    };

    const order = new Order(orderData);
    await order.save();

    // Notify warehouse of new order from inquiry conversion
    const notificationResult = await notifyWarehouseOfNewOrder(order, 'inquiry');
    if (!notificationResult.success) {
      console.error('Failed to notify warehouse:', notificationResult.error);
    }

    // Link order to inquiry and update status
    inquiry.order = order._id;
    inquiry.status = 'converted_to_order';
    await inquiry.save();

    res.json({
      success: true,
      message: 'Inquiry converted to order successfully',
      data: {
        inquiry,
        order
      }
    });
  } catch (error) {
    console.error('Convert inquiry to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get customer inquiry statistics
// @route   GET /api/customer-inquiries/stats
// @access  Private
const getCustomerInquiryStats = async (req, res) => {
  try {
    const totalInquiries = await CustomerInquiry.countDocuments({ isActive: true });
    const newInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      status: 'new' 
    });
    const underReviewInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      status: 'under_review' 
    });
    const quotedInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      status: 'quoted' 
    });
    const convertedToOrderInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      status: 'converted_to_order' 
    });
    const closedInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      status: 'closed' 
    });

    // Calculate conversion rate
    const conversionRate = totalInquiries > 0 ? (convertedToOrderInquiries / totalInquiries) * 100 : 0;

    // Get overdue inquiries
    const overdueInquiries = await CustomerInquiry.find({
      isActive: true,
      followUpDate: { $lt: new Date() },
      status: { $in: ['new', 'under_review'] }
    }).countDocuments();

    // Get inquiries by priority
    const urgentInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      priority: 'urgent' 
    });
    const highPriorityInquiries = await CustomerInquiry.countDocuments({ 
      isActive: true, 
      priority: 'high' 
    });

    res.json({
      success: true,
      data: {
        total: totalInquiries,
        byStatus: {
          new: newInquiries,
          under_review: underReviewInquiries,
          quoted: quotedInquiries,
          converted_to_order: convertedToOrderInquiries,
          closed: closedInquiries
        },
        conversionRate: Math.round(conversionRate * 100) / 100,
        overdue: overdueInquiries,
        byPriority: {
          urgent: urgentInquiries,
          high: highPriorityInquiries
        }
      }
    });
  } catch (error) {
    console.error('Get customer inquiry stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getCustomerInquiries,
  getCustomerInquiryById,
  createCustomerInquiry,
  updateCustomerInquiry,
  updateCustomerInquiryStatus,
  assignCustomerInquiry,
  convertInquiryToQuotation,
  convertInquiryToOrder,
  getCustomerInquiryStats
};
