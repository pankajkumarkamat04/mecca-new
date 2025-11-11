const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const PurchaseOrder = require('../models/PurchaseOrder');

// @desc    Get stock movements
// @route   GET /api/inventory/movements
// @access  Private
const getStockMovements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const product = req.query.product || '';
    const movementType = req.query.movementType || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build filter object
    const filter = {};
    if (product) filter.product = product;
    if (movementType) filter.movementType = movementType;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku')
      .populate('supplier', 'name')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StockMovement.countDocuments(filter);

    res.json({
      success: true,
      data: movements,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create stock movement
// @route   POST /api/inventory/movements
// @access  Private
const createStockMovement = async (req, res) => {
  try {
    const movementData = req.body;
    movementData.createdBy = req.user._id;

    // Validate product exists
    const product = await Product.findById(movementData.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get current stock
    const currentStock = await StockMovement.getCurrentStock(movementData.product);
    movementData.previousStock = currentStock;

    // Calculate new stock based on movement type
    let newStock;
    if (['in', 'return'].includes(movementData.movementType)) {
      newStock = currentStock + movementData.quantity;
    } else if (['out', 'damage', 'expired'].includes(movementData.movementType)) {
      newStock = Math.max(0, currentStock - movementData.quantity);
      
      // Check if sufficient stock for outgoing movements
      if (currentStock < movementData.quantity) {
        return res.status(400).json({
          success: false,
          message: 'Insufficient stock available'
        });
      }
    } else if (movementData.movementType === 'adjustment') {
      newStock = movementData.quantity; // Direct adjustment
    } else {
      newStock = currentStock; // Transfer doesn't change total stock
    }

    movementData.newStock = newStock;

    // Create stock movement
    const movement = new StockMovement(movementData);
    await movement.save();

    // Update product stock
    product.inventory.currentStock = newStock;
    await product.save();

    // Update supplier stats if it's an incoming movement from supplier
    if (movementData.supplier && ['in', 'return'].includes(movementData.movementType)) {
      const supplier = await Supplier.findById(movementData.supplier);
      if (supplier) {
        await supplier.updatePurchaseStats(movementData.totalCost);
      }
    }

    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('product', 'name sku')
      .populate('supplier', 'name')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Stock movement created successfully',
      data: populatedMovement
    });
  } catch (error) {
    console.error('Create stock movement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get current inventory levels
// @route   GET /api/inventory/levels
// @access  Private
const getInventoryLevels = async (req, res) => {
  try {
    const category = req.query.category || '';
    const lowStock = req.query.lowStock === 'true';

    // Build filter for products
    const productFilter = { isActive: true };
    if (category) productFilter.category = category;

    let products = await Product.find(productFilter)
      .populate('category', 'name')
      .populate('supplier', 'name');

    // Filter low stock items if requested
    if (lowStock) {
      products = products.filter(product => 
        product.inventory.currentStock <= product.inventory.minStock
      );
    }

    // Add stock status to each product
    const inventoryLevels = products.map(product => ({
      product: product,
      stockStatus: product.stockStatus,
      daysToStockOut: product.inventory.currentStock > 0 && product.inventory.currentStock > 0 
        ? Math.ceil(product.inventory.currentStock / (product.inventory.currentStock / 30)) // Rough estimate
        : 0
    }));

    res.json({
      success: true,
      data: inventoryLevels
    });
  } catch (error) {
    console.error('Get inventory levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get inventory statistics
// @route   GET /api/inventory/stats
// @access  Private
const getInventoryStats = async (req, res) => {
  try {
    const productFilter = { isActive: true };

    const totalProducts = await Product.countDocuments(productFilter);
    
    const lowStockProducts = await Product.countDocuments({
      ...productFilter,
      $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] }
    });

    const outOfStockProducts = await Product.countDocuments({
      ...productFilter,
      $expr: { $eq: ['$inventory.currentStock', 0] }
    });

    // Calculate total stock value
    const products = await Product.find(productFilter).select('inventory.currentStock pricing.costPrice');
    const totalStockValue = products.reduce((sum, product) => {
      return sum + (product.inventory.currentStock * product.pricing.costPrice);
    }, 0);

    // Get movement statistics for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const movementFilter = { createdAt: { $gte: thirtyDaysAgo } };

    const movementStats = await StockMovement.aggregate([
      { $match: movementFilter },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalStockValue,
        movementStats
      }
    });
  } catch (error) {
    console.error('Get inventory stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get stock movements for a specific product
// @route   GET /api/inventory/products/:productId/movements
// @access  Private
const getProductMovements = async (req, res) => {
  try {
    const { productId } = req.params;
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    const options = {};
    if (startDate) options.startDate = startDate;
    if (endDate) options.endDate = endDate;

    const movements = await StockMovement.getProductMovements(productId, options);

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('Get product movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get current stock for a product
// @route   GET /api/inventory/products/:productId/stock
// @access  Private
const getProductStock = async (req, res) => {
  try {
    const { productId } = req.params;

    const currentStock = await StockMovement.getCurrentStock(productId);

    res.json({
      success: true,
      data: {
        productId,
        currentStock
      }
    });
  } catch (error) {
    console.error('Get product stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Perform stock adjustment
// @route   POST /api/inventory/adjustment
// @access  Private
const performStockAdjustment = async (req, res) => {
  try {
    const { productId, newQuantity, reason, notes } = req.body;

    // Validate product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Get current stock
    const currentStock = await StockMovement.getCurrentStock(productId);
    
    if (newQuantity < 0) {
      return res.status(400).json({
        success: false,
        message: 'New quantity cannot be negative'
      });
    }

    // Create adjustment movement
    const adjustmentData = {
      product: productId,
      movementType: 'adjustment',
      quantity: newQuantity,
      unitCost: product.pricing.costPrice,
      totalCost: newQuantity * product.pricing.costPrice,
      previousStock: currentStock,
      newStock: newQuantity,
      reason: reason || 'Stock adjustment',
      notes: notes,
      createdBy: req.user._id
    };

    const movement = new StockMovement(adjustmentData);
    await movement.save();

    // Update product stock
    product.inventory.currentStock = newQuantity;
    await product.save();

    const populatedMovement = await StockMovement.findById(movement._id)
      .populate('product', 'name sku')
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Stock adjustment completed successfully',
      data: populatedMovement
    });
  } catch (error) {
    console.error('Perform stock adjustment error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};


// @desc    Perform stock taking/cycle count
// @route   POST /api/inventory/stock-taking
// @access  Private
const performStockTaking = async (req, res) => {
  try {
    const { warehouseId, products, notes } = req.body;

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const stockTakingResults = [];
    const adjustments = [];

    for (const stockItem of products) {
      const product = await Product.findById(stockItem.productId);
      if (!product) continue;

      const recordedStock = product.inventory.currentStock;
      const actualStock = stockItem.actualQuantity;
      const difference = actualStock - recordedStock;

      // Create stock movement for adjustment
      if (difference !== 0) {
        const adjustmentMovement = new StockMovement({
          product: product._id,
          warehouse: warehouseId,
          warehouseName: warehouse.name,
          movementType: 'stock_take',
          quantity: Math.abs(difference),
          unitCost: product.pricing.costPrice,
          totalCost: Math.abs(difference) * product.pricing.costPrice,
          previousStock: recordedStock,
          newStock: actualStock,
          reason: 'Stock taking adjustment',
          notes: notes,
          createdBy: req.user._id
        });

        await adjustmentMovement.save();

        // Update product stock
        product.inventory.currentStock = actualStock;
        product.inventory.lastStockCheck = new Date();
        product.inventory.lastMovement = new Date();
        await product.save();

        adjustments.push(adjustmentMovement._id);
      }

      stockTakingResults.push({
        product: product.name,
        sku: product.sku,
        recordedStock,
        actualStock,
        difference,
        adjusted: difference !== 0
      });
    }

    res.json({
      success: true,
      message: 'Stock taking completed successfully',
      data: {
        warehouse: warehouse.name,
        totalProductsChecked: products.length,
        adjustmentsMade: adjustments.length,
        stockTakingResults,
        adjustmentMovements: adjustments
      }
    });
  } catch (error) {
    console.error('Perform stock taking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Process receiving goods
// @route   POST /api/inventory/receiving
// @access  Private
const processReceiving = async (req, res) => {
  try {
    const { warehouseId, receivedItems, purchaseOrderId, notes } = req.body;

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const receivingMovements = [];

    for (const receivedItem of receivedItems) {
      const product = await Product.findById(receivedItem.productId);
      if (!product) continue;

      // Create receiving movement
      const receivingMovement = new StockMovement({
        product: product._id,
        warehouse: warehouseId,
        warehouseName: warehouse.name,
        movementType: 'receiving',
        quantity: receivedItem.quantity,
        unitCost: receivedItem.unitCost || product.pricing.costPrice,
        totalCost: receivedItem.quantity * (receivedItem.unitCost || product.pricing.costPrice),
        previousStock: product.inventory.currentStock,
        newStock: product.inventory.currentStock + receivedItem.quantity,
        reference: purchaseOrderId ? `PO-${purchaseOrderId}` : 'Manual receiving',
        referenceType: purchaseOrderId ? 'purchase_order' : 'manual',
        referenceId: purchaseOrderId,
        reason: 'Goods receiving',
        notes: notes,
        batchNumber: receivedItem.batchNumber,
        expiryDate: receivedItem.expiryDate,
        serialNumbers: receivedItem.serialNumbers,
        createdBy: req.user._id
      });

      await receivingMovement.save();

      // Update product stock
      product.inventory.currentStock += receivedItem.quantity;
      product.inventory.warehouse = warehouseId;
      product.inventory.warehouseLocation = receivedItem.location;
      product.inventory.lastMovement = new Date();
      await product.save();

      receivingMovements.push(receivingMovement._id);
    }

    res.json({
      success: true,
      message: 'Goods received successfully',
      data: {
        warehouse: warehouse.name,
        itemsReceived: receivedItems.length,
        receivingMovements
      }
    });
  } catch (error) {
    console.error('Process receiving error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Process picking for orders
// @route   POST /api/inventory/picking
// @access  Private
const processPicking = async (req, res) => {
  try {
    const { warehouseId, pickedItems, orderReference, notes } = req.body;

    const warehouse = await Warehouse.findById(warehouseId);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const pickingMovements = [];

    for (const pickedItem of pickedItems) {
      const product = await Product.findById(pickedItem.productId);
      if (!product) continue;

      // Check if sufficient stock
      if (product.inventory.currentStock < pickedItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.inventory.currentStock}, Required: ${pickedItem.quantity}`
        });
      }

      // Create picking movement
      const pickingMovement = new StockMovement({
        product: product._id,
        warehouse: warehouseId,
        warehouseName: warehouse.name,
        movementType: 'picking',
        quantity: pickedItem.quantity,
        unitCost: product.pricing.costPrice,
        totalCost: pickedItem.quantity * product.pricing.costPrice,
        previousStock: product.inventory.currentStock,
        newStock: product.inventory.currentStock - pickedItem.quantity,
        reference: orderReference,
        referenceType: 'order',
        reason: 'Order picking',
        notes: notes,
        fromLocation: product.inventory.warehouseLocation,
        createdBy: req.user._id
      });

      await pickingMovement.save();

      // Update product stock
      product.inventory.currentStock -= pickedItem.quantity;
      product.inventory.lastMovement = new Date();
      await product.save();

      pickingMovements.push(pickingMovement._id);
    }

    res.json({
      success: true,
      message: 'Picking completed successfully',
      data: {
        warehouse: warehouse.name,
        itemsPicked: pickedItems.length,
        pickingMovements
      }
    });
  } catch (error) {
    console.error('Process picking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get warehouse operations dashboard
// @route   GET /api/inventory/warehouse-dashboard
// @access  Private
const getWarehouseDashboard = async (req, res) => {
  try {
    const warehouseId = req.query.warehouseId;

    // Get warehouse statistics
    const warehouseStats = await Warehouse.getStatistics();

    // Get inventory statistics
    const inventoryStats = await StockMovement.aggregate([
      {
        $match: warehouseId ? { warehouse: mongoose.Types.ObjectId(warehouseId) } : {}
      },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: '$totalCost' }
        }
      }
    ]);

    // Get low stock alerts (real-time calculation)
    const productFilter = { 
      isActive: true,
      'inventory.alertOnLowStock': true
    };
    
    if (warehouseId) {
      productFilter['inventory.warehouse'] = warehouseId;
    }
    
    const products = await Product.find(productFilter);
    let lowStockAlerts = 0;
    
    for (const product of products) {
      const currentStock = product.inventory.currentStock;
      const minStock = product.inventory.minStock;
      
      if (currentStock <= minStock) {
        lowStockAlerts++;
      }
    }

    // Get pending purchase orders
    const pendingOrders = await PurchaseOrder.countDocuments({
      status: { $in: ['sent', 'confirmed', 'partial'] },
      ...(warehouseId && { warehouse: warehouseId })
    });

    // Get recent movements
    const recentMovements = await StockMovement.find(warehouseId ? { warehouse: warehouseId } : {})
      .populate('product', 'name sku')
      .populate('warehouse', 'name')
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      success: true,
      data: {
        warehouseStats,
        inventoryStats,
        lowStockAlerts,
        pendingOrders,
        recentMovements
      }
    });
  } catch (error) {
    console.error('Get warehouse dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Process goods receiving with receiving note
// @route   POST /api/inventory/receiving
// @access  Private
const processGoodsReceiving = async (req, res) => {
  try {
    const { receivingData, items } = req.body;
    const createdBy = req.user._id;

    // Generate receiving note number
    const receivingNoteNumber = `RN-${Date.now()}`;

    const receivingNote = {
      receivingNumber: receivingNoteNumber,
      supplier: receivingData.supplier,
      purchaseOrder: receivingData.purchaseOrder,
      receivedDate: new Date(),
      receivedBy: createdBy,
      warehouse: receivingData.warehouse,
      deliveryNote: receivingData.deliveryNote,
      carrier: receivingData.carrier,
      vehicleNumber: receivingData.vehicleNumber,
      driverName: receivingData.driverName,
      driverPhone: receivingData.driverPhone,
      notes: receivingData.notes,
      items: [],
      totalItems: 0,
      totalValue: 0,
      status: 'received'
    };

    const stockMovements = [];
    const updatedProducts = [];

    for (let item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found: ${item.product}`
        });
      }

      // Create stock movement
      const movement = new StockMovement({
        product: item.product,
        movementType: 'in',
        quantity: item.receivedQuantity,
        unitCost: item.unitCost,
        totalCost: item.receivedQuantity * item.unitCost,
        reference: receivingNoteNumber,
        referenceType: 'purchase_order',
        reason: 'Goods receiving',
        supplier: receivingData.supplier,
        notes: `Received ${item.receivedQuantity} units`,
        createdBy: createdBy
      });

      stockMovements.push(movement);

      // Update product stock
      product.inventory.currentStock += item.receivedQuantity;
      product.inventory.lastMovement = new Date();
      updatedProducts.push(product);

      // Add to receiving note
      receivingNote.items.push({
        product: item.product,
        productName: product.name,
        sku: product.sku,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        damagedQuantity: item.damagedQuantity || 0,
        missingQuantity: item.missingQuantity || 0,
        unitCost: item.unitCost,
        totalValue: item.receivedQuantity * item.unitCost,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        condition: item.condition || 'good',
        notes: item.notes
      });

      receivingNote.totalItems += item.receivedQuantity;
      receivingNote.totalValue += item.receivedQuantity * item.unitCost;
    }

    // Save all stock movements
    await StockMovement.insertMany(stockMovements);

    // Update all products
    for (let product of updatedProducts) {
      await product.save();
    }

    // Update purchase order status if provided
    if (receivingData.purchaseOrder) {
      const purchaseOrder = await PurchaseOrder.findById(receivingData.purchaseOrder);
      if (purchaseOrder) {
        purchaseOrder.status = 'received';
        purchaseOrder.receivedDate = new Date();
        await purchaseOrder.save();
      }
    }

    res.status(201).json({
      success: true,
      message: 'Goods receiving processed successfully',
      data: {
        receivingNote,
        stockMovements: stockMovements.length,
        updatedProducts: updatedProducts.length
      }
    });
  } catch (error) {
    console.error('Process goods receiving error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get receiving notes
// @route   GET /api/inventory/receiving-notes
// @access  Private
const getReceivingNotes = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const supplier = req.query.supplier || '';
    const purchaseOrder = req.query.purchaseOrder || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build filter object
    const filter = {};
    if (supplier) filter.supplier = supplier;
    if (purchaseOrder) filter.purchaseOrder = purchaseOrder;
    
    if (startDate || endDate) {
      filter.receivedDate = {};
      if (startDate) filter.receivedDate.$gte = new Date(startDate);
      if (endDate) filter.receivedDate.$lte = new Date(endDate);
    }

    const receivingNotes = await mongoose.connection.db.collection('receiving_notes')
      .find(filter)
      .sort({ receivedDate: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await mongoose.connection.db.collection('receiving_notes')
      .countDocuments(filter);

    res.json({
      success: true,
      data: receivingNotes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get receiving notes error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get real-time stock alerts
// @route   GET /api/inventory/stock-alerts
// @access  Private
const getStockAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const alertType = req.query.alertType || '';
    const severity = req.query.severity || '';
    const warehouse = req.query.warehouse || '';
    const supplier = req.query.supplier || '';

    // Build filter for products
    const productFilter = { 
      isActive: true,
      'inventory.alertOnLowStock': true
    };
    
    if (warehouse) {
      productFilter['inventory.warehouse'] = warehouse;
    }
    
    if (supplier) {
      productFilter.supplier = supplier;
    }

    // Get ALL products first (no pagination yet)
    const products = await Product.find(productFilter)
      .populate('supplier', 'name')
      .populate('inventory.warehouse', 'name code')
      .populate('category', 'name')
      .sort({ 'inventory.currentStock': 1 });

    // Generate real-time alerts from ALL products
    const allAlerts = [];
    for (const product of products) {
      const currentStock = product.inventory.currentStock;
      const minStock = product.inventory.minStock;
      const maxStock = product.inventory.maxStock;
      
      let alert = null;
      
      // Check for low stock or out of stock
      if (currentStock <= minStock) {
        const alertTypeValue = currentStock === 0 ? 'out_of_stock' : 'low_stock';
        const severityValue = currentStock === 0 ? 'critical' : 
                             currentStock <= (minStock * 0.5) ? 'critical' : 'high';
        
        // Apply filters
        if (alertType && alertType !== alertTypeValue) continue;
        if (severity && severity !== severityValue) continue;
        
        alert = {
          _id: `alert_${product._id}_${alertTypeValue}`,
          product: product._id,
          productName: product.name,
          sku: product.sku,
          alertType: alertTypeValue,
          severity: severityValue,
          currentStock,
          threshold: minStock,
          warehouse: product.inventory.warehouse,
          supplier: product.supplier,
          message: currentStock === 0 
            ? `${product.name} (${product.sku}) is out of stock`
            : `${product.name} (${product.sku}) is running low (${currentStock} units remaining)`,
          isRead: false,
          isResolved: false,
          autoGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      // Check for overstock
      else if (currentStock > maxStock) {
        const alertTypeValue = 'overstock';
        const severityValue = 'medium';
        
        // Apply filters
        if (alertType && alertType !== alertTypeValue) continue;
        if (severity && severity !== severityValue) continue;
        
        alert = {
          _id: `alert_${product._id}_${alertTypeValue}`,
          product: product._id,
          productName: product.name,
          sku: product.sku,
          alertType: alertTypeValue,
          severity: severityValue,
          currentStock,
          threshold: maxStock,
          warehouse: product.inventory.warehouse,
          supplier: product.supplier,
          message: `${product.name} (${product.sku}) has excess inventory (${currentStock} units, max: ${maxStock})`,
          isRead: false,
          isResolved: false,
          autoGenerated: true,
          createdAt: new Date(),
          updatedAt: new Date()
        };
      }
      
      if (alert) {
        allAlerts.push(alert);
      }
    }

    // Apply pagination to the alerts
    const totalAlerts = allAlerts.length;
    const alerts = allAlerts.slice(skip, skip + limit);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total: totalAlerts,
        pages: Math.ceil(totalAlerts / limit)
      }
    });
  } catch (error) {
    console.error('Get stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get stock alert statistics
// @route   GET /api/inventory/stock-alert-stats
// @access  Private
const getStockAlertStats = async (req, res) => {
  try {
    // Get all products with alert settings
    const products = await Product.find({ 
      isActive: true,
      'inventory.alertOnLowStock': true
    });

    let totalAlerts = 0;
    let criticalAlerts = 0;
    let highAlerts = 0;
    let mediumAlerts = 0;
    let lowAlerts = 0;
    let lowStockAlerts = 0;
    let outOfStockAlerts = 0;
    let overstockAlerts = 0;

    for (const product of products) {
      const currentStock = product.inventory.currentStock;
      const minStock = product.inventory.minStock;
      const maxStock = product.inventory.maxStock;
      
      if (currentStock <= minStock) {
        totalAlerts++;
        if (currentStock === 0) {
          outOfStockAlerts++;
          criticalAlerts++;
        } else {
          lowStockAlerts++;
          if (currentStock <= (minStock * 0.5)) {
            criticalAlerts++;
          } else {
            highAlerts++;
          }
        }
      } else if (currentStock > maxStock) {
        totalAlerts++;
        overstockAlerts++;
        mediumAlerts++;
      }
    }

    res.json({
      success: true,
      data: {
        totalAlerts,
        criticalAlerts,
        highAlerts,
        mediumAlerts,
        lowAlerts,
        lowStockAlerts,
        outOfStockAlerts,
        overstockAlerts,
        resolvedToday: 0, // Real-time alerts don't track resolution
        avgResolutionTime: 0 // Real-time alerts don't track resolution time
      }
    });
  } catch (error) {
    console.error('Get stock alert stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check low stock and return alerts
// @route   POST /api/inventory/check-low-stock
// @access  Private
const checkLowStock = async (req, res) => {
  try {
    const { warehouseId } = req.body;

    // Build filter for products
    const productFilter = { 
      isActive: true,
      'inventory.alertOnLowStock': true
    };
    
    if (warehouseId) {
      productFilter['inventory.warehouse'] = warehouseId;
    }

    const products = await Product.find(productFilter)
      .populate('inventory.warehouse')
      .populate('supplier');

    const alerts = [];
    let alertsFound = 0;

    for (const product of products) {
      const currentStock = product.inventory.currentStock;
      const minStock = product.inventory.minStock;
      const maxStock = product.inventory.maxStock;

      // Check for low stock or out of stock
      if (currentStock <= minStock) {
        const alertType = currentStock === 0 ? 'out_of_stock' : 'low_stock';
        const severity = currentStock === 0 ? 'critical' : 
                        currentStock <= (minStock * 0.5) ? 'critical' : 'high';

        alerts.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          alertType,
          severity,
          currentStock,
          threshold: minStock,
          warehouse: product.inventory.warehouse,
          supplier: product.supplier,
          message: currentStock === 0 
            ? `${product.name} (${product.sku}) is out of stock`
            : `${product.name} (${product.sku}) is running low (${currentStock} units remaining)`
        });
        alertsFound++;
      }
      
      // Check for overstock
      else if (currentStock > maxStock) {
        alerts.push({
          product: product._id,
          productName: product.name,
          sku: product.sku,
          alertType: 'overstock',
          severity: 'medium',
          currentStock,
          threshold: maxStock,
          warehouse: product.inventory.warehouse,
          supplier: product.supplier,
          message: `${product.name} (${product.sku}) has excess inventory (${currentStock} units, max: ${maxStock})`
        });
        alertsFound++;
      }
    }

    res.json({
      success: true,
      message: `Stock check completed. ${alertsFound} alerts found.`,
      data: {
        alertsFound,
        alerts
      }
    });
  } catch (error) {
    console.error('Check low stock error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get past stock take sessions
// @route   GET /api/inventory/stock-taking/sessions
// @access  Private
const getStockTakeSessions = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const warehouseId = req.query.warehouse || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';

    // Build filter for stock take movements
    const filter = { movementType: 'stock_take' };
    if (warehouseId) filter.warehouse = warehouseId;
    
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
      }
    }

    // Aggregate stock takes to group by session
    // Group by: createdBy, warehouse, date (rounded to hour), and notes
    const sessions = await StockMovement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            createdBy: '$createdBy',
            warehouse: '$warehouse',
            date: {
              $dateToString: {
                format: '%Y-%m-%d %H:00:00',
                date: '$createdAt'
              }
            },
            notes: { $ifNull: ['$notes', ''] }
          },
          movements: { $push: '$$ROOT' },
          totalProducts: { $sum: 1 },
          totalAdjustments: {
            $sum: {
              $cond: [{ $ne: ['$previousStock', '$newStock'] }, 1, 0]
            }
          },
          createdAt: { $min: '$createdAt' },
          createdAtMax: { $max: '$createdAt' },
          warehouseName: { $first: '$warehouseName' },
          createdByUser: { $first: '$createdBy' },
          movementIds: { $push: '$_id' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'createdByUser',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id.warehouse',
          foreignField: '_id',
          as: 'warehouseData'
        }
      },
      {
        $project: {
          _id: 1,
          movements: 1,
          movementIds: 1,
          totalProducts: 1,
          totalAdjustments: 1,
          createdAt: 1,
          createdAtMax: 1,
          warehouseName: { $ifNull: ['$warehouseName', { $arrayElemAt: ['$warehouseData.name', 0] }] },
          createdBy: {
            firstName: { $arrayElemAt: ['$user.firstName', 0] },
            lastName: { $arrayElemAt: ['$user.lastName', 0] }
          },
          notes: '$_id.notes',
          warehouseId: '$_id.warehouse'
        }
      },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit }
    ]);

    // Get total count for pagination
    const totalCountResult = await StockMovement.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            createdBy: '$createdBy',
            warehouse: '$warehouse',
            date: {
              $dateToString: {
                format: '%Y-%m-%d %H:00:00',
                date: '$createdAt'
              }
            },
            notes: { $ifNull: ['$notes', ''] }
          }
        }
      },
      { $count: 'total' }
    ]);

    const total = totalCountResult[0]?.total || 0;

    // Populate product details for each movement and generate sessionId
    const populatedSessions = await Promise.all(
      sessions.map(async (session) => {
        const populatedMovements = await StockMovement.populate(session.movements, {
          path: 'product',
          select: 'name sku'
        });
        // Generate sessionId from grouping criteria (for display, actual lookup uses query params)
        const sessionId = `${session._id.createdBy}-${session._id.warehouse}-${session._id.date}-${encodeURIComponent(session._id.notes || '')}`;
        
        // Convert movement IDs to strings for easy serialization
        const movementIdStrings = (session.movementIds || []).map(id => id.toString());
        
        return {
          ...session,
          movements: populatedMovements,
          sessionId: sessionId,
          sessionParams: {
            createdBy: session._id.createdBy.toString(),
            warehouse: session._id.warehouse.toString(),
            date: session._id.date,
            notes: session._id.notes || '',
            // Also include the actual timestamps for more reliable querying
            createdAt: session.createdAt ? new Date(session.createdAt).toISOString() : null,
            createdAtMax: session.createdAtMax ? new Date(session.createdAtMax).toISOString() : null,
            movementIds: movementIdStrings
          }
        };
      })
    );

    res.json({
      success: true,
      data: populatedSessions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get stock take sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get stock take session details
// @route   GET /api/inventory/stock-taking/sessions/details
// @access  Private
const getStockTakeSessionDetails = async (req, res) => {
  try {
    const { createdBy, warehouse, date, notes, createdAt, createdAtMax, movementIds } = req.query;

    // Convert to ObjectId if valid
    let createdById = createdBy;
    let warehouseId = warehouse;
    try {
      if (mongoose.Types.ObjectId.isValid(createdBy)) {
        createdById = new mongoose.Types.ObjectId(createdBy);
      }
      if (mongoose.Types.ObjectId.isValid(warehouse)) {
        warehouseId = new mongoose.Types.ObjectId(warehouse);
      }
    } catch (error) {
      console.error('Error converting to ObjectId:', error);
    }

    let filter = {
      movementType: 'stock_take',
      createdBy: createdById,
      warehouse: warehouseId
    };

    // If we have movement IDs, use them directly (most reliable)
    // Handle both array and comma-separated string formats
    let movementIdArray = [];
    if (movementIds) {
      if (Array.isArray(movementIds)) {
        movementIdArray = movementIds;
      } else if (typeof movementIds === 'string') {
        // Handle comma-separated string
        movementIdArray = movementIds.split(',').map(id => id.trim()).filter(id => id);
      }
    }
    
    if (movementIdArray.length > 0) {
      const validIds = movementIdArray.filter(id => mongoose.Types.ObjectId.isValid(id)).map(id => new mongoose.Types.ObjectId(id));
      if (validIds.length > 0) {
        filter._id = { $in: validIds };
        // Remove other filters when using IDs directly
        delete filter.createdBy;
        delete filter.warehouse;
        delete filter.movementType;
        console.log('Using movement IDs for query:', validIds.length);
      }
    } 
    // If we have actual timestamps, use them (more reliable than date string)
    else if (createdAt && createdAtMax) {
      try {
        const startTime = new Date(createdAt);
        const endTime = new Date(createdAtMax);
        // Add a small buffer (1 minute) to account for any timing issues
        startTime.setSeconds(startTime.getSeconds() - 60);
        endTime.setSeconds(endTime.getSeconds() + 60);
        filter.createdAt = {
          $gte: startTime,
          $lte: endTime
        };
        console.log('Using timestamp range:', { startTime: startTime.toISOString(), endTime: endTime.toISOString() });
      } catch (error) {
        console.error('Error parsing timestamps:', error);
      }
    }
    // Fallback to date string parsing
    else if (date) {
      console.log('Using date string fallback:', date);
      let sessionDate;
      try {
        if (date.includes(' ')) {
          const [datePart, timePart] = date.split(' ');
          const [hours, minutes] = timePart.split(':');
          sessionDate = new Date(`${datePart}T${hours}:${minutes}:00`);
        } else {
          sessionDate = new Date(date);
        }
        
        if (isNaN(sessionDate.getTime())) {
          throw new Error('Invalid date');
        }
        
        const startTime = new Date(sessionDate);
        startTime.setMinutes(0);
        startTime.setSeconds(0);
        startTime.setMilliseconds(0);
        
        const endTime = new Date(startTime);
        endTime.setHours(endTime.getHours() + 1);
        
        filter.createdAt = {
          $gte: startTime,
          $lt: endTime
        };
      } catch (error) {
        console.error('Error parsing date:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid date format: ' + error.message
        });
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: need either movementIds, createdAt/createdAtMax, or date'
      });
    }

    // Handle notes filter - only if not using movement IDs
    if (!filter._id) {
      if (notes && notes !== '' && notes !== 'undefined') {
        const decodedNotes = decodeURIComponent(notes);
        filter.notes = decodedNotes;
      } else {
        filter.$or = [
          { notes: { $exists: false } },
          { notes: null },
          { notes: '' }
        ];
      }
    }

    console.log('Final filter:', JSON.stringify(filter, null, 2));

    const movements = await StockMovement.find(filter)
      .populate('product', 'name sku category')
      .populate('createdBy', 'firstName lastName email')
      .populate('warehouse', 'name')
      .sort({ createdAt: 1 });

    console.log('Found movements:', movements.length);

    if (movements.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Stock take session not found'
      });
    }

    const sessionData = {
      sessionId: `${createdBy}-${warehouse}-${date}-${notes || ''}`,
      warehouse: movements[0].warehouseName || movements[0].warehouse?.name,
      warehouseId: movements[0].warehouse?._id || movements[0].warehouse,
      createdBy: movements[0].createdBy,
      createdAt: movements[0].createdAt,
      notes: movements[0].notes || '',
      totalProducts: movements.length,
      totalAdjustments: movements.filter(m => m.previousStock !== m.newStock).length,
      movements: movements.map(m => ({
        product: m.product,
        sku: m.product?.sku,
        recordedStock: m.previousStock,
        actualStock: m.newStock,
        difference: m.newStock - m.previousStock,
        adjusted: m.previousStock !== m.newStock,
        quantity: m.quantity,
        unitCost: m.unitCost,
        totalCost: m.totalCost,
        createdAt: m.createdAt
      }))
    };

    res.json({
      success: true,
      data: sessionData
    });
  } catch (error) {
    console.error('Get stock take session details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getStockMovements,
  createStockMovement,
  getInventoryLevels,
  getInventoryStats,
  getProductMovements,
  getProductStock,
  performStockAdjustment,
  performStockTaking,
  processReceiving,
  processPicking,
  getWarehouseDashboard,
  processGoodsReceiving,
  getReceivingNotes,
  getStockAlerts,
  getStockAlertStats,
  checkLowStock,
  getStockTakeSessions,
  getStockTakeSessionDetails
};
