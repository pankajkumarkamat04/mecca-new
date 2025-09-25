const StockAlert = require('../models/StockAlert');
const Product = require('../models/Product');
const Warehouse = require('../models/Warehouse');

// @desc    Get all stock alerts
// @route   GET /api/stock-alerts
// @access  Private
const getStockAlerts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const alertType = req.query.alertType || '';
    const severity = req.query.severity || '';
    const isResolved = req.query.isResolved;
    const isRead = req.query.isRead;
    const warehouse = req.query.warehouse || '';
    const supplier = req.query.supplier || '';

    // Build filter
    const filter = {};
    if (alertType) filter.alertType = alertType;
    if (severity) filter.severity = severity;
    if (isResolved !== undefined) filter.isResolved = isResolved === 'true';
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    if (warehouse) filter.warehouse = warehouse;
    if (supplier) filter.supplier = supplier;

    const alerts = await StockAlert.find(filter)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .populate('supplier', 'name')
      .populate('createdBy', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName')
      .sort({ severity: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await StockAlert.countDocuments(filter);

    res.json({
      success: true,
      data: alerts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
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

// @desc    Get unresolved stock alerts
// @route   GET /api/stock-alerts/unresolved
// @access  Private
const getUnresolvedAlerts = async (req, res) => {
  try {
    const filters = {
      alertType: req.query.alertType || '',
      severity: req.query.severity || '',
      warehouse: req.query.warehouse || '',
      supplier: req.query.supplier || '',
      isRead: req.query.isRead
    };

    const alerts = await StockAlert.getUnresolvedAlerts(filters);

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    console.error('Get unresolved alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get stock alert by ID
// @route   GET /api/stock-alerts/:id
// @access  Private
const getStockAlertById = async (req, res) => {
  try {
    const alert = await StockAlert.findById(req.params.id)
      .populate('product', 'name sku description')
      .populate('warehouse', 'name code')
      .populate('supplier', 'name email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('resolvedBy', 'firstName lastName');

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Stock alert not found'
      });
    }

    res.json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Get stock alert by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Mark alert as read
// @route   PUT /api/stock-alerts/:id/read
// @access  Private
const markAlertAsRead = async (req, res) => {
  try {
    const alert = await StockAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Stock alert not found'
      });
    }

    await alert.markAsRead();

    res.json({
      success: true,
      message: 'Alert marked as read successfully',
      data: alert
    });
  } catch (error) {
    console.error('Mark alert as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Resolve alert
// @route   PUT /api/stock-alerts/:id/resolve
// @access  Private
const resolveAlert = async (req, res) => {
  try {
    const { resolutionNotes } = req.body;

    const alert = await StockAlert.findById(req.params.id);

    if (!alert) {
      return res.status(404).json({
        success: false,
        message: 'Stock alert not found'
      });
    }

    if (alert.isResolved) {
      return res.status(400).json({
        success: false,
        message: 'Alert is already resolved'
      });
    }

    await alert.resolve(req.user._id, resolutionNotes);

    res.json({
      success: true,
      message: 'Alert resolved successfully',
      data: alert
    });
  } catch (error) {
    console.error('Resolve alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Create manual alert
// @route   POST /api/stock-alerts
// @access  Private
const createStockAlert = async (req, res) => {
  try {
    const alertData = req.body;
    alertData.createdBy = req.user._id;
    alertData.autoGenerated = false;

    // Validate product exists
    const product = await Product.findById(alertData.product);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    alertData.productName = product.name;
    alertData.sku = product.sku;
    alertData.currentStock = product.inventory.currentStock;

    // Validate warehouse if provided
    if (alertData.warehouse) {
      const warehouse = await Warehouse.findById(alertData.warehouse);
      if (warehouse) {
        alertData.warehouseName = warehouse.name;
      }
    }

    // Validate supplier if provided
    if (alertData.supplier) {
      const supplier = await Supplier.findById(alertData.supplier);
      if (supplier) {
        alertData.supplierName = supplier.name;
      }
    }

    const alert = new StockAlert(alertData);
    await alert.save();

    const populatedAlert = await StockAlert.findById(alert._id)
      .populate('product', 'name sku')
      .populate('warehouse', 'name code')
      .populate('supplier', 'name')
      .populate('createdBy', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Stock alert created successfully',
      data: populatedAlert
    });
  } catch (error) {
    console.error('Create stock alert error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get stock alert statistics
// @route   GET /api/stock-alerts/stats
// @access  Private
const getStockAlertStats = async (req, res) => {
  try {
    const stats = await StockAlert.getAlertStatistics();

    // Get alerts by age
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentAlerts = await StockAlert.countDocuments({
      isResolved: false,
      createdAt: { $gte: oneDayAgo }
    });

    const weekOldAlerts = await StockAlert.countDocuments({
      isResolved: false,
      createdAt: { $lt: oneWeekAgo }
    });

    res.json({
      success: true,
      data: {
        ...stats,
        recentAlerts,
        weekOldAlerts
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

// @desc    Bulk resolve alerts
// @route   PUT /api/stock-alerts/bulk-resolve
// @access  Private
const bulkResolveAlerts = async (req, res) => {
  try {
    const { alertIds, resolutionNotes } = req.body;

    if (!alertIds || !Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Alert IDs are required'
      });
    }

    const alerts = await StockAlert.find({
      _id: { $in: alertIds },
      isResolved: false
    });

    const resolvedAlerts = [];
    for (const alert of alerts) {
      await alert.resolve(req.user._id, resolutionNotes);
      resolvedAlerts.push(alert._id);
    }

    res.json({
      success: true,
      message: `${resolvedAlerts.length} alerts resolved successfully`,
      data: {
        resolvedCount: resolvedAlerts.length,
        resolvedAlerts
      }
    });
  } catch (error) {
    console.error('Bulk resolve alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Check for low stock products and create alerts
// @route   POST /api/stock-alerts/check-low-stock
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

    const alertsCreated = [];

    for (const product of products) {
      const currentStock = product.inventory.currentStock;
      const minStock = product.inventory.minStock;

      if (currentStock <= minStock) {
        // Check if alert already exists
        const existingAlert = await StockAlert.findOne({
          product: product._id,
          alertType: currentStock === 0 ? 'out_of_stock' : 'low_stock',
          isResolved: false
        });

        if (!existingAlert) {
          const alert = await StockAlert.createLowStockAlert(
            product, 
            product.inventory.warehouse
          );
          alertsCreated.push(alert._id);
        }
      }
    }

    res.json({
      success: true,
      message: `Low stock check completed. ${alertsCreated.length} new alerts created.`,
      data: {
        alertsCreated: alertsCreated.length,
        alertIds: alertsCreated
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

module.exports = {
  getStockAlerts,
  getUnresolvedAlerts,
  getStockAlertById,
  markAlertAsRead,
  resolveAlert,
  createStockAlert,
  getStockAlertStats,
  bulkResolveAlerts,
  checkLowStock
};
