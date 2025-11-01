const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const ReceivedGoods = require('../models/ReceivedGoods');

// Email function for purchase orders
const sendPurchaseOrderEmail = async (purchaseOrder) => {
  // This would integrate with an email service like SendGrid, Nodemailer, etc.
  // For now, we'll just log the email content
  console.log('Sending purchase order email to supplier:', {
    to: purchaseOrder.supplier.email,
    subject: `Purchase Order ${purchaseOrder.orderNumber}`,
    orderNumber: purchaseOrder.orderNumber,
    total: purchaseOrder.total,
    items: purchaseOrder.items.length
  });
  
  // In a real implementation, you would:
  // 1. Generate an HTML email template
  // 2. Send via email service
  // 3. Handle delivery status
};

// @desc    Get all purchase orders
// @route   GET /api/purchase-orders
// @access  Private
const getPurchaseOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const supplier = req.query.supplier || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { reference: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;
    
    if (startDate || endDate) {
      filter.orderDate = {};
      if (startDate) filter.orderDate.$gte = new Date(startDate);
      if (endDate) filter.orderDate.$lte = new Date(endDate);
    }

    const purchaseOrders = await PurchaseOrder.find(filter)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('receivedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await PurchaseOrder.countDocuments(filter);

    res.json({
      success: true,
      data: purchaseOrders,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get purchase orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get purchase order by ID
// @route   GET /api/purchase-orders/:id
// @access  Private
const getPurchaseOrderById = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone address')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku description')
      .populate('createdBy', 'firstName lastName')
      .populate('assignedTo', 'firstName lastName')
      .populate('receivedBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    res.json({
      success: true,
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Get purchase order by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create purchase order
// @route   POST /api/purchase-orders
// @access  Private
const createPurchaseOrder = async (req, res) => {
  try {
    const orderData = req.body;
    orderData.createdBy = req.user._id;

    // Generate order number
    orderData.orderNumber = await PurchaseOrder.generateOrderNumber();

    // Validate supplier exists
    const supplier = await Supplier.findById(orderData.supplier);
    if (!supplier) {
      return res.status(404).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Add supplier details
    orderData.supplierName = supplier.name;
    orderData.supplierEmail = supplier.email;
    orderData.supplierPhone = supplier.phone;
    orderData.supplierAddress = supplier.address;

    // Validate products exist
    for (const item of orderData.items) {
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

    // Ensure required computed fields are present for validation
    const parsedQuantity = Number(item.quantity) || 0;
    const parsedUnitCost = Number(item.unitCost) || 0;
    item.quantity = parsedQuantity;
    item.unitCost = parsedUnitCost;
    item.totalCost = parsedQuantity * parsedUnitCost;
    if (item.receivedQuantity == null) item.receivedQuantity = 0;
    // pendingQuantity will be recalculated in pre-save, but set a safe initial value
    item.pendingQuantity = Math.max(0, parsedQuantity - (item.receivedQuantity || 0));
    }

    const purchaseOrder = new PurchaseOrder(orderData);
    await purchaseOrder.save();

    // Update supplier purchase statistics
    const totalAmount = purchaseOrder.items.reduce((sum, item) => sum + item.totalCost, 0);
    await supplier.updatePurchaseStats(totalAmount);

    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku description')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Purchase order created successfully',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update purchase order
// @route   PUT /api/purchase-orders/:id
// @access  Private
const updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Don't allow updates to completed or cancelled orders
    if (['completed', 'cancelled'].includes(purchaseOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot update completed or cancelled purchase orders'
      });
    }

    Object.assign(purchaseOrder, req.body);
    purchaseOrder.lastUpdatedBy = req.user._id;
    await purchaseOrder.save();

    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku description')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Purchase order updated successfully',
      data: populatedOrder
    });
  } catch (error) {
    console.error('Update purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete purchase order
// @route   DELETE /api/purchase-orders/:id
// @access  Private
const deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Don't allow deletion of orders with received items
    const hasReceivedItems = purchaseOrder.items.some(item => item.receivedQuantity > 0);
    if (hasReceivedItems) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete purchase order with received items'
      });
    }

    await PurchaseOrder.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Purchase order deleted successfully'
    });
  } catch (error) {
    console.error('Delete purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Send purchase order to supplier
// @route   POST /api/purchase-orders/:id/send
// @access  Private
const sendPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (purchaseOrder.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Only draft purchase orders can be sent'
      });
    }

    purchaseOrder.status = 'sent';
    purchaseOrder.lastUpdatedBy = req.user._id;
    await purchaseOrder.save();

    // Send email to supplier
    try {
      await sendPurchaseOrderEmail(purchaseOrder);
    } catch (error) {
      console.error('Error sending purchase order email:', error);
      // Don't fail the request if email fails
    }

    res.json({
      success: true,
      message: 'Purchase order sent to supplier successfully',
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Send purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Confirm purchase order
// @route   POST /api/purchase-orders/:id/confirm
// @access  Private
const confirmPurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (purchaseOrder.status !== 'sent') {
      return res.status(400).json({
        success: false,
        message: 'Only sent purchase orders can be confirmed'
      });
    }

    purchaseOrder.status = 'confirmed';
    purchaseOrder.lastUpdatedBy = req.user._id;
    await purchaseOrder.save();

    res.json({
      success: true,
      message: 'Purchase order confirmed successfully',
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Confirm purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Receive purchase order items
// @route   POST /api/purchase-orders/:id/receive
// @access  Private
const receivePurchaseOrder = async (req, res) => {
  try {
    const { receivedItems, deliveryInfo, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (!['confirmed', 'partial'].includes(purchaseOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only confirmed or partial purchase orders can be received'
      });
    }

    // Process received items
    const processedItems = [];
    for (const receivedItem of receivedItems) {
      const orderItem = purchaseOrder.items.id(receivedItem.itemId);
      if (!orderItem) continue;

      const product = await Product.findById(orderItem.product);
      if (!product) continue;

      // Validate received quantity - ensure we're working with numbers
      const alreadyReceived = Number(orderItem.receivedQuantity) || 0;
      const orderedQty = Number(orderItem.quantity);
      const newReceivedQty = Number(receivedItem.quantity);
      
      if (isNaN(orderedQty) || isNaN(newReceivedQty) || newReceivedQty <= 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity for ${product.name}`
        });
      }
      
      const remainingQuantity = orderedQty - alreadyReceived;
      
      // Check if trying to receive more than remaining
      if (newReceivedQty > remainingQuantity) {
        return res.status(400).json({
          success: false,
          message: `Received quantity exceeds ordered quantity for ${product.name}. Remaining: ${remainingQuantity}, Ordered: ${orderedQty}, Already Received: ${alreadyReceived}`
        });
      }
      
      // Double check total doesn't exceed ordered (safety check with proper number comparison)
      const totalReceived = alreadyReceived + newReceivedQty;
      if (totalReceived > orderedQty) {
        return res.status(400).json({
          success: false,
          message: `Received quantity exceeds ordered quantity for ${product.name}`
        });
      }

      processedItems.push({
        purchaseOrderItem: orderItem._id,
        product: product._id,
        productName: product.name,
        productSku: product.sku,
        orderedQuantity: orderItem.quantity,
        receivedQuantity: receivedItem.quantity,
        unitCost: orderItem.unitCost,
        totalCost: receivedItem.quantity * orderItem.unitCost,
        batchNumber: receivedItem.batchNumber,
        expiryDate: receivedItem.expiryDate,
        serialNumbers: receivedItem.serialNumbers,
        condition: receivedItem.condition || 'good',
        qualityNotes: receivedItem.qualityNotes,
        supplier: purchaseOrder.supplier._id,
        supplierName: purchaseOrder.supplier.name
      });
    }

    // Generate receipt number
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const receiptNumber = `RG-${year}${month}${day}-${random}`;

    // Create received goods record
    const receivedGoods = new ReceivedGoods({
      receiptNumber,
      purchaseOrder: purchaseOrder._id,
      purchaseOrderNumber: purchaseOrder.orderNumber,
      supplier: purchaseOrder.supplier._id,
      supplierName: purchaseOrder.supplier.name,
      warehouse: purchaseOrder.warehouse,
      warehouseName: purchaseOrder.warehouse?.name,
      receivedDate: new Date(),
      deliveryDate: deliveryInfo?.deliveryDate,
      deliveryMethod: deliveryInfo?.deliveryMethod || 'delivery',
      carrier: deliveryInfo?.carrier,
      trackingNumber: deliveryInfo?.trackingNumber,
      items: processedItems,
      notes,
      receivedBy: req.user._id,
        createdBy: req.user._id
      });

    try {
      await receivedGoods.save();
    } catch (saveError) {
      console.error('ReceivedGoods save error:', saveError);
      if (saveError.code === 11000) {
        
        
        // Check if it's the receiptNumber duplicate
        if (saveError.keyPattern && saveError.keyPattern.receiptNumber) {
          return res.status(400).json({
            success: false,
            message: `Receipt number ${receiptNumber} already exists. Please try again.`
          });
        }
        
        // Check if it's the old receivedNumber field
        if (saveError.keyPattern && saveError.keyPattern.receivedNumber) {
          return res.status(400).json({
            success: false,
            message: 'Database index conflict detected. Please contact administrator.'
          });
        }
      }
      throw saveError; // Re-throw if not handled
    }

    // Update purchase order items (but don't update inventory yet)
    for (const receivedItem of receivedItems) {
      const orderItem = purchaseOrder.items.id(receivedItem.itemId);
      if (orderItem) {
        orderItem.receivedQuantity += receivedItem.quantity;
        orderItem.pendingQuantity = orderItem.quantity - orderItem.receivedQuantity;
        if (receivedItem.batchNumber) orderItem.batchNumber = receivedItem.batchNumber;
        if (receivedItem.expiryDate) orderItem.expiryDate = receivedItem.expiryDate;
        if (receivedItem.serialNumbers) orderItem.serialNumbers = receivedItem.serialNumbers;
      }
    }

    // Update purchase order status
    const allItemsReceived = purchaseOrder.items.every(item => item.receivedQuantity >= item.quantity);
    const someItemsReceived = purchaseOrder.items.some(item => item.receivedQuantity > 0);

    if (allItemsReceived) {
      purchaseOrder.status = 'completed';
    } else if (someItemsReceived) {
      purchaseOrder.status = 'partial';
    }

    purchaseOrder.receivedBy = req.user._id;
    purchaseOrder.receivedAt = new Date();
    purchaseOrder.lastUpdatedBy = req.user._id;

    await purchaseOrder.save();

    // Populate the response
    const populatedReceivedGoods = await ReceivedGoods.findById(receivedGoods._id)
      .populate('purchaseOrder', 'orderNumber status')
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('receivedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName');

    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku description')
      .populate('receivedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Purchase order items received and sent to Received Goods for inspection',
      data: {
        purchaseOrder: populatedOrder,
        receivedGoods: populatedReceivedGoods
      }
    });
  } catch (error) {
    console.error('Receive purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Cancel purchase order
// @route   POST /api/purchase-orders/:id/cancel
// @access  Private
const cancelPurchaseOrder = async (req, res) => {
  try {
    const { reason } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    if (['completed', 'cancelled'].includes(purchaseOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order is already completed or cancelled'
      });
    }

    await purchaseOrder.cancel(reason, req.user._id);

    res.json({
      success: true,
      message: 'Purchase order cancelled successfully',
      data: purchaseOrder
    });
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get purchase order statistics
// @route   GET /api/purchase-orders/stats
// @access  Private
const getPurchaseOrderStats = async (req, res) => {
  try {
    const stats = await PurchaseOrder.getStatistics();

    // Get overdue orders
    const overdueOrders = await PurchaseOrder.countDocuments({
      status: { $in: ['sent', 'confirmed', 'partial'] },
      expectedDeliveryDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        ...stats,
        overdueOrders
      }
    });
  } catch (error) {
    console.error('Get purchase order stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  sendPurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
  getPurchaseOrderStats
};
