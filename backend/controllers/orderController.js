const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Quotation = require('../models/Quotation');

// @desc    Get all orders
// @route   GET /api/orders
// @access  Private
const getOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const paymentStatus = req.query.paymentStatus || '';
    const fulfillmentStatus = req.query.fulfillmentStatus || '';
    const customerId = req.query.customerId || '';
    const source = req.query.source || '';
    const priority = req.query.priority || '';
    const assignedTo = req.query.assignedTo || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerEmail: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.orderStatus = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus;
    if (customerId) filter.customer = customerId;
    if (source) filter.source = source;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const orders = await Order.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('quotation', 'quotationNumber')
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments(filter);

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('quotation', 'quotationNumber')
      .populate('invoice', 'invoiceNumber')
      .populate('items.product', 'name sku description pricing inventory');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const orderData = req.body;
    orderData.createdBy = req.user._id;

    // Generate order number
    orderData.orderNumber = await Order.generateOrderNumber();

    // Validate customer exists
    if (orderData.customer) {
      const customer = await Customer.findById(orderData.customer);
      if (!customer) {
        return res.status(404).json({
          success: false,
          message: 'Customer not found'
        });
      }
      orderData.customerName = `${customer.firstName} ${customer.lastName}`;
      orderData.customerEmail = customer.email;
      orderData.customerPhone = customer.phone;
      orderData.customerAddress = customer.address;
    }

    // Validate products exist and populate item details
    for (let item of orderData.items) {
      if (item.product) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }
        item.name = product.name;
        item.sku = product.sku;
        item.description = product.description;
        if (!item.unitPrice) {
          item.unitPrice = product.pricing.salePrice;
        }
      }
    }

    // If order is from quotation, link it
    if (orderData.quotation) {
      const quotation = await Quotation.findById(orderData.quotation);
      if (quotation) {
        quotation.status = 'converted';
        quotation.convertedAt = new Date();
        await quotation.save();
      }
    }

    const order = new Order(orderData);
    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name sku description');

    res.status(201).json({
      success: true,
      data: populatedOrder
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update order
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Don't allow updates to certain statuses
    if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update order in current status'
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
          item.sku = product.sku;
          item.description = product.description;
        }
      }
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('items.product', 'name sku description');

    res.json({
      success: true,
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete order
// @route   DELETE /api/orders/:id
// @access  Private
const deleteOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Don't allow deletion of certain statuses
    if (['shipped', 'delivered'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete order in current status'
      });
    }

    order.isActive = false;
    await order.save();

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private
const updateOrderStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    await order.updateStatus(status, notes);

    const updatedOrder = await Order.findById(order._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName');

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/orders/:id/payment
// @access  Private
const updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentMethod, paymentDetails } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.paymentStatus = paymentStatus;
    if (paymentMethod) order.paymentMethod = paymentMethod;
    if (paymentDetails) order.paymentDetails = { ...order.paymentDetails, ...paymentDetails };

    await order.save();

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: order
    });
  } catch (error) {
    console.error('Update payment status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign order to user
// @route   PUT /api/orders/:id/assign
// @access  Private
const assignOrder = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.assignedTo = assignedTo;
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('assignedTo', 'firstName lastName');

    res.json({
      success: true,
      message: 'Order assigned successfully',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Assign order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Convert order to invoice
// @route   POST /api/orders/:id/convert-to-invoice
// @access  Private
const convertToInvoice = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'firstName lastName email phone address');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (order.invoice) {
      return res.status(400).json({
        success: false,
        message: 'Order already has an invoice'
      });
    }

    // Create invoice from order
    const invoiceData = {
      customer: order.customer._id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      customerAddress: order.customerAddress,
      invoiceDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      items: order.items.map(item => ({
        product: item.product,
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        taxRate: item.taxRate,
        total: item.total
      })),
      subtotal: order.subtotal,
      totalDiscount: order.totalDiscount,
      totalTax: order.totalTax,
      totalAmount: order.totalAmount,
      notes: order.notes,
      status: 'draft',
      createdBy: req.user._id
    };

    const invoice = new Invoice(invoiceData);
    await invoice.save();

    // Link invoice to order
    order.invoice = invoice._id;
    await order.save();

    res.json({
      success: true,
      message: 'Order converted to invoice successfully',
      data: {
        order,
        invoice
      }
    });
  } catch (error) {
    console.error('Convert order to invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get order statistics
// @route   GET /api/orders/stats
// @access  Private
const getOrderStats = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments({ isActive: true });
    const pendingOrders = await Order.countDocuments({ 
      isActive: true, 
      orderStatus: 'pending' 
    });
    const processingOrders = await Order.countDocuments({ 
      isActive: true, 
      orderStatus: 'processing' 
    });
    const shippedOrders = await Order.countDocuments({ 
      isActive: true, 
      orderStatus: 'shipped' 
    });
    const deliveredOrders = await Order.countDocuments({ 
      isActive: true, 
      orderStatus: 'delivered' 
    });
    const cancelledOrders = await Order.countDocuments({ 
      isActive: true, 
      orderStatus: 'cancelled' 
    });

    // Payment status stats
    const pendingPayment = await Order.countDocuments({ 
      isActive: true, 
      paymentStatus: 'pending' 
    });
    const paidOrders = await Order.countDocuments({ 
      isActive: true, 
      paymentStatus: 'paid' 
    });

    // Fulfillment status stats
    const unfulfilledOrders = await Order.countDocuments({ 
      isActive: true, 
      fulfillmentStatus: 'unfulfilled' 
    });
    const fulfilledOrders = await Order.countDocuments({ 
      isActive: true, 
      fulfillmentStatus: 'fulfilled' 
    });

    // Get total value of orders
    const totalValue = await Order.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    // Get overdue orders
    const overdueOrders = await Order.find({
      isActive: true,
      expectedDeliveryDate: { $lt: new Date() },
      orderStatus: { $nin: ['delivered', 'cancelled'] }
    }).countDocuments();

    res.json({
      success: true,
      data: {
        total: totalOrders,
        byStatus: {
          pending: pendingOrders,
          processing: processingOrders,
          shipped: shippedOrders,
          delivered: deliveredOrders,
          cancelled: cancelledOrders
        },
        byPaymentStatus: {
          pending: pendingPayment,
          paid: paidOrders
        },
        byFulfillmentStatus: {
          unfulfilled: unfulfilledOrders,
          fulfilled: fulfilledOrders
        },
        totalValue: totalValue[0]?.total || 0,
        overdue: overdueOrders
      }
    });
  } catch (error) {
    console.error('Get order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get orders by customer
// @route   GET /api/orders/customer/:customerId
// @access  Private
const getOrdersByCustomer = async (req, res) => {
  try {
    const { customerId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const orders = await Order.find({ 
      customer: customerId, 
      isActive: true 
    })
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('invoice', 'invoiceNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Order.countDocuments({ 
      customer: customerId, 
      isActive: true 
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders by customer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
  updateOrderStatus,
  updatePaymentStatus,
  assignOrder,
  convertToInvoice,
  getOrderStats,
  getOrdersByCustomer
};
