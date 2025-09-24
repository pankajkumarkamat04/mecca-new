const StockMovement = require('../models/StockMovement');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');

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

module.exports = {
  getStockMovements,
  createStockMovement,
  getInventoryLevels,
  getInventoryStats,
  getProductMovements,
  getProductStock,
  performStockAdjustment
};
