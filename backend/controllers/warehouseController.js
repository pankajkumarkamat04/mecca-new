const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const StockAlert = require('../models/StockAlert');
const PurchaseOrder = require('../models/PurchaseOrder');

// @desc    Get all warehouses
// @route   GET /api/warehouses
// @access  Private
const getWarehouses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const isActive = req.query.isActive;

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const warehouses = await Warehouse.find(filter)
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Warehouse.countDocuments(filter);

    res.json({
      success: true,
      data: warehouses,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get warehouses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get warehouse by ID
// @route   GET /api/warehouses/:id
// @access  Private
const getWarehouseById = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('createdBy', 'firstName lastName')
      .populate('locations');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    res.json({
      success: true,
      data: warehouse
    });
  } catch (error) {
    console.error('Get warehouse by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create warehouse
// @route   POST /api/warehouses
// @access  Private
const createWarehouse = async (req, res) => {
  try {
    const warehouseData = req.body;
    warehouseData.createdBy = req.user._id;

    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Warehouse created successfully',
      data: populatedWarehouse
    });
  } catch (error) {
    console.error('Create warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
// @access  Private
const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    Object.assign(warehouse, req.body);
    warehouse.lastUpdatedBy = req.user._id;
    await warehouse.save();

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Warehouse updated successfully',
      data: populatedWarehouse
    });
  } catch (error) {
    console.error('Update warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
// @access  Private
const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if warehouse has products
    const productCount = await Product.countDocuments({ 'inventory.warehouse': warehouse._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete warehouse with products. Please transfer products first.'
      });
    }

    await Warehouse.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Warehouse deleted successfully'
    });
  } catch (error) {
    console.error('Delete warehouse error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add location to warehouse
// @route   POST /api/warehouses/:id/locations
// @access  Private
const addLocation = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    await warehouse.addLocation(req.body);

    res.json({
      success: true,
      message: 'Location added successfully',
      data: warehouse
    });
  } catch (error) {
    console.error('Add location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update warehouse location
// @route   PUT /api/warehouses/:id/locations/:locationId
// @access  Private
const updateLocation = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    await warehouse.updateLocation(req.params.locationId, req.body);

    res.json({
      success: true,
      message: 'Location updated successfully',
      data: warehouse
    });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Remove warehouse location
// @route   DELETE /api/warehouses/:id/locations/:locationId
// @access  Private
const removeLocation = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    await warehouse.removeLocation(req.params.locationId);

    res.json({
      success: true,
      message: 'Location removed successfully',
      data: warehouse
    });
  } catch (error) {
    console.error('Remove location error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get warehouse statistics
// @route   GET /api/warehouses/stats
// @access  Private
const getWarehouseStats = async (req, res) => {
  try {
    const stats = await Warehouse.getStatistics();

    // Get additional stats
    const totalProducts = await Product.countDocuments({ isActive: true });
    const productsInWarehouses = await Product.countDocuments({ 
      'inventory.warehouse': { $exists: true },
      isActive: true 
    });

    res.json({
      success: true,
      data: {
        ...stats,
        totalProducts,
        productsInWarehouses,
        productsWithoutWarehouse: totalProducts - productsInWarehouses
      }
    });
  } catch (error) {
    console.error('Get warehouse stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get warehouse inventory
// @route   GET /api/warehouses/:id/inventory
// @access  Private
const getWarehouseInventory = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const products = await Product.find({ 
      'inventory.warehouse': warehouse._id,
      isActive: true 
    })
      .populate('category', 'name')
      .populate('supplier', 'name')
      .sort({ 'inventory.currentStock': -1 });

    const inventoryData = products.map(product => ({
      product,
      stockStatus: product.stockStatus,
      location: product.inventory.warehouseLocation,
      lastMovement: product.inventory.lastMovement
    }));

    res.json({
      success: true,
      data: {
        warehouse: warehouse.name,
        totalProducts: products.length,
        totalStockValue: products.reduce((sum, product) => 
          sum + (product.inventory.currentStock * product.pricing.costPrice), 0),
        inventory: inventoryData
      }
    });
  } catch (error) {
    console.error('Get warehouse inventory error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Transfer products between warehouses
// @route   POST /api/warehouses/transfer
// @access  Private
const transferProducts = async (req, res) => {
  try {
    const { fromWarehouse, toWarehouse, products, notes } = req.body;

    const fromWarehouseDoc = await Warehouse.findById(fromWarehouse);
    const toWarehouseDoc = await Warehouse.findById(toWarehouse);

    if (!fromWarehouseDoc || !toWarehouseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const transferMovements = [];

    for (const transferItem of products) {
      const product = await Product.findById(transferItem.productId);
      if (!product) continue;

      // Check if product has sufficient stock
      if (product.inventory.currentStock < transferItem.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for ${product.name}. Available: ${product.inventory.currentStock}, Requested: ${transferItem.quantity}`
        });
      }

      // Create outgoing movement
      const outgoingMovement = new StockMovement({
        product: product._id,
        warehouse: fromWarehouse,
        warehouseName: fromWarehouseDoc.name,
        movementType: 'transfer',
        quantity: transferItem.quantity,
        unitCost: product.pricing.costPrice,
        totalCost: transferItem.quantity * product.pricing.costPrice,
        previousStock: product.inventory.currentStock,
        newStock: product.inventory.currentStock - transferItem.quantity,
        fromLocation: product.inventory.warehouseLocation,
        toLocation: transferItem.toLocation,
        reason: 'Warehouse transfer',
        notes: notes,
        createdBy: req.user._id
      });

      await outgoingMovement.save();

      // Update product stock and warehouse
      product.inventory.currentStock -= transferItem.quantity;
      product.inventory.warehouse = toWarehouse;
      product.inventory.warehouseLocation = transferItem.toLocation;
      product.inventory.lastMovement = new Date();
      await product.save();

      // Create incoming movement
      const incomingMovement = new StockMovement({
        product: product._id,
        warehouse: toWarehouse,
        warehouseName: toWarehouseDoc.name,
        movementType: 'transfer',
        quantity: transferItem.quantity,
        unitCost: product.pricing.costPrice,
        totalCost: transferItem.quantity * product.pricing.costPrice,
        previousStock: product.inventory.currentStock,
        newStock: product.inventory.currentStock + transferItem.quantity,
        fromLocation: transferItem.fromLocation,
        toLocation: transferItem.toLocation,
        reason: 'Warehouse transfer',
        notes: notes,
        createdBy: req.user._id
      });

      await incomingMovement.save();

      transferMovements.push({
        product: product.name,
        quantity: transferItem.quantity,
        outgoingMovement: outgoingMovement._id,
        incomingMovement: incomingMovement._id
      });
    }

    res.json({
      success: true,
      message: 'Products transferred successfully',
      data: {
        fromWarehouse: fromWarehouseDoc.name,
        toWarehouse: toWarehouseDoc.name,
        transfers: transferMovements
      }
    });
  } catch (error) {
    console.error('Transfer products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getWarehouses,
  getWarehouseById,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
  addLocation,
  updateLocation,
  removeLocation,
  getWarehouseStats,
  getWarehouseInventory,
  transferProducts
};
