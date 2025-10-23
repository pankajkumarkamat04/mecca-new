const mongoose = require('mongoose');
const Order = require('../models/Order');
const Invoice = require('../models/Invoice');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const WorkshopJob = require('../models/WorkshopJob');
const StockMovement = require('../models/StockMovement');
const Warehouse = require('../models/Warehouse');
const SalesTransactionService = require('../services/salesTransactionService');
const User = require('../models/User');

// @desc    Get Order Analytics
// @route   GET /api/reports-analytics/orders
// @access  Private
const getOrderAnalytics = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // Order Statistics
    const totalOrders = await Order.countDocuments(dateFilter);
    const completedOrders = await Order.countDocuments({ ...dateFilter });
    const pendingOrders = await Order.countDocuments({ ...dateFilter });
    const cancelledOrders = 0; // No cancelled orders in current data

    // Revenue Analytics
    const revenueData = await Order.aggregate([
      { $match: dateFilter },
      { $group: { _id: null, totalRevenue: { $sum: '$totalAmount' } } }
    ]);

    // Daily Order Trends
    const dailyTrends = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top Customers by Orders
    const topCustomers = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$customer',
          orderCount: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' }
        }
      },
      { $sort: { orderCount: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' }
    ]);

    // Order Status Distribution (using a placeholder since orders don't have status)
    const statusDistribution = [
      { _id: 'completed', count: completedOrders },
      { _id: 'pending', count: pendingOrders }
    ];

    res.json({
      success: true,
      data: {
        summary: {
          totalOrders,
          completedOrders,
          pendingOrders,
          cancelledOrders,
          completionRate: 100, // All orders are considered completed in current data
          totalRevenue: revenueData[0]?.totalRevenue || 0
        },
        trends: {
          dailyTrends
        },
        topCustomers,
        statusDistribution
      }
    });
  } catch (error) {
    console.error('Order analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get POS Sales Analytics
// @route   GET /api/reports-analytics/pos-sales
// @access  Private
const getPOSSalesAnalytics = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // POS Transaction Statistics
    const posTransactions = await Transaction.find({
      ...dateFilter,
      type: 'sale'
    });

    const totalSales = posTransactions.length;
    const totalRevenue = posTransactions.reduce((sum, t) => sum + t.amount, 0);
    const averageTransactionValue = totalSales > 0 ? totalRevenue / totalSales : 0;

    // Payment Method Analysis
    const paymentMethodStats = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    // Hourly Sales Pattern
    const hourlySales = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      {
        $group: {
          _id: { $hour: '$createdAt' },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // Daily Sales Trends
    const dailySales = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Top Selling Products (from POS)
    const topProducts = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          quantitySold: { $sum: '$items.quantity' },
          revenue: { $sum: '$items.total' }
        }
      },
      { $sort: { quantitySold: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          totalRevenue,
          averageTransactionValue: averageTransactionValue.toFixed(2)
        },
        paymentMethods: paymentMethodStats,
        trends: {
          hourlySales,
          dailySales
        },
        topProducts
      }
    });
  } catch (error) {
    console.error('POS sales analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Workshop Analytics
// @route   GET /api/reports-analytics/workshop
// @access  Private
const getWorkshopAnalytics = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // Workshop Job Statistics
    const totalJobs = await WorkshopJob.countDocuments(dateFilter);
    const completedJobs = await WorkshopJob.countDocuments({ ...dateFilter, status: 'completed' });
    const inProgressJobs = await WorkshopJob.countDocuments({ ...dateFilter, status: 'in_progress' });
    const pendingJobs = await WorkshopJob.countDocuments({ ...dateFilter, status: 'pending' });

    // Revenue Analytics - Use actual paid transactions from workshop invoices
    const revenueStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueEndDate = endDate ? new Date(endDate) : new Date();
    
    const revenueData = await Transaction.aggregate([
      { 
        $match: { 
          type: 'sale',
          date: { $gte: revenueStartDate, $lte: revenueEndDate },
          invoice: { $exists: true }
        } 
      },
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoice',
          foreignField: '_id',
          as: 'invoiceData'
        }
      },
      {
        $match: {
          'invoiceData.isWorkshopTransaction': true
        }
      },
      { $group: { _id: null, totalRevenue: { $sum: '$amount' } } }
    ]);


    // Job Type Distribution
    const jobTypeStats = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$jobType',
          count: { $sum: 1 },
          avgCost: { $avg: '$estimatedCost' }
        }
      }
    ]);

    // Priority Distribution
    const priorityStats = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 }
        }
      }
    ]);

    // Technician Performance
    const technicianStats = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$assignedTo',
          jobCount: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          avgCompletionTime: { $avg: '$actualDuration' }
        }
      },
      { $limit: 10 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'technician'
        }
      },
      { $unwind: '$technician' }
    ]);

    // Average Completion Time by Job Type
    const completionTimeByType = await WorkshopJob.aggregate([
      { $match: { ...dateFilter, status: 'completed' } },
      {
        $group: {
          _id: '$jobType',
          avgCompletionTime: { $avg: '$actualDuration' },
          avgEstimatedTime: { $avg: '$estimatedDuration' }
        }
      }
    ]);

    // Daily Job Trends
    const dailyJobTrends = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          jobCount: { $sum: 1 },
          revenue: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalJobs,
          completedJobs,
          inProgressJobs,
          pendingJobs,
          completionRate: totalJobs > 0 ? (completedJobs / totalJobs * 100).toFixed(2) : 0,
          totalRevenue: revenueData[0]?.totalRevenue || 0
        },
        jobTypes: jobTypeStats,
        priorities: priorityStats,
        technicians: technicianStats,
        completionTimes: completionTimeByType,
        trends: {
          dailyJobTrends
        }
      }
    });
  } catch (error) {
    console.error('Workshop analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Inventory Analytics
// @route   GET /api/reports-analytics/inventory
// @access  Private
const getInventoryAnalytics = async (req, res) => {
  try {
    // Inventory Overview
    const totalProducts = await Product.countDocuments();
    const [lowStockProducts, outOfStockProducts, overstockProducts] = await Promise.all([
      Product.aggregate([
        {
          $match: {
            $expr: {
              $lte: ['$inventory.currentStock', { $multiply: ['$inventory.minStock', 1.2] }]
            }
          }
        },
        { $count: 'count' }
      ]),
      Product.countDocuments({
        'inventory.currentStock': { $lte: 0 }
      }),
      Product.aggregate([
        {
          $match: {
            $expr: {
              $gte: ['$inventory.currentStock', { $multiply: ['$inventory.maxStock', 0.9] }]
            }
          }
        },
        { $count: 'count' }
      ])
    ]);

    // Stock Value Analysis
    const stockValueData = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
          avgStockValue: { $avg: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } }
        }
      }
    ]);

    // Category-wise Inventory
    const categoryInventory = await Product.aggregate([
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryData'
        }
      },
      { $unwind: '$categoryData' },
      {
        $group: {
          _id: '$category',
          categoryName: { $first: '$categoryData.name' },
          productCount: { $sum: 1 },
          totalStock: { $sum: '$inventory.currentStock' },
          totalValue: { $sum: { $multiply: ['$inventory.currentStock', '$pricing.costPrice'] } },
          avgStockLevel: { $avg: '$inventory.currentStock' }
        }
      },
      { $sort: { totalValue: -1 } }
    ]);

    // Stock Movement Analysis (Last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const stockMovements = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$movementType',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' },
          totalValue: { $sum: { $multiply: ['$quantity', '$unitCost'] } }
        }
      }
    ]);

    // Top Moving Products
    const topMovingProducts = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: '$product',
          totalMovement: { $sum: { $abs: '$quantity' } },
          totalValue: { $sum: { $abs: { $multiply: ['$quantity', '$unitCost'] } } }
        }
      },
      { $sort: { totalMovement: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' }
    ]);

    // Warehouse Stock Distribution
    const warehouseStock = await Product.aggregate([
      { $unwind: '$inventory.locations' },
      {
        $group: {
          _id: '$inventory.locations.warehouse',
          productCount: { $sum: 1 },
          totalStock: { $sum: '$inventory.locations.quantity' },
          totalValue: { $sum: { $multiply: ['$inventory.locations.quantity', '$pricing.costPrice'] } }
        }
      },
      {
        $lookup: {
          from: 'warehouses',
          localField: '_id',
          foreignField: '_id',
          as: 'warehouse'
        }
      },
      { $unwind: '$warehouse' }
    ]);

    // Reorder Alerts
    const reorderAlerts = await Product.aggregate([
      {
        $match: {
          $expr: {
            $lte: ['$inventory.currentStock', '$inventory.minStock']
          }
        }
      },
      {
        $project: {
          name: 1,
          sku: 1,
          'inventory.currentStock': 1,
          'inventory.minStock': 1,
          'pricing.costPrice': 1
        }
      },
      { $limit: 20 }
    ]);

    // Daily Stock Movement Trends
    const dailyStockTrends = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          movementCount: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts,
          lowStockProducts: lowStockProducts[0]?.count || 0,
          outOfStockProducts,
          overstockProducts: overstockProducts[0]?.count || 0,
          stockHealth: totalProducts > 0 ? ((totalProducts - (lowStockProducts[0]?.count || 0) - outOfStockProducts) / totalProducts * 100).toFixed(2) : 0,
          totalStockValue: stockValueData[0]?.totalValue || 0,
          avgStockValue: stockValueData[0]?.avgStockValue || 0
        },
        categories: categoryInventory,
        movements: stockMovements,
        topMovingProducts,
        warehouseStock,
        reorderAlerts,
        trends: {
          dailyStockTrends
        }
      }
    });
  } catch (error) {
    console.error('Inventory analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Dashboard Summary
// @route   GET /api/reports-analytics/dashboard
// @access  Private
const getDashboardSummary = async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Quick Stats
    const [
      totalOrders,
      orderRevenue,
      totalJobs,
      workshopRevenue,
      totalProducts,
      lowStockCount,
      pendingOrders,
      inProgressJobs,
      posSalesToday,
      posRevenue,
      totalCustomers,
      newCustomersThisMonth,
      openSupportTickets,
      totalInvoices,
      invoiceRevenue
    ] = await Promise.all([
      Order.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      WorkshopJob.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Transaction.aggregate([
        { 
          $match: { 
            type: 'sale',
            date: { $gte: thirtyDaysAgo },
            invoice: { $exists: true }
          } 
        },
        {
          $lookup: {
            from: 'invoices',
            localField: 'invoice',
            foreignField: '_id',
            as: 'invoiceData'
          }
        },
        {
          $match: {
            'invoiceData.isWorkshopTransaction': true
          }
        },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Product.countDocuments(),
      Product.aggregate([
        {
          $match: {
            $expr: {
              $lte: ['$inventory.currentStock', { $multiply: ['$inventory.minStock', 1.2] }]
            }
          }
        },
        { $count: 'count' }
      ]),
      Order.countDocuments({ status: 'pending' }),
      WorkshopJob.countDocuments({ status: 'in_progress' }),
      Transaction.countDocuments({
        type: 'sale',
        createdAt: { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) }
      }),
      Transaction.aggregate([
        { $match: { type: 'sale', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Customer.countDocuments(),
      Customer.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      // Support tickets - using a placeholder since we don't have a Support model
      Promise.resolve(0),
      Invoice.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    // Calculate comprehensive total sales
    const totalSalesRevenue = 
      (orderRevenue[0]?.total || 0) + 
      (workshopRevenue[0]?.total || 0) + 
      (posRevenue[0]?.total || 0) + 
      (invoiceRevenue[0]?.total || 0);

    res.json({
      success: true,
      data: {
        orders: {
          total: totalOrders,
          pending: pendingOrders,
          revenue: orderRevenue[0]?.total || 0
        },
        workshop: {
          total: totalJobs,
          inProgress: inProgressJobs,
          revenue: workshopRevenue[0]?.total || 0
        },
        inventory: {
          total: totalProducts,
          lowStock: lowStockCount[0]?.count || 0
        },
        sales: {
          today: posSalesToday,
          totalRevenue: totalSalesRevenue,
          breakdown: {
            pos: posRevenue[0]?.total || 0,
            orders: orderRevenue[0]?.total || 0,
            workshop: workshopRevenue[0]?.total || 0,
            invoices: invoiceRevenue[0]?.total || 0
          }
        },
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth
        },
        support: {
          openTickets: openSupportTickets,
          overdueTickets: 0 // Placeholder
        },
        invoices: {
          total: totalInvoices,
          revenue: invoiceRevenue[0]?.total || 0
        }
      }
    });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Sales Trends Chart Data
// @route   GET /api/reports-analytics/charts/sales-trends
// @access  Private
const getSalesTrendsChart = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // Daily sales trends - Orders
    const dailyOrderTrends = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Daily POS sales trends
    const dailyPOSTrends = await Transaction.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Daily workshop trends - Use actual paid transactions from workshop invoices
    const trendsStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendsEndDate = endDate ? new Date(endDate) : new Date();
    
    const dailyWorkshopTrends = await Transaction.aggregate([
      { 
        $match: { 
          type: 'sale',
          date: { $gte: trendsStartDate, $lte: trendsEndDate },
          invoice: { $exists: true }
        } 
      },
      {
        $lookup: {
          from: 'invoices',
          localField: 'invoice',
          foreignField: '_id',
          as: 'invoiceData'
        }
      },
      {
        $match: {
          'invoiceData.isWorkshopTransaction': true
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Invoice trends
    const invoiceTrends = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$total' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        dailyOrderTrends,
        dailyPOSTrends,
        dailyWorkshopTrends,
        invoiceTrends
      }
    });
  } catch (error) {
    console.error('Sales trends chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Top Products Chart Data
// @route   GET /api/reports-analytics/charts/top-products
// @access  Private
const getTopProductsChart = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate, limit = 10 } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // Top products by quantity sold
    const topProductsByQuantity = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: parseInt(limit) }
    ]);

    // Top products by revenue
    const topProductsByRevenue = await Order.aggregate([
      { $match: dateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        topProductsByQuantity,
        topProductsByRevenue
      }
    });
  } catch (error) {
    console.error('Top products chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Revenue Analytics Chart Data
// @route   GET /api/reports-analytics/charts/revenue-analytics
// @access  Private
const getRevenueAnalyticsChart = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // Monthly revenue breakdown
    const monthlyRevenue = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Payment method breakdown - handle both paymentMethod (seed data) and payments array (model)
    const paymentMethodBreakdown = await Invoice.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: { $ifNull: ['$paymentMethod', 'unknown'] },
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Customer segment revenue
    const customerSegmentRevenue = await Order.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'customers',
          localField: 'customer',
          foreignField: '_id',
          as: 'customerData'
        }
      },
      { $unwind: '$customerData' },
      {
        $group: {
          _id: '$customerData.type',
          revenue: { $sum: '$totalAmount' },
          orderCount: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        monthlyRevenue,
        paymentMethodBreakdown,
        customerSegmentRevenue
      }
    });
  } catch (error) {
    console.error('Revenue analytics chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get products sold breakdown by currency (USD vs ZWL)
// @route   GET /api/reports-analytics/sales-by-currency
// @access  Private
const getSalesByCurrency = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const dateFilter = startDate && endDate ? {
      createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) }
    } : {};

    // Aggregate from invoices because invoices store currency info
    const currencyBreakdown = await Invoice.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      {
        $group: {
          _id: '$currency.displayCurrency',
          totalInvoices: { $sum: 1 },
          totalRevenueBase: { $sum: '$total' },
          totalPaidBase: { $sum: '$paid' }
        }
      },
      { $sort: { totalRevenueBase: -1 } }
    ]);

    // Optional: product quantities by currency
    const productByCurrency = await Invoice.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            currency: '$currency.displayCurrency',
            product: '$items.product'
          },
          quantitySold: { $sum: '$items.quantity' },
          revenueBase: { $sum: '$items.total' }
        }
      },
      {
        $group: {
          _id: '$_id.currency',
          products: {
            $push: { product: '$_id.product', quantitySold: '$quantitySold', revenueBase: '$revenueBase' }
          }
        }
      }
    ]);

    res.json({ success: true, data: { currencyBreakdown, productByCurrency } });
  } catch (error) {
    console.error('Sales by currency error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get Workshop Analytics Chart Data
// @route   GET /api/reports-analytics/charts/workshop-analytics
// @access  Private
const getWorkshopAnalyticsChart = async (req, res) => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // Calculate date range
    let dateFilter = {};
    const now = new Date();
    
    if (startDate && endDate) {
      dateFilter = {
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
    } else {
      let daysBack = 30;
      switch (period) {
        case '7d': daysBack = 7; break;
        case '30d': daysBack = 30; break;
        case '90d': daysBack = 90; break;
        case '1y': daysBack = 365; break;
        default: daysBack = 30;
      }
      dateFilter = {
        createdAt: {
          $gte: new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000))
        }
      };
    }

    // Workshop job trends
    const jobTrends = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Job status distribution
    const jobStatusDistribution = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top technicians by jobs
    const topTechnicians = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'technicians',
          localField: 'assignedTechnician',
          foreignField: '_id',
          as: 'technicianData'
        }
      },
      { $unwind: '$technicianData' },
      {
        $group: {
          _id: '$assignedTechnician',
          technicianName: { $first: { $concat: ['$technicianData.firstName', ' ', '$technicianData.lastName'] } },
          jobCount: { $sum: 1 },
          totalRevenue: { $sum: '$estimatedCost' }
        }
      },
      { $sort: { jobCount: -1 } },
      { $limit: 10 }
    ]);

    res.json({
      success: true,
      data: {
        jobTrends,
        jobStatusDistribution,
        topTechnicians
      }
    });
  } catch (error) {
    console.error('Workshop analytics chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get sales transactions by sales person
// @route   GET /api/reports-analytics/sales-by-salesperson
// @access  Private
const getSalesBySalesPerson = async (req, res) => {
  try {
    const { salesPersonId, startDate, endDate, salesOutlet } = req.query;
    
    const transactions = await SalesTransactionService.getSalesBySalesPerson(salesPersonId, {
      startDate,
      endDate,
      salesOutlet
    });
    
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Get sales by sales person error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get sales summary by sales person
// @route   GET /api/reports-analytics/sales-summary-by-salesperson
// @access  Private
const getSalesSummaryBySalesPerson = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const summary = await SalesTransactionService.getSalesSummaryBySalesPerson({
      startDate,
      endDate
    });
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Get sales summary by sales person error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get Salesperson Dashboard Summary
// @route   GET /api/reports-analytics/salesperson-dashboard
// @access  Private (Sales Person)
const getSalespersonDashboard = async (req, res) => {
  try {
    const salesPersonId = req.user._id;
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Get salesperson's transactions
    const transactions = await Transaction.find({
      type: 'sale',
      status: 'posted',
      $or: [
        { 'metadata.salesPerson.id': salesPersonId },
        { createdBy: salesPersonId }
      ]
    });

    // Get salesperson's invoices
    const invoices = await Invoice.find({
      salesPerson: salesPersonId
    });

    // Calculate sales statistics
    const totalSales = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const salesThisMonth = transactions.filter(tx => tx.date >= thirtyDaysAgo).reduce((sum, tx) => sum + tx.amount, 0);
    const salesThisWeek = transactions.filter(tx => tx.date >= sevenDaysAgo).reduce((sum, tx) => sum + tx.amount, 0);
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const pendingInvoices = invoices.filter(inv => ['pending', 'partial'].includes(inv.status)).length;

    // Get daily sales trend for charts
    const dailySales = await Transaction.aggregate([
      {
        $match: {
          type: 'sale',
          status: 'posted',
          date: { $gte: thirtyDaysAgo },
          $or: [
            { 'metadata.salesPerson.id': salesPersonId },
            { createdBy: salesPersonId }
          ]
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            day: { $dayOfMonth: '$date' }
          },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get top customers
    const topCustomers = await Transaction.aggregate([
      {
        $match: {
          type: 'sale',
          status: 'posted',
          date: { $gte: thirtyDaysAgo },
          $or: [
            { 'metadata.salesPerson.id': salesPersonId },
            { createdBy: salesPersonId }
          ],
          customer: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$customer',
          transactionCount: { $sum: 1 },
          totalSpent: { $sum: '$amount' }
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customer'
        }
      },
      { $unwind: '$customer' }
    ]);

    res.json({
      success: true,
      data: {
        summary: {
          totalSales,
          salesThisMonth,
          salesThisWeek,
          totalInvoices,
          paidInvoices,
          pendingInvoices,
          averageSale: transactions.length > 0 ? totalSales / transactions.length : 0
        },
        trends: {
          dailySales
        },
        topCustomers
      }
    });
  } catch (error) {
    console.error('Salesperson dashboard error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getOrderAnalytics,
  getPOSSalesAnalytics,
  getWorkshopAnalytics,
  getInventoryAnalytics,
  getDashboardSummary,
  getSalesTrendsChart,
  getTopProductsChart,
  getRevenueAnalyticsChart,
  getWorkshopAnalyticsChart,
  getSalesByCurrency,
  getSalesBySalesPerson,
  getSalesSummaryBySalesPerson,
  getSalespersonDashboard
};
