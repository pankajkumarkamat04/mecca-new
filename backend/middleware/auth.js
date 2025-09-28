const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Access denied. Required role: ${roles.join(' or ')}` 
      });
    }

    next();
  };
};

const checkPermission = (module, action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user has specific permission
    const hasPermission = req.user.permissions.some(permission => 
      permission.module === module && permission.actions.includes(action)
    );

    if (!hasPermission) {
      return res.status(403).json({ 
        message: `Access denied. Required permission: ${module}.${action}` 
      });
    }

    next();
  };
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user && user.isActive) {
        req.user = user;
      }
    }
    
    next();
  } catch (error) {
    // Continue without user if token is invalid
    next();
  }
};

// Warehouse-specific authorization middleware
const warehouseManagerAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is warehouse manager
    if (req.user.role === 'warehouse_manager' || req.user.warehouse?.warehousePosition === 'warehouse_manager') {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied. Warehouse manager role required.' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if user can manage specific warehouse
const warehouseAccessAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    // Admin has access to all warehouses
    if (req.user.role === 'admin') {
      return next();
    }

    const warehouseId = req.params.id;
    
    // Check if user is manager of this warehouse
    if (req.user.warehouse?.assignedWarehouse?.toString() === warehouseId && 
        req.user.warehouse?.warehousePosition === 'warehouse_manager') {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied. You can only manage your assigned warehouse.' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Check if user is warehouse employee
const warehouseEmployeeAuth = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Access denied. No user found.' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // Check if user is warehouse employee
    const warehouseRoles = ['warehouse_manager', 'warehouse_employee'];
    if (warehouseRoles.includes(req.user.role) || 
        warehouseRoles.includes(req.user.warehouse?.warehousePosition)) {
      return next();
    }

    return res.status(403).json({ 
      message: 'Access denied. Warehouse employee role required.' 
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  auth,
  authorize,
  checkPermission,
  optionalAuth,
  warehouseManagerAuth,
  warehouseAccessAuth,
  warehouseEmployeeAuth
};
