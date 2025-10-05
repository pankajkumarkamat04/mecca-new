const User = require('../models/User');
const Warehouse = require('../models/Warehouse');

// Helper function to verify warehouse manager access
const verifyWarehouseManagerAccess = async (userId, warehouseId) => {
  try {
    const warehouse = await Warehouse.findById(warehouseId);
    return warehouse && warehouse.manager && warehouse.manager.toString() === userId.toString();
  } catch (error) {
    return false;
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin/Manager)
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const role = req.query.role || '';

    // Build filter object
    const filter = { isActive: true };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (role) {
      filter.role = role;
    }

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments(filter);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin/Manager)
const createUser = async (req, res) => {
  try {
    let { role, warehouse } = req.body;
    const currentUserRole = req.user.role;

    // Normalize and validate role early
    const allowedRoles = ['admin','manager','customer','warehouse_manager','warehouse_employee','sales_person','workshop_employee'];
    if (role) {
      const normalized = String(role).toLowerCase().replace(/\s+/g, '_');
      // Common alias mapping
      const aliasMap = {
        employee: 'warehouse_employee',
        sales: 'sales_person',
        workshop: 'workshop_employee'
      };
      role = aliasMap[normalized] || normalized;
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: `Invalid role. Allowed roles: ${allowedRoles.join(', ')}`
        });
      }
      req.body.role = role;
    }

    // Role-based permission checks
    if (currentUserRole === 'employee' || currentUserRole === 'warehouse_employee') {
      return res.status(403).json({
        success: false,
        message: 'Employees cannot create users'
      });
    }

    if (currentUserRole === 'manager' && role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Managers can only create employees and customers'
      });
    }

    // Warehouse manager permissions
    if (currentUserRole === 'warehouse_manager') {
      if (role !== 'warehouse_employee') {
        return res.status(403).json({
          success: false,
          message: 'Warehouse managers can only create warehouse employees'
        });
      }
      // Verify warehouse manager has access to the specified warehouse
      if (warehouse && !await verifyWarehouseManagerAccess(req.user._id, warehouse)) {
        return res.status(403).json({
          success: false,
          message: 'You can only create employees for warehouses you manage'
        });
      }
    }

    // Warehouse assignment logic
    if (role === 'warehouse_employee') {
      if (!warehouse) {
        return res.status(400).json({
          success: false,
          message: 'Warehouse is required for warehouse employee role'
        });
      }

      // Verify warehouse exists
      const warehouseExists = await Warehouse.findById(warehouse);
      if (!warehouseExists) {
        return res.status(404).json({
          success: false,
          message: 'Warehouse not found'
        });
      }

      // Check if warehouse already has a manager
      if (warehouseExists.manager) {
        return res.status(400).json({
          success: false,
          message: 'This warehouse already has a manager assigned'
        });
      }
    }

    const userData = req.body;
    userData.createdBy = req.user._id;

    // Handle warehouse assignment for warehouse_employee
    if (role === 'warehouse_employee' && warehouse) {
      userData.warehouse = {
        assignedWarehouse: warehouse,
        warehousePosition: 'warehouse_employee',
        assignedAt: new Date(),
        assignedBy: req.user._id
      };
    }

    const user = new User(userData);
    await user.save();

    // If warehouse_employee, add to warehouse employees list
    if (role === 'warehouse_employee' && warehouse) {
      await Warehouse.findByIdAndUpdate(warehouse, {
        $push: {
          employees: {
            user: user._id,
            position: 'warehouse_employee',
            assignedBy: req.user._id,
            assignedAt: new Date(),
            isActive: true
          }
        }
      });
    }

    const userResponse = user.toJSON();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: userResponse
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    updateData.updatedBy = req.user._id;

    // Don't allow updating password through this route
    delete updateData.password;

    const user = await User.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password');

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
    const updateData = req.body;

    // Don't allow updating sensitive fields
    delete updateData.password;
    delete updateData.role;
    delete updateData.isActive;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Calculate user statistics
    const Invoice = require('../models/Invoice');
    
    const stats = {
      totalInvoices: 0,
      totalSales: 0,
      lastLogin: null,
      accountAge: 0
    };

    try {
      // Count invoices created by this user
      const invoiceCount = await Invoice.countDocuments({ createdBy: userId });
      stats.totalInvoices = invoiceCount;

      // Sum total sales from invoices
      const salesResult = await Invoice.aggregate([
        { $match: { createdBy: mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalSales: { $sum: '$total' } } }
      ]);
      stats.totalSales = salesResult.length > 0 ? salesResult[0].totalSales : 0;
    } catch (error) {
      console.error('Error calculating user stats:', error);
    }

    const user = await User.findById(userId).select('lastLogin createdAt');
    if (user) {
      stats.lastLogin = user.lastLogin;
      stats.accountAge = Math.floor((new Date() - user.createdAt) / (1000 * 60 * 60 * 24));
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserProfile,
  updateUserProfile,
  getUserStats
};
