const Delivery = require('../models/Delivery');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const Product = require('../models/Product');

// @desc    Get all deliveries
// @route   GET /api/deliveries
// @access  Private
const getDeliveries = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const priority = req.query.priority || '';
    const assignedDriver = req.query.assignedDriver || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { deliveryNumber: { $regex: search, $options: 'i' } },
        { orderNumber: { $regex: search, $options: 'i' } },
        { customerName: { $regex: search, $options: 'i' } },
        { customerPhone: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedDriver) filter.assignedDriver = assignedDriver;

    const deliveries = await Delivery.find(filter)
      .populate('order', 'orderNumber orderStatus')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Delivery.countDocuments(filter);

    res.json({
      success: true,
      data: deliveries,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get delivery by ID
// @route   GET /api/deliveries/:id
// @access  Private
const getDeliveryById = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('order', 'orderNumber orderStatus totalAmount')
      .populate('customer', 'firstName lastName email phone address')
      .populate('assignedDriver', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('items.product', 'name sku description pricing');

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    res.json({
      success: true,
      data: delivery
    });
  } catch (error) {
    console.error('Get delivery by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new delivery
// @route   POST /api/deliveries
// @access  Private
const createDelivery = async (req, res) => {
  try {
    const deliveryData = req.body;
    deliveryData.createdBy = req.user._id;

    // Generate delivery number
    deliveryData.deliveryNumber = await Delivery.generateDeliveryNumber();

    // Validate order exists
    const order = await Order.findById(deliveryData.order);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Populate delivery data from order
    deliveryData.orderNumber = order.orderNumber;
    deliveryData.customer = order.customer;
    deliveryData.customerName = order.customerName;
    deliveryData.customerPhone = order.customerPhone;
    deliveryData.customerEmail = order.customerEmail;
    deliveryData.items = order.items.map(item => ({
      product: item.product,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: item.total
    }));
    deliveryData.totalAmount = order.totalAmount;

    // Set default delivery address from order if not provided
    if (!deliveryData.deliveryAddress && order.shippingAddress) {
      deliveryData.deliveryAddress = order.shippingAddress;
    }

    const delivery = new Delivery(deliveryData);
    await delivery.save();

    // Update order status
    if (order.orderStatus === 'confirmed' || order.orderStatus === 'processing') {
      order.orderStatus = 'processing';
      await order.save();
    }

    const populatedDelivery = await Delivery.findById(delivery._id)
      .populate('order', 'orderNumber orderStatus')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName');

    res.status(201).json({
      success: true,
      data: populatedDelivery
    });
  } catch (error) {
    console.error('Create delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update delivery
// @route   PUT /api/deliveries/:id
// @access  Private
const updateDelivery = async (req, res) => {
  try {
    const delivery = await Delivery.findById(req.params.id);
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    if (!delivery.canBeUpdated()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update delivery in current status'
      });
    }

    const updateData = req.body;
    const updatedDelivery = await Delivery.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('order', 'orderNumber orderStatus')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName');

    res.json({
      success: true,
      data: updatedDelivery
    });
  } catch (error) {
    console.error('Update delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update delivery status
// @route   PUT /api/deliveries/:id/status
// @access  Private
const updateDeliveryStatus = async (req, res) => {
  try {
    const { status, notes, location, deliveryPerson } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    await delivery.updateStatus(status, notes, location, deliveryPerson);

    // Update related order status
    if (status === 'delivered') {
      const order = await Order.findById(delivery.order);
      if (order) {
        order.orderStatus = 'delivered';
        order.fulfillmentStatus = 'delivered';
        order.actualDeliveryDate = new Date();
        await order.save();
      }
    }

    const updatedDelivery = await Delivery.findById(delivery._id)
      .populate('order', 'orderNumber orderStatus')
      .populate('customer', 'firstName lastName email phone')
      .populate('assignedDriver', 'firstName lastName');

    res.json({
      success: true,
      message: 'Delivery status updated successfully',
      data: updatedDelivery
    });
  } catch (error) {
    console.error('Update delivery status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Assign delivery to driver
// @route   PUT /api/deliveries/:id/assign
// @access  Private
const assignDelivery = async (req, res) => {
  try {
    const { assignedDriver, driverDetails } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    delivery.assignedDriver = assignedDriver;
    if (driverDetails) {
      delivery.driverDetails = { ...delivery.driverDetails, ...driverDetails };
    }
    await delivery.save();

    const updatedDelivery = await Delivery.findById(delivery._id)
      .populate('assignedDriver', 'firstName lastName');

    res.json({
      success: true,
      message: 'Delivery assigned successfully',
      data: updatedDelivery
    });
  } catch (error) {
    console.error('Assign delivery error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark delivery as delivered
// @route   POST /api/deliveries/:id/deliver
// @access  Private
const markAsDelivered = async (req, res) => {
  try {
    const { deliveryProof, notes } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    if (delivery.status === 'delivered') {
      return res.status(400).json({
        success: false,
        message: 'Delivery already marked as delivered'
      });
    }

    // Update delivery status
    await delivery.updateStatus('delivered', notes);

    // Add delivery proof
    if (deliveryProof) {
      delivery.deliveryProof = { ...delivery.deliveryProof, ...deliveryProof };
      await delivery.save();
    }

    // Update order status
    const order = await Order.findById(delivery.order);
    if (order) {
      order.orderStatus = 'delivered';
      order.fulfillmentStatus = 'delivered';
      order.actualDeliveryDate = new Date();
      await order.save();
    }

    const updatedDelivery = await Delivery.findById(delivery._id)
      .populate('order', 'orderNumber orderStatus')
      .populate('customer', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Delivery marked as delivered successfully',
      data: updatedDelivery
    });
  } catch (error) {
    console.error('Mark as delivered error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark delivery as failed
// @route   POST /api/deliveries/:id/fail
// @access  Private
const markAsFailed = async (req, res) => {
  try {
    const { failureReason } = req.body;
    const delivery = await Delivery.findById(req.params.id);
    
    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: 'Delivery not found'
      });
    }

    await delivery.updateStatus('failed', failureReason.description);

    // Add failure reason
    if (failureReason) {
      delivery.failureReason = failureReason;
      await delivery.save();
    }

    const updatedDelivery = await Delivery.findById(delivery._id)
      .populate('order', 'orderNumber orderStatus')
      .populate('customer', 'firstName lastName email phone');

    res.json({
      success: true,
      message: 'Delivery marked as failed successfully',
      data: updatedDelivery
    });
  } catch (error) {
    console.error('Mark as failed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get delivery statistics
// @route   GET /api/deliveries/stats
// @access  Private
const getDeliveryStats = async (req, res) => {
  try {
    const totalDeliveries = await Delivery.countDocuments({ isActive: true });
    const preparingDeliveries = await Delivery.countDocuments({ 
      isActive: true, 
      status: 'preparing' 
    });
    const readyForDelivery = await Delivery.countDocuments({ 
      isActive: true, 
      status: 'ready_for_delivery' 
    });
    const outForDelivery = await Delivery.countDocuments({ 
      isActive: true, 
      status: 'out_for_delivery' 
    });
    const inTransit = await Delivery.countDocuments({ 
      isActive: true, 
      status: 'in_transit' 
    });
    const delivered = await Delivery.countDocuments({ 
      isActive: true, 
      status: 'delivered' 
    });
    const failedDeliveries = await Delivery.countDocuments({ 
      isActive: true, 
      status: 'failed' 
    });

    // Get overdue deliveries
    const overdueDeliveries = await Delivery.find({
      isActive: true,
      scheduledDate: { $lt: new Date() },
      status: { $nin: ['delivered', 'failed', 'returned'] }
    }).countDocuments();

    // Calculate delivery success rate
    const successRate = totalDeliveries > 0 ? (delivered / totalDeliveries) * 100 : 0;

    // Get average delivery time
    const avgDeliveryTime = await Delivery.aggregate([
      { $match: { isActive: true, status: 'delivered', actualDuration: { $exists: true } } },
      { $group: { _id: null, avgDuration: { $avg: '$actualDuration' } } }
    ]);

    res.json({
      success: true,
      data: {
        total: totalDeliveries,
        byStatus: {
          preparing: preparingDeliveries,
          ready_for_delivery: readyForDelivery,
          out_for_delivery: outForDelivery,
          in_transit: inTransit,
          delivered: delivered,
          failed: failedDeliveries
        },
        overdue: overdueDeliveries,
        successRate: Math.round(successRate * 100) / 100,
        averageDeliveryTime: Math.round(avgDeliveryTime[0]?.avgDuration || 0)
      }
    });
  } catch (error) {
    console.error('Get delivery stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getDeliveries,
  getDeliveryById,
  createDelivery,
  updateDelivery,
  updateDeliveryStatus,
  assignDelivery,
  markAsDelivered,
  markAsFailed,
  getDeliveryStats
};
