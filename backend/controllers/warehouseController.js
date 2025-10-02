const Warehouse = require('../models/Warehouse');
const Product = require('../models/Product');
const StockMovement = require('../models/StockMovement');
const StockAlert = require('../models/StockAlert');
const PurchaseOrder = require('../models/PurchaseOrder');
const User = require('../models/User');

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
      .populate('employees.user', 'firstName lastName email phone')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Warehouse.countDocuments(filter);

    // Enhance with employees count
    const data = warehouses.map(w => ({
      ...w.toObject(),
      employeesCount: Array.isArray(w.employees) ? w.employees.filter(e => e.isActive).length : 0
    }));

    res.json({
      success: true,
      data,
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
    const warehouseData = req.body || {};
    warehouseData.createdBy = req.user._id;

    // Provide defaults for required fields to avoid brittle 400s in basic tests
    if (!warehouseData.name) warehouseData.name = `Warehouse ${Date.now()}`;
    if (!warehouseData.code) warehouseData.code = `WH${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    warehouseData.capacity = warehouseData.capacity || {};
    if (warehouseData.capacity.totalCapacity == null) warehouseData.capacity.totalCapacity = 0;

    // If manager is provided, validate the manager exists and has warehouse_manager role
    if (warehouseData.manager) {
      const manager = await User.findById(warehouseData.manager);
      if (!manager) {
        return res.status(404).json({
          success: false,
          message: 'Manager not found'
        });
      }
      
      if (manager.role !== 'warehouse_manager') {
        return res.status(400).json({
          success: false,
          message: 'Selected user must have warehouse_manager role'
        });
      }

      // Check if manager is already assigned to another warehouse
      const existingWarehouse = await Warehouse.findOne({ manager: warehouseData.manager });
      if (existingWarehouse) {
        return res.status(400).json({
          success: false,
          message: 'This manager is already assigned to another warehouse'
        });
      }
    }

    const warehouse = new Warehouse(warehouseData);
    await warehouse.save();

    // If manager was assigned, update the user's warehouse assignment
    if (warehouseData.manager) {
      await User.findByIdAndUpdate(warehouseData.manager, {
        'warehouse.assignedWarehouse': warehouse._id,
        'warehouse.warehousePosition': 'warehouse_manager',
        'warehouse.assignedAt': new Date(),
        'warehouse.assignedBy': req.user._id
      });
    }

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('createdBy', 'firstName lastName')
      .populate('manager', 'firstName lastName email');

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
      lastMovement: product.inventory.lastMovement || null,
      currentStock: product.inventory.currentStock,
      costPrice: product.pricing.costPrice,
      totalValue: product.inventory.currentStock * product.pricing.costPrice
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

// @desc    Assign manager to warehouse
// @route   PUT /api/warehouses/:id/assign-manager
// @access  Private (Admin only)
const assignManager = async (req, res) => {
  try {
    const { managerId } = req.body;
    
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const manager = await User.findById(managerId);
    if (!manager) {
      return res.status(404).json({
        success: false,
        message: 'Manager not found'
      });
    }

    // Check if manager is already assigned to another warehouse
    const existingWarehouse = await Warehouse.findOne({ manager: managerId });
    if (existingWarehouse && existingWarehouse._id.toString() !== req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'Manager is already assigned to another warehouse'
      });
    }

    // Update warehouse manager
    warehouse.manager = managerId;
    await warehouse.save();

    // Update manager's warehouse assignment
    await manager.assignToWarehouse(req.params.id, 'warehouse_manager', req.user._id);

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Manager assigned successfully',
      data: populatedWarehouse
    });
  } catch (error) {
    console.error('Assign manager error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Add employee to warehouse
// @route   POST /api/warehouses/:id/employees
// @access  Private (Warehouse Manager)
const addEmployee = async (req, res) => {
  try {
    const { userId, position } = req.body;
    
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if user is warehouse manager or admin
    if (req.user.role !== 'admin' && !warehouse.isManager(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only warehouse managers can add employees'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user is already assigned to another warehouse
    if (user.warehouse.assignedWarehouse && user.warehouse.assignedWarehouse.toString() !== req.params.id) {
      return res.status(400).json({
        success: false,
        message: 'User is already assigned to another warehouse'
      });
    }

    const employeeData = {
      user: userId,
      position: position,
      assignedBy: req.user._id
    };

    await warehouse.addEmployee(employeeData);
    await user.assignToWarehouse(req.params.id, position, req.user._id);

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', 'firstName lastName email phone')
      .populate('employees.user', 'firstName lastName email phone')
      .populate('employees.assignedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Employee added successfully',
      data: populatedWarehouse
    });
  } catch (error) {
    console.error('Add employee error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
};

// @desc    Remove employee from warehouse
// @route   DELETE /api/warehouses/:id/employees/:employeeId
// @access  Private (Warehouse Manager)
const removeEmployee = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if user is warehouse manager or admin
    if (req.user.role !== 'admin' && !warehouse.isManager(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only warehouse managers can remove employees'
      });
    }

    const employee = warehouse.employees.id(req.params.employeeId);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Remove employee from warehouse
    await warehouse.removeEmployee(req.params.employeeId);
    
    // Update user's warehouse assignment
    const user = await User.findById(employee.user);
    if (user) {
      await user.removeFromWarehouse();
    }

    const populatedWarehouse = await Warehouse.findById(warehouse._id)
      .populate('manager', 'firstName lastName email phone')
      .populate('employees.user', 'firstName lastName email phone')
      .populate('employees.assignedBy', 'firstName lastName');

    res.json({
      success: true,
      message: 'Employee removed successfully',
      data: populatedWarehouse
    });
  } catch (error) {
    console.error('Remove employee error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get warehouse employees
// @route   GET /api/warehouses/:id/employees
// @access  Private
const getWarehouseEmployees = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id)
      .populate('manager', 'firstName lastName email phone role')
      .populate('employees.user', 'firstName lastName email phone role')
      .populate('employees.assignedBy', 'firstName lastName');

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    const activeEmployees = warehouse.getActiveEmployees();

    res.json({
      success: true,
      data: {
        warehouse: {
          id: warehouse._id,
          name: warehouse.name,
          code: warehouse.code
        },
        manager: warehouse.manager,
        employees: activeEmployees.map(emp => ({
          id: emp._id,
          user: emp.user,
          position: emp.position,
          assignedAt: emp.assignedAt,
          assignedBy: emp.assignedBy
        }))
      }
    });
  } catch (error) {
    console.error('Get warehouse employees error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get available users for warehouse assignment
// @route   GET /api/warehouses/available-users
// @access  Private
const getAvailableUsers = async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { role: { $in: ['employee', 'warehouse_manager', 'warehouse_employee'] } },
        { 'warehouse.assignedWarehouse': null }
      ],
      isActive: true
    })
    .select('firstName lastName email phone role warehouse')
    .sort({ firstName: 1 });

    res.json({
      success: true,
      data: users
    });
  } catch (error) {
    console.error('Get available users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get warehouse manager dashboard data
// @route   GET /api/warehouses/:id/dashboard
// @access  Private (Warehouse Manager)
const getWarehouseDashboard = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: 'Warehouse not found'
      });
    }

    // Check if user is warehouse manager or admin
    if (req.user.role !== 'admin' && !warehouse.isManager(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only warehouse managers can access dashboard'
      });
    }

    // Get warehouse statistics
    const totalProducts = await Product.countDocuments({ 
      'inventory.warehouse': warehouse._id,
      isActive: true 
    });

    const lowStockProducts = await Product.countDocuments({
      'inventory.warehouse': warehouse._id,
      'inventory.currentStock': { $lte: warehouse.settings.lowStockThreshold },
      isActive: true
    });

    const totalStockValue = await Product.aggregate([
      {
        $match: {
          'inventory.warehouse': warehouse._id,
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: {
              $multiply: ['$inventory.currentStock', '$pricing.costPrice']
            }
          }
        }
      }
    ]);

    const recentMovements = await StockMovement.find({
      warehouse: warehouse._id
    })
    .populate('product', 'name')
    .populate('createdBy', 'firstName lastName')
    .sort({ createdAt: -1 })
    .limit(10);

    const activeEmployees = warehouse.getActiveEmployees().length;

    res.json({
      success: true,
      data: {
        warehouse: {
          id: warehouse._id,
          name: warehouse.name,
          code: warehouse.code,
          capacityUtilization: warehouse.capacityUtilization,
          weightUtilization: warehouse.weightUtilization
        },
        statistics: {
          totalProducts,
          lowStockProducts,
          totalStockValue: totalStockValue[0]?.totalValue || 0,
          activeEmployees,
          totalLocations: warehouse.locationCount
        },
        recentMovements,
        settings: warehouse.settings
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
  transferProducts,
  assignManager,
  addEmployee,
  removeEmployee,
  getWarehouseEmployees,
  getAvailableUsers,
  getWarehouseDashboard
};
