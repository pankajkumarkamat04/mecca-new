const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');
const StockAlert = require('../models/StockAlert');

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
    }

    const purchaseOrder = new PurchaseOrder(orderData);
    await purchaseOrder.save();

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

    // TODO: Send email to supplier
    // await sendPurchaseOrderEmail(purchaseOrder);

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
    const { receivedItems, notes } = req.body;

    const purchaseOrder = await PurchaseOrder.findById(req.params.id);

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

    const stockMovements = [];

    for (const receivedItem of receivedItems) {
      const orderItem = purchaseOrder.items.id(receivedItem.itemId);
      if (!orderItem) continue;

      const product = await Product.findById(orderItem.product);
      if (!product) continue;

      // Validate received quantity doesn't exceed ordered quantity
      const totalReceived = orderItem.receivedQuantity + receivedItem.quantity;
      if (totalReceived > orderItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Received quantity exceeds ordered quantity for ${product.name}`
        });
      }

      // Create stock movement
      const stockMovement = new StockMovement({
        product: product._id,
        warehouse: purchaseOrder.warehouse,
        warehouseName: purchaseOrder.warehouse?.name,
        movementType: 'receiving',
        quantity: receivedItem.quantity,
        unitCost: orderItem.unitCost,
        totalCost: receivedItem.quantity * orderItem.unitCost,
        previousStock: product.inventory.currentStock,
        newStock: product.inventory.currentStock + receivedItem.quantity,
        reference: purchaseOrder.orderNumber,
        referenceType: 'purchase_order',
        referenceId: purchaseOrder._id,
        reason: 'Purchase order receiving',
        notes: notes,
        batchNumber: receivedItem.batchNumber,
        expiryDate: receivedItem.expiryDate,
        serialNumbers: receivedItem.serialNumbers,
        createdBy: req.user._id
      });

      await stockMovement.save();

      // Update product stock
      product.inventory.currentStock += receivedItem.quantity;
      product.inventory.lastMovement = new Date();
      if (purchaseOrder.warehouse) {
        product.inventory.warehouse = purchaseOrder.warehouse;
      }
      await product.save();

      stockMovements.push(stockMovement._id);
    }

    // Mark items as received
    await purchaseOrder.markAsReceived(receivedItems, req.user._id);

    // Check for low stock alerts
    for (const receivedItem of receivedItems) {
      const orderItem = purchaseOrder.items.id(receivedItem.itemId);
      if (orderItem) {
        const product = await Product.findById(orderItem.product);
        if (product && product.inventory.alertOnLowStock) {
          // Check if still low stock after receiving
          if (product.inventory.currentStock <= product.inventory.minStock) {
            await StockAlert.createLowStockAlert(product, purchaseOrder.warehouse);
          }
        }
      }
    }

    const populatedOrder = await PurchaseOrder.findById(purchaseOrder._id)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku description')
      .populate('receivedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Purchase order items received successfully',
      data: {
        purchaseOrder: populatedOrder,
        stockMovements
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
