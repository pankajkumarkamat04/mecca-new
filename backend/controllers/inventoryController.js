const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const Warehouse = require('../models/Warehouse');
const StockAlert = require('../models/StockAlert');
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

// @desc    Perform stock replenishment check
// @route   POST /api/inventory/replenishment-check
// @access  Private
const performReplenishmentCheck = async (req, res) => {
  try {
    const { warehouseId, autoCreateOrders } = req.body;

    // Build filter for products that need replenishment
    const productFilter = { 
      isActive: true,
      'inventory.autoReorder': true
    };
    
    if (warehouseId) {
      productFilter['inventory.warehouse'] = warehouseId;
    }

    const products = await Product.find(productFilter)
      .populate('supplier')
      .populate('inventory.warehouse');

    const replenishmentData = [];
    const ordersCreated = [];

    for (const product of products) {
      const currentStock = product.inventory.currentStock;
      const reorderPoint = product.inventory.reorderPoint;
      const reorderQuantity = product.inventory.reorderQuantity;

      if (currentStock <= reorderPoint && reorderQuantity > 0) {
        const replenishmentItem = {
          product: product._id,
          productName: product.name,
          sku: product.sku,
          currentStock,
          reorderPoint,
          reorderQuantity,
          supplier: product.supplier,
          warehouse: product.inventory.warehouse,
          needsReplenishment: true
        };

        replenishmentData.push(replenishmentItem);

        // Auto-create purchase order if enabled
        if (autoCreateOrders && product.supplier) {
          const orderData = {
            supplier: product.supplier._id,
            warehouse: product.inventory.warehouse?._id,
            items: [{
              product: product._id,
              name: product.name,
              sku: product.sku,
              description: product.description,
              quantity: reorderQuantity,
              unitCost: product.pricing.costPrice,
              totalCost: reorderQuantity * product.pricing.costPrice
            }],
            subtotal: reorderQuantity * product.pricing.costPrice,
            totalAmount: reorderQuantity * product.pricing.costPrice,
            status: 'draft',
            notes: 'Auto-generated replenishment order',
            priority: currentStock === 0 ? 'urgent' : 'high',
            createdBy: req.user._id
          };

          const purchaseOrder = new PurchaseOrder(orderData);
          await purchaseOrder.save();
          ordersCreated.push(purchaseOrder._id);
        }
      }
    }

    res.json({
      success: true,
      message: `Replenishment check completed. ${replenishmentData.length} products need replenishment.`,
      data: {
        productsNeedingReplenishment: replenishmentData.length,
        replenishmentData,
        ordersCreated: ordersCreated.length,
        orderIds: ordersCreated
      }
    });
  } catch (error) {
    console.error('Perform replenishment check error:', error);
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

    // Get low stock alerts
    const lowStockAlerts = await StockAlert.countDocuments({
      isResolved: false,
      alertType: { $in: ['low_stock', 'out_of_stock'] },
      ...(warehouseId && { warehouse: warehouseId })
    });

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

module.exports = {
  getStockMovements,
  createStockMovement,
  getInventoryLevels,
  getInventoryStats,
  getProductMovements,
  getProductStock,
  performStockAdjustment,
  performReplenishmentCheck,
  performStockTaking,
  processReceiving,
  processPicking,
  getWarehouseDashboard
};
