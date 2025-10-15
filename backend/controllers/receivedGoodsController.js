const ReceivedGoods = require('../models/ReceivedGoods');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const StockMovement = require('../models/StockMovement');
const { validationResult } = require('express-validator');

// @desc    Create received goods
// @route   POST /api/received-goods
// @access  Private
const createReceivedGoods = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      supplier,
      warehouse,
      expectedDate,
      items,
      deliveryNote,
      invoiceNumber,
      transportDetails,
      notes
    } = req.body;

    // Validate supplier exists
    const supplierExists = await Supplier.findById(supplier);
    if (!supplierExists) {
      return res.status(400).json({
        success: false,
        message: 'Supplier not found'
      });
    }

    // Validate warehouse exists
    const warehouseExists = await Warehouse.findById(warehouse);
    if (!warehouseExists) {
      return res.status(400).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Validate products exist and calculate totals
    const validatedItems = [];
    let totalValue = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      const itemTotal = item.expectedQuantity * item.unitPrice;
      totalValue += itemTotal;

      validatedItems.push({
        product: product._id,
        expectedQuantity: item.expectedQuantity,
        receivedQuantity: 0,
        unitPrice: item.unitPrice,
        totalValue: itemTotal,
        batchNumber: item.batchNumber || undefined,
        expiryDate: item.expiryDate || undefined,
        condition: item.condition || 'good',
        notes: item.notes || undefined
      });
    }

    // Generate received goods number
    const receivedNumber = await ReceivedGoods.generateReceivedNumber();

    const receivedGoods = new ReceivedGoods({
      receivedNumber,
      supplier,
      warehouse,
      expectedDate,
      items: validatedItems,
      totalValue,
      deliveryNote,
      invoiceNumber,
      transportDetails,
      notes,
      receivedBy: req.user._id,
      createdBy: req.user._id
    });

    await receivedGoods.save();

    // Populate the response
    await receivedGoods.populate([
      { path: 'supplier', select: 'name contactPerson email phone' },
      { path: 'warehouse', select: 'name code location' },
      { path: 'items.product', select: 'name sku category' },
      { path: 'receivedBy', select: 'firstName lastName email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Received goods created successfully',
      data: receivedGoods
    });

  } catch (error) {
    console.error('Create received goods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all received goods
// @route   GET /api/received-goods
// @access  Private
const getReceivedGoods = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      supplier,
      warehouse,
      startDate,
      endDate,
      search
    } = req.query;

    // Build filter
    const filter = {};
    
    if (status) filter.status = status;
    if (supplier) filter.supplier = supplier;
    if (warehouse) filter.warehouse = warehouse;
    
    if (startDate || endDate) {
      filter.receivedDate = {};
      if (startDate) filter.receivedDate.$gte = new Date(startDate);
      if (endDate) filter.receivedDate.$lte = new Date(endDate);
    }

    if (search) {
      filter.$or = [
        { receivedNumber: { $regex: search, $options: 'i' } },
        { deliveryNote: { $regex: search, $options: 'i' } },
        { invoiceNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [receivedGoods, totalCount] = await Promise.all([
      ReceivedGoods.find(filter)
        .populate('supplier', 'name contactPerson email phone')
        .populate('warehouse', 'name code location')
        .populate('items.product', 'name sku category')
        .populate('receivedBy', 'firstName lastName email')
        .populate('verifiedBy', 'firstName lastName email')
        .sort({ receivedDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      ReceivedGoods.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: receivedGoods,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
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
      .populate('supplier', 'name contactPerson email phone address')
      .populate('warehouse', 'name code location address')
      .populate('items.product', 'name sku category pricing inventory')
      .populate('receivedBy', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('qualityCheck.performedBy', 'firstName lastName email')
      .populate('documents.uploadedBy', 'firstName lastName email');

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

// @desc    Update received goods
// @route   PUT /api/received-goods/:id
// @access  Private
const updateReceivedGoods = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const receivedGoods = await ReceivedGoods.findById(req.params.id);
    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    // Check if already fully received
    if (receivedGoods.status === 'received') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update fully received goods'
      });
    }

    const {
      supplier,
      warehouse,
      expectedDate,
      items,
      deliveryNote,
      invoiceNumber,
      transportDetails,
      notes
    } = req.body;

    // Update basic fields
    if (supplier) receivedGoods.supplier = supplier;
    if (warehouse) receivedGoods.warehouse = warehouse;
    if (expectedDate) receivedGoods.expectedDate = expectedDate;
    if (deliveryNote) receivedGoods.deliveryNote = deliveryNote;
    if (invoiceNumber) receivedGoods.invoiceNumber = invoiceNumber;
    if (transportDetails) receivedGoods.transportDetails = transportDetails;
    if (notes) receivedGoods.notes = notes;

    // Update items if provided
    if (items) {
      const validatedItems = [];
      let totalValue = 0;

      for (const item of items) {
        const product = await Product.findById(item.product);
        if (!product) {
          return res.status(400).json({
            success: false,
            message: `Product not found: ${item.product}`
          });
        }

        const itemTotal = item.expectedQuantity * item.unitPrice;
        totalValue += itemTotal;

        validatedItems.push({
          product: product._id,
          expectedQuantity: item.expectedQuantity,
          receivedQuantity: item.receivedQuantity || 0,
          unitPrice: item.unitPrice,
          totalValue: itemTotal,
          batchNumber: item.batchNumber || undefined,
          expiryDate: item.expiryDate || undefined,
          condition: item.condition || 'good',
          notes: item.notes || undefined
        });
      }

      receivedGoods.items = validatedItems;
      receivedGoods.totalValue = totalValue;
    }

    receivedGoods.lastUpdatedBy = req.user._id;
    await receivedGoods.save();

    // Populate the response
    await receivedGoods.populate([
      { path: 'supplier', select: 'name contactPerson email phone' },
      { path: 'warehouse', select: 'name code location' },
      { path: 'items.product', select: 'name sku category' },
      { path: 'receivedBy', select: 'firstName lastName email' }
    ]);

    res.json({
      success: true,
      message: 'Received goods updated successfully',
      data: receivedGoods
    });

  } catch (error) {
    console.error('Update received goods error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Receive items (update received quantities)
// @route   POST /api/received-goods/:id/receive
// @access  Private
const receiveItems = async (req, res) => {
  try {
    const { items, qualityCheck, notes } = req.body;

    const receivedGoods = await ReceivedGoods.findById(req.params.id);
    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    // Update received quantities
    for (const receivedItem of items) {
      const item = receivedGoods.items.id(receivedItem.itemId);
      if (item) {
        item.receivedQuantity = receivedItem.receivedQuantity;
        if (receivedItem.batchNumber) item.batchNumber = receivedItem.batchNumber;
        if (receivedItem.expiryDate) item.expiryDate = receivedItem.expiryDate;
        if (receivedItem.condition) item.condition = receivedItem.condition;
        if (receivedItem.notes) item.notes = receivedItem.notes;
      }
    }

    // Update quality check if provided
    if (qualityCheck) {
      receivedGoods.qualityCheck = {
        performed: true,
        performedBy: req.user._id,
        performedDate: new Date(),
        results: qualityCheck.results,
        notes: qualityCheck.notes
      };
    }

    if (notes) {
      receivedGoods.notes = notes;
    }

    receivedGoods.lastUpdatedBy = req.user._id;
    await receivedGoods.save();

    res.json({
      success: true,
      message: 'Items received successfully',
      data: receivedGoods
    });

  } catch (error) {
    console.error('Receive items error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add to inventory (transfer received goods to stock)
// @route   POST /api/received-goods/:id/add-to-inventory
// @access  Private
const addToInventory = async (req, res) => {
  try {
    const receivedGoods = await ReceivedGoods.findById(req.params.id)
      .populate('items.product')
      .populate('warehouse');

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    // Check if all items are received
    if (!receivedGoods.isFullyReceived) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add to inventory until all items are received'
      });
    }

    // Update product inventory and create stock movements
    const stockMovements = [];

    for (const item of receivedGoods.items) {
      const product = item.product;
      
      // Update product inventory
      product.inventory.currentStock += item.receivedQuantity;
      await product.save();

      // Create stock movement
      const stockMovement = new StockMovement({
        product: product._id,
        warehouse: receivedGoods.warehouse._id,
        movementType: 'received',
        quantity: item.receivedQuantity,
        unitCost: item.unitPrice,
        reference: receivedGoods.receivedNumber,
        referenceId: receivedGoods._id,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        notes: `Received from ${receivedGoods.supplier}`,
        createdBy: req.user._id
      });

      await stockMovement.save();
      stockMovements.push(stockMovement);
    }

    // Mark as verified
    receivedGoods.verifiedBy = req.user._id;
    receivedGoods.verificationDate = new Date();
    receivedGoods.lastUpdatedBy = req.user._id;
    await receivedGoods.save();

    res.json({
      success: true,
      message: 'Items added to inventory successfully',
      data: {
        receivedGoods,
        stockMovements: stockMovements.length
      }
    });

  } catch (error) {
    console.error('Add to inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete received goods
// @route   DELETE /api/received-goods/:id
// @access  Private
const deleteReceivedGoods = async (req, res) => {
  try {
    const receivedGoods = await ReceivedGoods.findById(req.params.id);

    if (!receivedGoods) {
      return res.status(404).json({
        success: false,
        message: 'Received goods not found'
      });
    }

    // Check if already added to inventory
    if (receivedGoods.verifiedBy) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete received goods that have been added to inventory'
      });
    }

    await ReceivedGoods.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Received goods deleted successfully'
    });

  } catch (error) {
    console.error('Delete received goods error:', error);
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
    const { startDate, endDate, warehouse } = req.query;

    const filter = {};
    if (startDate || endDate) {
      filter.receivedDate = {};
      if (startDate) filter.receivedDate.$gte = new Date(startDate);
      if (endDate) filter.receivedDate.$lte = new Date(endDate);
    }
    if (warehouse) filter.warehouse = warehouse;

    const stats = await ReceivedGoods.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalReceived: { $sum: 1 },
          totalValue: { $sum: '$totalValue' },
          pending: {
            $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
          },
          partiallyReceived: {
            $sum: { $cond: [{ $eq: ['$status', 'partially_received'] }, 1, 0] }
          },
          fullyReceived: {
            $sum: { $cond: [{ $eq: ['$status', 'received'] }, 1, 0] }
          },
          cancelled: {
            $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalReceived: 0,
      totalValue: 0,
      pending: 0,
      partiallyReceived: 0,
      fullyReceived: 0,
      cancelled: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get received goods stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  createReceivedGoods,
  getReceivedGoods,
  getReceivedGoodsById,
  updateReceivedGoods,
  receiveItems,
  addToInventory,
  deleteReceivedGoods,
  getReceivedGoodsStats
};
