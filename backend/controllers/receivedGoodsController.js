const ReceivedGoods = require('../models/ReceivedGoods');
const PurchaseOrder = require('../models/PurchaseOrder');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const StockMovement = require('../models/StockMovement');

// @desc    Get all received goods
// @route   GET /api/received-goods
// @access  Private
const getReceivedGoods = async (req, res) => {
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
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { purchaseOrderNumber: { $regex: search, $options: 'i' } },
        { supplierName: { $regex: search, $options: 'i' } },
        { trackingNumber: { $regex: search, $options: 'i' } }
      ];
    }
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;
    
    if (startDate || endDate) {
      filter.receivedDate = {};
      if (startDate) filter.receivedDate.$gte = new Date(startDate);
      if (endDate) filter.receivedDate.$lte = new Date(endDate);
    }

    const receivedGoods = await ReceivedGoods.find(filter)
      .populate('purchaseOrder', 'orderNumber status')
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('receivedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
        .sort({ receivedDate: -1 })
        .skip(skip)
      .limit(limit);

    const total = await ReceivedGoods.countDocuments(filter);

    res.json({
      success: true,
      data: receivedGoods,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get received goods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get received goods by ID
// @route   GET /api/received-goods/:id
// @access  Private
const getReceivedGoodsById = async (req, res) => {
  try {
    const receivedGoods = await ReceivedGoods.findById(req.params.id)
      .populate('purchaseOrder', 'orderNumber status items')
      .populate('supplier', 'name email phone address')
      .populate('warehouse', 'name code')
      .populate('items.product', 'name sku description')
      .populate('receivedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('qualityControl.inspectedBy', 'firstName lastName');

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    res.json({
      success: true,
      data: receivedGoods
    });
  } catch (error) {
    console.error('Get received goods by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create received goods from purchase order
// @route   POST /api/received-goods
// @access  Private
const createReceivedGoods = async (req, res) => {
  try {
    const { purchaseOrderId, receivedItems, deliveryInfo, notes } = req.body;

    // Find the purchase order
    const purchaseOrder = await PurchaseOrder.findById(purchaseOrderId)
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code');

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: 'Purchase order not found'
      });
    }

    // Validate that PO is in correct status
    if (!['confirmed', 'partial'].includes(purchaseOrder.status)) {
      return res.status(400).json({
        success: false,
        message: 'Purchase order must be confirmed or partial to receive goods'
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

    // Create received goods record
    const receivedGoods = new ReceivedGoods({
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

    await receivedGoods.save();

    // Update purchase order items
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

    res.status(201).json({
      success: true,
      message: 'Received goods created successfully',
      data: populatedReceivedGoods
    });
  } catch (error) {
    console.error('Create received goods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Approve received goods
// @route   POST /api/received-goods/:id/approve
// @access  Private
const approveReceivedGoods = async (req, res) => {
  try {
    const { notes } = req.body;

    const receivedGoods = await ReceivedGoods.findById(req.params.id);

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    if (!['pending', 'inspected', 'partial_approval', 'conditional', 'partial'].includes(receivedGoods.status)) {
      return res.status(400).json({
        success: false,
        message: `Only pending, inspected, partial_approval, conditional, or partial received goods can be approved. Current status: ${receivedGoods.status}`
      });
    }

    // Approve the receipt
    await receivedGoods.approve(req.user._id, notes);

    // Update supplier purchase statistics
    const Supplier = require('../models/Supplier');
    const supplier = await Supplier.findById(receivedGoods.supplier);
    if (supplier) {
      const totalAmount = receivedGoods.items.reduce((sum, item) => sum + item.totalCost, 0);
      await supplier.updatePurchaseStats(totalAmount);
    }

    // Update inventory for approved items
    for (const item of receivedGoods.items) {
      const product = await Product.findById(item.product);
      if (product) {
        // Calculate usable quantity (received - damaged - defective)
        const damagedQty = item.damagedQuantity || 0;
        const defectiveQty = item.defectiveQuantity || 0;
        const usableQuantity = item.receivedQuantity - damagedQty - defectiveQty;
        
        // Only add usable quantity to inventory
        if (usableQuantity > 0) {
          // Create stock movement for usable quantity
          const stockMovement = new StockMovement({
            product: product._id,
            warehouse: receivedGoods.warehouse,
            warehouseName: receivedGoods.warehouseName,
            movementType: 'receiving',
            quantity: usableQuantity,
            unitCost: item.unitCost,
            totalCost: usableQuantity * item.unitCost,
            previousStock: product.inventory.currentStock,
            newStock: product.inventory.currentStock + usableQuantity,
            reference: receivedGoods.receiptNumber,
            referenceType: 'received_goods',
            referenceId: receivedGoods._id,
            reason: 'Received goods approval',
            notes: notes,
            batchNumber: item.batchNumber,
            expiryDate: item.expiryDate,
            serialNumbers: item.serialNumbers,
            createdBy: req.user._id
          });

          await stockMovement.save();

          // Update product stock with usable quantity only
          product.inventory.currentStock += usableQuantity;
          product.inventory.lastMovement = new Date();
          if (receivedGoods.warehouse) {
            product.inventory.warehouse = receivedGoods.warehouse;
          }
          await product.save();
        }
        
        // Create separate stock movement records for damaged and defective items
        if (damagedQty > 0) {
          const damagedMovement = new StockMovement({
            product: product._id,
            warehouse: receivedGoods.warehouse,
            warehouseName: receivedGoods.warehouseName,
            movementType: 'damage',
            quantity: damagedQty,
            unitCost: item.unitCost,
            totalCost: damagedQty * item.unitCost,
            previousStock: product.inventory.currentStock,
            newStock: product.inventory.currentStock, // No change to stock for damaged items
            reference: receivedGoods.receiptNumber,
            referenceType: 'received_goods',
            referenceId: receivedGoods._id,
            reason: 'Damaged goods from received goods',
            notes: `Damaged quantity: ${damagedQty} from received goods inspection`,
            batchNumber: item.batchNumber,
            createdBy: req.user._id
          });
          await damagedMovement.save();
        }
        
        if (defectiveQty > 0) {
          const defectiveMovement = new StockMovement({
            product: product._id,
            warehouse: receivedGoods.warehouse,
            warehouseName: receivedGoods.warehouseName,
            movementType: 'damage', // Using 'damage' type for defective items
            quantity: defectiveQty,
            unitCost: item.unitCost,
            totalCost: defectiveQty * item.unitCost,
            previousStock: product.inventory.currentStock,
            newStock: product.inventory.currentStock, // No change to stock for defective items
            reference: receivedGoods.receiptNumber,
            referenceType: 'received_goods',
            referenceId: receivedGoods._id,
            reason: 'Defective goods from received goods',
            notes: `Defective quantity: ${defectiveQty} from received goods inspection`,
            batchNumber: item.batchNumber,
            createdBy: req.user._id
          });
          await defectiveMovement.save();
        }
      }
    }

    const populatedReceivedGoods = await ReceivedGoods.findById(receivedGoods._id)
      .populate('purchaseOrder', 'orderNumber status')
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('approvedBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Received goods approved successfully',
      data: populatedReceivedGoods
    });
  } catch (error) {
    console.error('Approve received goods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Inspect received goods
// @route   POST /api/received-goods/:id/inspect
// @access  Private
const inspectReceivedGoods = async (req, res) => {
  try {
    const { inspectionResults, notes } = req.body;

    const receivedGoods = await ReceivedGoods.findById(req.params.id);

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    if (receivedGoods.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending received goods can be inspected'
      });
    }

    // Update inspection details
    receivedGoods.qualityControl = {
      inspectedBy: req.user._id,
      inspectedAt: new Date(),
      inspectionResults: {
        passed: inspectionResults.passed,
        failedItems: inspectionResults.failedItems || [],
        notes: inspectionResults.notes
      }
    };

    receivedGoods.status = inspectionResults.passed ? 'inspected' : 'rejected';
    receivedGoods.inspectionNotes = notes;
    receivedGoods.lastUpdatedBy = req.user._id;

    await receivedGoods.save();

    const populatedReceivedGoods = await ReceivedGoods.findById(receivedGoods._id)
      .populate('purchaseOrder', 'orderNumber status')
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('qualityControl.inspectedBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Inspection completed successfully',
      data: populatedReceivedGoods
    });
  } catch (error) {
    console.error('Inspect received goods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get received goods statistics
// @route   GET /api/received-goods/stats
// @access  Private
const getReceivedGoodsStats = async (req, res) => {
  try {
    const stats = await ReceivedGoods.aggregate([
      {
        $group: {
          _id: null,
          totalReceipts: { $sum: 1 },
          pendingReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          inspectedReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'inspected'] }, 1, 0] }
          },
          approvedReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] }
          },
          rejectedReceipts: {
            $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0] }
          },
          totalValue: { $sum: '$totalValue' },
          totalItems: { $sum: '$totalItems' }
        }
      }
    ]);

    if (stats.length === 0) {
      return res.json({
        success: true,
        data: {
          totalReceipts: 0,
          pendingReceipts: 0,
          inspectedReceipts: 0,
          approvedReceipts: 0,
          rejectedReceipts: 0,
      totalValue: 0,
          totalItems: 0
        }
      });
    }

    res.json({
      success: true,
      data: stats[0]
    });
  } catch (error) {
    console.error('Get received goods stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// Resolve discrepancies
const resolveDiscrepancy = async (req, res) => {
  try {
    const { resolutionData } = req.body;
    const receivedGoods = await ReceivedGoods.findById(req.params.id);

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    if (!['conditional', 'partial'].includes(receivedGoods.status)) {
      return res.status(400).json({
        success: false,
        message: 'No discrepancies to resolve'
      });
    }

    await receivedGoods.resolveDiscrepancy(resolutionData, req.user._id);

    const populatedReceivedGoods = await ReceivedGoods.findById(req.params.id)
      .populate('purchaseOrder', 'orderNumber status')
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('receivedBy', 'name email')
      .populate('qualityControl.inspectedBy', 'name email');

    res.json({
      success: true,
      message: 'Discrepancies resolved successfully',
      data: populatedReceivedGoods
    });
  } catch (error) {
    console.error('Resolve discrepancy error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Enhanced quality inspection
const performQualityInspection = async (req, res) => {
  try {
    // The data is sent directly as the request body, not wrapped in inspectionData
    const inspectionData = req.body;
    console.log('🔍 [DEBUG] Backend received request body:', JSON.stringify(req.body, null, 2));
    console.log('🔍 [DEBUG] Backend using inspectionData directly:', JSON.stringify(inspectionData, null, 2));
    
    // Validate inspectionData
    if (!inspectionData) {
      console.log('❌ [DEBUG] No inspectionData provided');
      return res.status(400).json({
        success: false,
        message: 'Inspection data is required'
      });
    }

    if (!inspectionData.items || !Array.isArray(inspectionData.items)) {
      console.log('❌ [DEBUG] Invalid inspectionData.items:', inspectionData.items);
      return res.status(400).json({
        success: false,
        message: 'Inspection items data is required'
      });
    }
    
    const receivedGoods = await ReceivedGoods.findById(req.params.id);

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    // Allow quality inspection for more statuses to enable re-inspection
    if (!['pending', 'inspected', 'conditional'].includes(receivedGoods.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot perform quality inspection for status: ${receivedGoods.status}`
      });
    }

    await receivedGoods.performQualityInspection(inspectionData, req.user._id);

    const populatedReceivedGoods = await ReceivedGoods.findById(req.params.id)
      .populate('purchaseOrder', 'orderNumber status')
      .populate('supplier', 'name email phone')
      .populate('warehouse', 'name code')
      .populate('receivedBy', 'name email')
      .populate('qualityControl.inspectedBy', 'name email');

    res.json({
      success: true,
      message: 'Quality inspection completed successfully',
      data: populatedReceivedGoods
    });
  } catch (error) {
    console.error('Quality inspection error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getReceivedGoods,
  getReceivedGoodsById,
  createReceivedGoods,
  approveReceivedGoods,
  inspectReceivedGoods,
  getReceivedGoodsStats,
  resolveDiscrepancy,
  performQualityInspection
};