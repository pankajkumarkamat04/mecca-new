const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Quotation = require('../models/Quotation');
const Warehouse = require('../models/Warehouse');
const { notifyWarehouseOfNewOrder, notifyWarehouseOfOrderUpdate } = require('../utils/warehouseNotification');

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
    const warehouse = req.query.warehouse || '';

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
    if (warehouse) filter.warehouse = warehouse;

    const orders = await Order.find(filter)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('warehouse', 'name code')
      .populate('assignedBy', 'firstName lastName')
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
      .populate('warehouse', 'name code')
      .populate('assignedBy', 'firstName lastName')
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
    const inventoryStatus = [];
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
        
        // Check inventory availability
        const currentStock = product.inventory?.currentStock || 0;
        const minStock = product.inventory?.minStock || 0;
        const available = Math.max(0, currentStock - minStock);
        
        inventoryStatus.push({
          productId: item.product,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableQuantity: available,
          currentStock: currentStock,
          isAvailable: available >= item.quantity,
          needsReorder: currentStock <= minStock
        });
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

    // Assign order to warehouse based on product availability
    let assignedWarehouse = null;
    if (orderData.items && orderData.items.length > 0) {
      // Find warehouse with most products in stock
      const warehouseCounts = {};
      for (let item of orderData.items) {
        if (item.product) {
          const product = await Product.findById(item.product);
          if (product && product.inventory && product.inventory.warehouse) {
            const warehouseId = product.inventory.warehouse.toString();
            warehouseCounts[warehouseId] = (warehouseCounts[warehouseId] || 0) + 1;
          }
        }
      }
      
      // Assign to warehouse with most products
      if (Object.keys(warehouseCounts).length > 0) {
        const bestWarehouse = Object.keys(warehouseCounts).reduce((a, b) => 
          warehouseCounts[a] > warehouseCounts[b] ? a : b
        );
        assignedWarehouse = bestWarehouse;
        orderData.warehouse = bestWarehouse;
        orderData.assignedAt = new Date();
        orderData.assignedBy = req.user._id;
      }
    }

    const order = new Order(orderData);
    await order.save();

    // Automatically create invoice for the order
    let createdInvoice = null;
    try {
      const invoiceData = {
        customer: orderData.customer,
        customerName: orderData.customerName,
        customerEmail: orderData.customerEmail,
        customerPhone: orderData.customerPhone,
        customerAddress: orderData.customerAddress,
        items: orderData.items.map(item => ({
          product: item.product,
          name: item.name,
          sku: item.sku,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          taxRate: item.taxRate || 0,
          total: item.total || (item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100) * (1 + (item.taxRate || 0) / 100))
        })),
        subtotal: orderData.subtotal,
        totalDiscount: orderData.totalDiscount,
        totalTax: orderData.totalTax,
        total: orderData.total,
        invoiceDate: new Date(),
        dueDate: orderData.expectedDeliveryDate ? new Date(orderData.expectedDeliveryDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        paymentMethod: orderData.paymentMethod,
        shippingMethod: orderData.shippingMethod,
        notes: orderData.notes,
        internalNotes: orderData.internalNotes,
        order: order._id,
        type: 'sale',
        status: 'pending',
        createdBy: req.user._id
      };

      const invoice = new Invoice(invoiceData);
      await invoice.save();
      createdInvoice = invoice;

      // Update order with invoice reference
      order.invoice = invoice._id;
      await order.save();

      console.log(`Invoice ${invoice.invoiceNumber} created automatically for order ${order.orderNumber}`);
    } catch (invoiceError) {
      console.error('Failed to create automatic invoice:', invoiceError);
      // Don't fail the order creation if invoice creation fails
    }

    // Notify warehouse of new order
    const notificationResult = await notifyWarehouseOfNewOrder(order, orderData.source || 'direct');
    if (!notificationResult.success) {
      console.error('Failed to notify warehouse:', notificationResult.error);
    }

    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('warehouse', 'name code')
      .populate('assignedBy', 'firstName lastName')
      .populate('items.product', 'name sku description')
      .populate('invoice', 'invoiceNumber status total');

    res.status(201).json({
      success: true,
      data: populatedOrder,
      inventoryStatus: inventoryStatus,
      invoice: createdInvoice
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

    // Notify warehouse of order status update
    const notificationResult = await notifyWarehouseOfOrderUpdate(order, 'status');
    if (!notificationResult.success) {
      console.error('Failed to notify warehouse of status update:', notificationResult.error);
    }

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

// @desc    Assign order to warehouse
// @route   PUT /api/orders/:id/assign
// @access  Private
const assignOrder = async (req, res) => {
  try {
    const { assignedTo, warehouse } = req.body;
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // If warehouse is provided, assign to warehouse
    if (warehouse) {
      order.warehouse = warehouse;
      order.assignedAt = new Date();
      order.assignedBy = req.user._id;
    } else if (assignedTo) {
      // Legacy support for user assignment
      order.assignedTo = assignedTo;
    }
    
    await order.save();

    const updatedOrder = await Order.findById(order._id)
      .populate('assignedTo', 'firstName lastName')
      .populate('warehouse', 'name code')
      .populate('assignedBy', 'firstName lastName');

    res.json({
      success: true,
      message: warehouse ? 'Order assigned to warehouse successfully' : 'Order assigned successfully',
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

// @desc    Generate picking list for order
// @route   POST /api/orders/:id/generate-picking-list
// @access  Private
const generatePickingList = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('items.product', 'name sku inventory warehouseLocation');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    if (!['confirmed', 'processing'].includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed or processing orders can generate picking lists'
      });
    }

    const pickingList = {
      orderId: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      generatedDate: new Date(),
      items: [],
      totalItems: 0,
      estimatedPickTime: 0,
      priority: order.priority || 'normal'
    };

    for (let item of order.items) {
      if (item.product) {
        const product = item.product;
        const location = product.inventory?.warehouseLocation;
        
        pickingList.items.push({
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          quantity: item.quantity,
          location: location ? {
            zone: location.zone || 'N/A',
            aisle: location.aisle || 'N/A',
            shelf: location.shelf || 'N/A',
            bin: location.bin || 'N/A',
            locationCode: location.locationCode || 'N/A'
          } : null,
          priority: product.inventory?.currentStock <= product.inventory?.minStock ? 'high' : 'normal',
          currentStock: product.inventory?.currentStock || 0,
          unitPrice: item.unitPrice
        });

        pickingList.totalItems += item.quantity;
        pickingList.estimatedPickTime += item.quantity * 0.5; // 30 seconds per item
      }
    }

    // Sort by location for efficient picking
    pickingList.items.sort((a, b) => {
      if (a.location && b.location) {
        if (a.location.zone !== b.location.zone) {
          return a.location.zone.localeCompare(b.location.zone);
        }
        if (a.location.aisle !== b.location.aisle) {
          return a.location.aisle.localeCompare(b.location.aisle);
        }
        return a.location.shelf.localeCompare(b.location.shelf);
      }
      return 0;
    });

    res.json({
      success: true,
      data: pickingList
    });
  } catch (error) {
    console.error('Generate picking list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check inventory availability for order items
// @route   POST /api/orders/check-inventory
// @access  Private
const checkInventoryAvailability = async (req, res) => {
  try {
    const { items } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({
        success: false,
        message: 'Items array is required'
      });
    }

    const inventoryStatus = [];
    const unavailableItems = [];
    const lowStockItems = [];

    for (let item of items) {
      if (item.product && item.quantity) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(404).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        const currentStock = product.inventory?.currentStock || 0;
        const minStock = product.inventory?.minStock || 0;
        const maxStock = product.inventory?.maxStock || 0;
        const reorderPoint = product.inventory?.reorderPoint || 0;
        const available = Math.max(0, currentStock - minStock);
        
        const itemStatus = {
          productId: item.product,
          productName: product.name,
          sku: product.sku,
          requestedQuantity: item.quantity,
          availableQuantity: available,
          currentStock: currentStock,
          minStock: minStock,
          maxStock: maxStock,
          reorderPoint: reorderPoint,
          isAvailable: available >= item.quantity,
          needsReorder: currentStock <= reorderPoint,
          isLowStock: currentStock <= minStock,
          stockValue: currentStock * (product.pricing?.costPrice || 0)
        };

        inventoryStatus.push(itemStatus);

        if (!itemStatus.isAvailable) {
          unavailableItems.push(itemStatus);
        }

        if (itemStatus.isLowStock) {
          lowStockItems.push(itemStatus);
        }
      }
    }

    // Calculate summary
    const summary = {
      totalItems: items.length,
      availableItems: inventoryStatus.filter(item => item.isAvailable).length,
      unavailableItems: unavailableItems.length,
      lowStockItems: lowStockItems.length,
      totalStockValue: inventoryStatus.reduce((sum, item) => sum + item.stockValue, 0),
      canFulfillOrder: unavailableItems.length === 0
    };

    res.json({
      success: true,
      data: {
        inventoryStatus,
        summary,
        unavailableItems,
        lowStockItems
      }
    });
  } catch (error) {
    console.error('Check inventory availability error:', error);
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
  getOrdersByCustomer,
  generatePickingList,
  checkInventoryAvailability
};
