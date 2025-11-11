const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory blacklist for revoked JWTs (resets on process restart)
const revokedTokens = new Set();

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    if (revokedTokens.has(token)) {
      return res.status(401).json({ message: 'Token is revoked' });
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

    // Check if user has specific permission in permissions array
    if (req.user.permissions && req.user.permissions.length > 0) {
      const hasPermission = req.user.permissions.some(permission => 
        permission.module === module && permission.actions.includes(action)
      );

      if (hasPermission) {
        return next();
      }
    }

    // Fallback to role-based permissions if no explicit permissions set
    const rolePermissions = {
      manager: {
        users: ['read', 'create', 'update'],
        products: ['read', 'create', 'update', 'delete'],
        customers: ['read', 'create', 'update', 'delete'],
        suppliers: ['read', 'create', 'update', 'delete'],
        invoices: ['read', 'create', 'update', 'delete'],
        inventory: ['read', 'create', 'update', 'delete'],
        pos: ['read', 'create', 'update', 'delete'],
        reports: ['read'],
        reportsAnalytics: ['read'],
        support: ['read', 'create', 'update', 'delete'],
        accounts: ['read', 'create', 'update', 'delete'],
        transactions: ['read', 'create', 'update', 'delete'],
        workshop: ['read', 'create', 'update', 'delete'],
        settings: ['read', 'create', 'update', 'delete'],
        customerInquiries: ['read', 'create', 'update', 'delete'],
        quotations: ['read', 'create', 'update', 'delete'],
        orders: ['read', 'create', 'update', 'delete'],
        deliveries: ['read', 'create', 'update', 'delete'],
        warehouses: ['read', 'create', 'update', 'delete'],
        stockAlerts: ['read', 'create', 'update', 'delete'],
        purchaseOrders: ['read', 'create', 'update', 'delete'],
        resources: ['read', 'create', 'update', 'delete'],
        receivedGoods: ['read', 'create', 'update', 'delete'],
      },
      warehouse_manager: {
        inventory: ['read', 'create', 'update', 'delete'],
        products: ['read', 'create', 'update', 'delete'],
        orders: ['read', 'create', 'update', 'delete'],
        deliveries: ['read', 'create', 'update', 'delete'],
        warehouses: ['read', 'create', 'update', 'delete'],
        stockAlerts: ['read', 'create', 'update', 'delete'],
        purchaseOrders: ['read', 'create', 'update', 'delete'],
        receivedGoods: ['read', 'create', 'update', 'delete'],
        reports: ['read', 'create'],
        reportsAnalytics: ['read', 'create'],
        stockTaking: ['read', 'create', 'update', 'delete'],
        users: ['read'],
        customers: ['read', 'create', 'update'],
        suppliers: ['read', 'create', 'update'],
      },
      warehouse_employee: {
        inventory: ['read', 'update'],
        orders: ['read', 'update'],
        deliveries: ['read', 'update'],
        warehouses: ['read'],
        stockAlerts: ['read', 'update'],
        purchaseOrders: ['read'],
        receivedGoods: ['read', 'create', 'update'],
        customers: ['read', 'create', 'update'],
        reportsAnalytics: ['read'],
      },
      sales_person: {
        customers: ['read', 'create', 'update'],
        products: ['read'],
        invoices: ['read', 'create', 'update'],
        quotations: ['read', 'create', 'update'],
        orders: ['read', 'create', 'update'],
        pos: ['read', 'create'],
        reportsAnalytics: ['read'],
      },
      workshop_employee: {
        workshop: ['read', 'create', 'update', 'delete'],
        products: ['read'],
        customers: ['read', 'create', 'update'],
        invoices: ['read', 'create', 'update'],
        reportsAnalytics: ['read'],
      },
    };

    // Check role-based permissions
    const userRole = req.user.role;
    if (rolePermissions[userRole]) {
      const modulePermissions = rolePermissions[userRole][module];
      if (modulePermissions && modulePermissions.includes(action)) {
        return next();
      }
    }

    // Also check warehouse position if user has warehouse assignment
    if (req.user.warehouse && req.user.warehouse.warehousePosition) {
      const warehousePosition = req.user.warehouse.warehousePosition;
      if (rolePermissions[warehousePosition]) {
        const modulePermissions = rolePermissions[warehousePosition][module];
        if (modulePermissions && modulePermissions.includes(action)) {
          return next();
        }
      }
    }

    return res.status(403).json({ 
      message: `Access denied. Required permission: ${module}.${action}` 
    });
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
    if (req.user.role === 'admin' || req.user.role === 'manager') {
      return next();
    }

    const warehouseId = req.params.id;
    
    // Check if user is assigned to this warehouse (manager or employee)
    if (req.user.warehouse?.assignedWarehouse?.toString() === warehouseId && 
        (req.user.warehouse?.warehousePosition === 'warehouse_manager' || 
         req.user.warehouse?.warehousePosition === 'warehouse_employee')) {
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
  warehouseEmployeeAuth,
  revokedTokens
};
