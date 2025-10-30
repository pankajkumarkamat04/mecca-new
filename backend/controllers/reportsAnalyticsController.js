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

    // Revenue Analytics - Get revenue from invoices linked to workshop jobs
    const revenueStartDate = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const revenueEndDate = endDate ? new Date(endDate) : new Date();
    
    // Get revenue from invoices linked to workshop jobs
    const revenueData = await Invoice.aggregate([
      { 
        $match: { 
          workshopJob: { $exists: true },
          createdAt: { $gte: revenueStartDate, $lte: revenueEndDate }
        } 
      },
      { $group: { _id: null, totalRevenue: { $sum: '$total' } } }
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
      { $unwind: '$resources.assignedTechnicians' },
      {
        $group: {
          _id: '$resources.assignedTechnicians.user',
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
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'workshopJob',
          as: 'invoices'
        }
      },
      {
        $addFields: {
          actualRevenue: {
            $sum: '$invoices.total'
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          jobCount: { $sum: 1 },
          revenue: { $sum: '$actualRevenue' }
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

    // Get invoice IDs that are referenced by transactions (to avoid double-counting)
    const transactionInvoiceIds = await Transaction.distinct('invoice', {
      type: 'sale',
      createdAt: { $gte: thirtyDaysAgo },
      invoice: { $exists: true, $ne: null }
    });

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
      // Exclude POS transactions and invoices already represented by transactions
      Invoice.aggregate([
        { 
          $match: { 
            createdAt: { $gte: thirtyDaysAgo },
            // Exclude POS transactions and invoices already represented by transactions
            $and: [
              { isPosTransaction: { $ne: true } },
              { _id: { $nin: transactionInvoiceIds } }
            ]
          } 
        },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ])
    ]);

    // Calculate comprehensive total sales (exclude invoiceRevenue if it's already counted in transactions)
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
    const orderDateFilter = {
      orderDate: dateFilter.createdAt
    };
    const dailyOrderTrends = await Order.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' },
            day: { $dayOfMonth: '$orderDate' }
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

    // Get invoice IDs that are referenced by transactions (to avoid double-counting)
    const trendsTransactionInvoiceIds = await Transaction.distinct('invoice', {
      type: 'sale',
      ...dateFilter,
      invoice: { $exists: true, $ne: null }
    });

    // Invoice trends - exclude POS transactions and invoices already represented by transactions
    const invoiceTrends = await Invoice.aggregate([
      { 
        $match: {
          ...dateFilter,
          // Exclude POS transactions and invoices already represented by transactions
          $and: [
            { isPosTransaction: { $ne: true } },
            { _id: { $nin: trendsTransactionInvoiceIds } }
          ]
        } 
      },
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
        dailyTrends: dailyOrderTrends, // Frontend expects this field name
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

    // Top products from Orders
    const orderDateFilter = {
      orderDate: dateFilter.createdAt
    };
    
    const orderProducts = await Order.aggregate([
      { $match: orderDateFilter },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      }
    ]);

    // Top products from Invoices (excluding cancelled/refunded)
    const invoiceProducts = await Invoice.aggregate([
      { 
        $match: {
          ...dateFilter,
          status: { $nin: ['cancelled', 'refunded'] }
        } 
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          name: { $first: '$items.name' },
          sku: { $first: '$items.sku' },
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } }
        }
      }
    ]);

    // Combine and aggregate products from both Orders and Invoices
    const combinedProducts = {};

    // Add order products
    orderProducts.forEach(product => {
      const productId = product._id?.toString() || String(product._id);
      if (combinedProducts[productId]) {
        combinedProducts[productId].totalQuantity += product.totalQuantity || 0;
        combinedProducts[productId].totalRevenue += product.totalRevenue || 0;
      } else {
        combinedProducts[productId] = {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          totalQuantity: product.totalQuantity || 0,
          totalRevenue: product.totalRevenue || 0
        };
      }
    });

    // Add invoice products
    invoiceProducts.forEach(product => {
      const productId = product._id?.toString() || String(product._id);
      if (combinedProducts[productId]) {
        combinedProducts[productId].totalQuantity += product.totalQuantity || 0;
        combinedProducts[productId].totalRevenue += product.totalRevenue || 0;
      } else {
        combinedProducts[productId] = {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          totalQuantity: product.totalQuantity || 0,
          totalRevenue: product.totalRevenue || 0
        };
      }
    });

    // Convert to array and sort
    const topProductsByQuantity = Object.values(combinedProducts)
      .sort((a, b) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
      .slice(0, parseInt(limit));

    const topProductsByRevenue = Object.values(combinedProducts)
      .sort((a, b) => (b.totalRevenue || 0) - (a.totalRevenue || 0))
      .slice(0, parseInt(limit));

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
    const orderDateFilter = {
      orderDate: dateFilter.createdAt
    };
    const monthlyRevenue = await Order.aggregate([
      { $match: orderDateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$orderDate' },
            month: { $month: '$orderDate' }
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
        $project: {
          total: 1,
          paymentsArray: { 
            $cond: {
              if: { $and: [{ $isArray: "$payments" }, { $gt: [{ $size: "$payments" }, 0] }] },
              then: "$payments",
              else: [{ method: "unknown", amount: "$total" }]
            }
          }
        }
      },
      { $unwind: '$paymentsArray' },
      {
        $group: {
          _id: '$paymentsArray.method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$paymentsArray.amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    // Customer segment revenue
    const customerSegmentRevenue = await Order.aggregate([
      { $match: orderDateFilter },
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
    // Include sums in local/display currency (using each invoice's exchange rate)
    const currencyBreakdown = await Invoice.aggregate([
      { $match: { ...dateFilter, type: 'sale' } },
      {
        $group: {
          _id: '$currency.displayCurrency',
          totalInvoices: { $sum: 1 },
          // Base amounts are stored in USD
          totalRevenueBase: { $sum: '$total' },
          totalPaidBase: { $sum: '$paid' },
          // Local/display currency amounts (e.g., ZWL)
          totalRevenueLocal: { $sum: { $multiply: ['$total', { $ifNull: ['$currency.exchangeRate', 1] }] } },
          totalPaidLocal: { $sum: { $multiply: ['$paid', { $ifNull: ['$currency.exchangeRate', 1] }] } }
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

    // Workshop job trends - get revenue from linked invoices
    const jobTrends = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'workshopJob',
          as: 'invoices'
        }
      },
      {
        $addFields: {
          // Calculate revenue from invoices total
          actualRevenue: {
            $sum: '$invoices.total'
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 },
          totalRevenue: { $sum: '$actualRevenue' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Job status distribution - get revenue from linked invoices
    const jobStatusDistribution = await WorkshopJob.aggregate([
      { $match: dateFilter },
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'workshopJob',
          as: 'invoices'
        }
      },
      {
        $addFields: {
          // Calculate revenue from invoices total
          actualRevenue: {
            $sum: '$invoices.total'
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$actualRevenue' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Top technicians by jobs - handle both array and object history
    // Normalize technicianHistory to always be an array
    const topTechnicians = await WorkshopJob.aggregate([
      { $match: dateFilter },
      // Lookup invoices to get actual revenue
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'workshopJob',
          as: 'invoices'
        }
      },
      {
        $addFields: {
          // Calculate revenue from invoices total
          actualRevenue: {
            $sum: '$invoices.total'
          }
        }
      },
      // Match jobs that have either technician history or current assignments
      {
        $match: {
          $or: [
            { 'resources.technicianHistory': { $exists: true } },
            { 'resources.assignedTechnicians': { $exists: true, $ne: [] } }
          ]
        }
      },
      {
        $addFields: {
          // Normalize technicianHistory - ensure it's an array
          normalizedHistory: {
            $cond: {
              if: { $isArray: '$resources.technicianHistory' },
              then: '$resources.technicianHistory',
              else: {
                $cond: {
                  if: { $ne: ['$resources.technicianHistory', null] },
                  then: ['$resources.technicianHistory'],
                  else: []
                }
              }
            }
          },
          // Use assignedTechnicians if available
          currentTechnicians: { $ifNull: ['$resources.assignedTechnicians', []] }
        }
      },
      {
        $addFields: {
          // Combine both arrays - prefer history, but include current if no history
          allTechnicians: {
            $cond: {
              if: { $gt: [{ $size: '$normalizedHistory' }, 0] },
              then: '$normalizedHistory',
              else: '$currentTechnicians'
            }
          }
        }
      },
      // Filter out jobs with no technicians
      { $match: { $expr: { $gt: [{ $size: '$allTechnicians' }, 0] } } },
      { $unwind: '$allTechnicians' },
      {
        $lookup: {
          from: 'users',
          localField: 'allTechnicians.user',
          foreignField: '_id',
          as: 'technicianData'
        }
      },
      // Don't unwind yet - check if lookup found anything
      {
        $addFields: {
          isUserFound: { $gt: [{ $size: '$technicianData' }, 0] }
        }
      },
      // Only proceed if user found, or use the name directly
      {
        $match: {
          $or: [
            { isUserFound: true },
            { 'allTechnicians.name': { $exists: true, $ne: '' } }
          ]
        }
      },
      // Now unwind technicianData if it exists
      {
        $addFields: {
          technicianName: {
            $cond: {
              if: { $gt: [{ $size: '$technicianData' }, 0] },
              then: { $arrayElemAt: ['$technicianData', 0] },
              else: null
            }
          }
        }
      },
      {
        $group: {
          _id: '$allTechnicians.user',
          technicianName: { 
            $first: { 
              $ifNull: [
                '$allTechnicians.name',
                { 
                  $ifNull: [
                    { $concat: [{ $ifNull: ['$technicianName.firstName', ''] }, ' ', { $ifNull: ['$technicianName.lastName', ''] }] },
                    'Unknown Technician'
                  ]
                }
              ]
            } 
          },
          jobCount: { $sum: 1 },
          totalRevenue: { $sum: '$actualRevenue' }
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

// @desc    Get detailed sales report with transaction types
// @route   GET /api/reports-analytics/sales-report
// @access  Private
const getSalesReport = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search || '';
    const type = req.query.type || '';
    const startDate = req.query.startDate || '';
    const endDate = req.query.endDate || '';
    const status = req.query.status || '';
    const source = req.query.source || '';
    const salesOutletId = req.query.salesOutletId || '';

    // Build date filter
    // Note: If no date range is provided, don't apply date filter to allow viewing all transactions
    // This is especially important for outlet-specific queries
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z') // Include full day
      };
    } else if (startDate) {
      dateFilter = {
        $gte: new Date(startDate)
      };
    } else if (endDate) {
      dateFilter = {
        $lte: new Date(endDate + 'T23:59:59.999Z') // Include full day
      };
    }
    // If no dates provided, don't filter by date (show all transactions)

    // Import required models
    const Invoice = require('../models/Invoice');
    const Order = require('../models/Order');
    const WorkshopJob = require('../models/WorkshopJob');

    // Build search filter
    let searchFilter = {};
    if (search) {
      searchFilter = {
        $or: [
          { description: { $regex: search, $options: 'i' } },
          { transactionNumber: { $regex: search, $options: 'i' } },
          { reference: { $regex: search, $options: 'i' } },
          { invoiceNumber: { $regex: search, $options: 'i' } },
          { orderNumber: { $regex: search, $options: 'i' } },
          { jobNumber: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Build type filter
    let typeFilter = {};
    if (type && type !== 'all') {
      typeFilter = { type: type };
    }

    // Build status filter
    let statusFilter = {};
    if (status && status !== 'all') {
      statusFilter = { status: status };
    }

    // Build sales outlet filter for invoices
    let salesOutletFilter = {};
    if (salesOutletId && salesOutletId !== 'all') {
      salesOutletFilter = { salesOutlet: salesOutletId };
    }

    // Combine all filters
    const baseFilter = {
      ...searchFilter,
      ...typeFilter,
      ...statusFilter
    };

    // If filtering by sales outlet, get invoice IDs first for more efficient transaction querying
    let transactionInvoiceFilter = {};
    if (salesOutletId && salesOutletId !== 'all') {
      const outletInvoiceIds = await Invoice.find({
        salesOutlet: salesOutletId
      }).select('_id').lean();
      const invoiceIds = outletInvoiceIds.map(inv => inv._id);
      // Only get transactions linked to invoices for this outlet
      transactionInvoiceFilter = { invoice: { $in: invoiceIds } };
    } else {
      // Get all transactions with invoices if no outlet filter
      transactionInvoiceFilter = { invoice: { $exists: true } };
    }

    // Build transaction query - only include date filter if it has values
    const transactionQuery = {
      ...baseFilter,
      ...transactionInvoiceFilter,
      type: 'sale',
      status: 'posted'
    };
    if (Object.keys(dateFilter).length > 0) {
      transactionQuery.date = dateFilter;
    }

    // Build invoice query - only include date filter if it has values
    const invoiceQuery = {
      ...baseFilter,
      ...salesOutletFilter
    };
    if (Object.keys(dateFilter).length > 0) {
      invoiceQuery.invoiceDate = dateFilter;
    }

    // Build order query - only include date filter if it has values
    const orderQuery = {
      ...baseFilter
    };
    if (Object.keys(dateFilter).length > 0) {
      orderQuery.orderDate = dateFilter;
    }

    // Build workshop job query - only include date filter if it has values
    const workshopJobQuery = {
      ...baseFilter,
      status: { $in: ['completed', 'invoiced'] }
    };
    if (Object.keys(dateFilter).length > 0) {
      workshopJobQuery.createdAt = dateFilter;
    }

    // Get data from all sources
    const [transactions, invoices, orders, workshopJobs] = await Promise.all([
      // Transactions (POS and other financial transactions)
      // Only get transactions that are sales and posted
      Transaction.find(transactionQuery)
      .populate('customer', 'firstName lastName')
      .populate('supplier', 'name')
      .populate({
        path: 'invoice',
        select: 'invoiceNumber salesOutlet status total paid balance isPosTransaction',
        populate: {
          path: 'salesOutlet',
          select: 'name outletCode'
        }
      })
      .populate('createdBy', 'firstName lastName')
      .sort({ date: -1 }),

      // Invoices (regular sales invoices)
      Invoice.find(invoiceQuery)
      .populate('customer', 'firstName lastName')
      .populate('salesPerson', 'firstName lastName')
      .populate('salesOutlet', 'name outletCode')
      .populate('workshopJob', 'jobNumber')
      .sort({ invoiceDate: -1 }),

      // Orders (regular orders)
      Order.find(orderQuery)
        .populate('customer', 'firstName lastName')
        .sort({ orderDate: -1 }),

      // Workshop Jobs (workshop sales)
      WorkshopJob.find(workshopJobQuery)
        .populate('customer', 'firstName lastName')
        .populate('resources.assignedTechnicians.user', 'firstName lastName')
        .sort({ createdAt: -1 })
    ]);

    // Format all data into a unified structure
    const allSalesData = [];

    // Collect invoice IDs that are referenced by transactions (to avoid double-counting)
    const transactionInvoiceIds = new Set();
    transactions.forEach(transaction => {
      if (transaction.invoice) {
        // Handle both ObjectId and populated invoice
        const invoiceId = transaction.invoice._id ? transaction.invoice._id.toString() : transaction.invoice.toString();
        transactionInvoiceIds.add(invoiceId);
      }
    });

    // Add transactions
    transactions.forEach(transaction => {
      // For transactions linked to invoices, check invoice payment status
      let transactionPaid = transaction.paid || 0;
      let transactionAmount = transaction.amount || 0;
      let isFullyPaid = false;
      
      // If transaction is linked to an invoice, check invoice status for payment info
      if (transaction.invoice && typeof transaction.invoice === 'object') {
        const linkedInvoice = transaction.invoice;
        
        // For transactions linked to invoices, use invoice payment data
        if (linkedInvoice.status === 'paid' || (linkedInvoice.total && linkedInvoice.paid >= (linkedInvoice.total - 0.01))) {
          transactionAmount = Number(linkedInvoice.total || transactionAmount);
          transactionPaid = Number(linkedInvoice.paid || transactionPaid);
          // If invoice is paid but transaction paid field might be 0, use invoice total
          if (linkedInvoice.status === 'paid' && (transactionPaid === 0 || !transaction.paid)) {
            transactionPaid = transactionAmount;
          }
          isFullyPaid = true;
        } else {
          // Use transaction amounts but check invoice paid field
          transactionAmount = Number(linkedInvoice.total || transactionAmount);
          transactionPaid = Number(linkedInvoice.paid || transaction.paid || 0);
          isFullyPaid = transactionPaid >= (transactionAmount - 0.01);
        }
      } else {
        // For standalone transactions, use transaction fields
        transactionPaid = transaction.paid || 0;
        transactionAmount = transaction.amount || 0;
        isFullyPaid = transactionPaid >= transactionAmount;
      }
      
      // Determine source type based on transaction metadata
      // If transaction is linked to an invoice, it represents either POS or regular invoice sale
      const isInvoiceTransaction = !!transaction.invoice;
      const isPosTransaction = transaction.metadata?.posTransaction || false;
      
      // Use invoice number as reference if available
      const invoiceNumber = transaction.invoice?.invoiceNumber || transaction.reference || transaction.transactionNumber;
      
      // Get sales outlet from linked invoice if available
      const salesOutlet = transaction.invoice?.salesOutlet;
      const salesOutletName = salesOutlet?.name || salesOutlet?.outletCode || null;
      const transactionSalesOutletId = salesOutlet?._id ? salesOutlet._id.toString() : (typeof salesOutlet === 'string' ? salesOutlet : null);
      
      // Note: We already filtered at the database level, but double-check for consistency
      // (in case there are transactions without populated invoices)
      if (salesOutletFilter.salesOutlet && transactionSalesOutletId !== salesOutletFilter.salesOutlet.toString()) {
        return; // Skip this transaction if outlet doesn't match (shouldn't happen with proper filtering)
      }
      
      allSalesData.push({
        _id: transaction._id,
        source: 'transaction',
        // If transaction is linked to an invoice, check if it's POS or regular invoice
        sourceType: isPosTransaction ? 'POS/Financial' : (isInvoiceTransaction ? 'Invoice' : 'POS/Financial'),
        date: transaction.date,
        customer: transaction.customer ? 
          `${transaction.customer.firstName || ''} ${transaction.customer.lastName || ''}`.trim() : 
          (transaction.supplier ? transaction.supplier.name : 'N/A'),
        type: transaction.type,
        total: transactionAmount,
        tax: 0, // Will be calculated from entries if needed
        discount: 0, // Will be calculated from entries if needed
        grandTotal: transactionAmount,
        paid: transactionPaid,
        balance: isFullyPaid ? 0 : Math.max(0, transactionAmount - transactionPaid),
        status: isFullyPaid ? 'paid' : transaction.status,
        reference: invoiceNumber,
        invoiceNumber: isInvoiceTransaction ? invoiceNumber : null,
        salesOutlet: salesOutletName,
        salesOutletId: transactionSalesOutletId,
        createdBy: transaction.createdBy ? 
          `${transaction.createdBy.firstName || ''} ${transaction.createdBy.lastName || ''}`.trim() : 
          'Unknown'
      });
    });

    // Add invoices (exclude POS transactions and those linked to transactions to avoid double-counting)
    invoices.forEach(invoice => {
      // Skip invoices that are POS transactions (already represented by transactions)
      if (invoice.isPosTransaction) {
        return;
      }
      
      // Skip invoices that are already represented by transactions
      if (transactionInvoiceIds.has(invoice._id.toString())) {
        return;
      }
      // Get sales outlet info
      const invoiceSalesOutlet = invoice.salesOutlet;
      const invoiceSalesOutletName = invoiceSalesOutlet?.name || invoiceSalesOutlet?.outletCode || null;
      const invoiceSalesOutletId = invoiceSalesOutlet?._id ? invoiceSalesOutlet._id.toString() : (typeof invoiceSalesOutlet === 'string' ? invoiceSalesOutlet : null);
      
      // Robust paid/balance calculation to match invoice page
      const invTotal = Number(invoice.total || 0);
      
      // For POS transactions, payments array may contain tendered amount (not actual payment)
      // Always prioritize the invoice's 'paid' field which is calculated correctly by the model
      let invPaidRaw = 0;
      
      // If invoice has a paid field and it looks reliable (is a number and reasonable), use it
      // Allow slight overpayment due to rounding (paid can be up to total + 0.01)
      if (typeof invoice.paid === 'number' && invoice.paid >= 0 && invoice.paid <= (invTotal + 0.01)) {
        invPaidRaw = invoice.paid;
      } 
      // Otherwise, calculate from payments array (capped at total for POS transactions)
      else if (invoice.payments && Array.isArray(invoice.payments) && invoice.payments.length > 0) {
        const paymentsSum = invoice.payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
        
        // For POS transactions, payment amount might be tendered amount, so cap at total
        if (invoice.isPosTransaction) {
          invPaidRaw = Math.min(paymentsSum, invTotal);
        } else {
          invPaidRaw = paymentsSum;
        }
      } else {
        invPaidRaw = 0;
      }
      
      // Check if invoice is fully paid (either status is 'paid' OR paid amount >= total)
      // Use a small tolerance (0.01) for floating point comparison
      const isFullyPaid = invoice.status === 'paid' || (invTotal > 0 && invPaidRaw >= (invTotal - 0.01));
      
      // If invoice is fully paid, ensure paid equals total and balance is 0
      const invPaid = isFullyPaid ? invTotal : Math.min(invPaidRaw, invTotal);
      const invBalance = isFullyPaid ? 0 : Math.max(0, invTotal - invPaid);
      
      // Update status for report display - show as 'paid' if fully paid
      const reportStatus = isFullyPaid ? 'paid' : invoice.status;

      allSalesData.push({
        _id: invoice._id,
        source: 'invoice',
        sourceType: 'Invoice',
        date: invoice.invoiceDate,
        customer: invoice.customer ? 
          `${invoice.customer.firstName || ''} ${invoice.customer.lastName || ''}`.trim() : 
          'N/A',
        type: 'sale',
        total: invoice.subtotal,
        tax: invoice.totalTax,
        discount: invoice.totalDiscount,
        grandTotal: invTotal,
        paid: invPaid,
        balance: invBalance,
        status: reportStatus,
        reference: invoice.invoiceNumber,
        invoiceNumber: invoice.invoiceNumber,
        salesOutlet: invoiceSalesOutletName,
        salesOutletId: invoiceSalesOutletId,
        createdBy: invoice.salesPerson ? 
          `${invoice.salesPerson.firstName || ''} ${invoice.salesPerson.lastName || ''}`.trim() : 
          'Unknown'
      });
    });

    // Add orders
    orders.forEach(order => {
      allSalesData.push({
        _id: order._id,
        source: 'order',
        sourceType: 'Order',
        date: order.orderDate,
        customer: order.customer ? 
          `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() : 
          'N/A',
        type: 'sale',
        total: order.subtotal,
        tax: order.totalTax,
        discount: order.totalDiscount,
        grandTotal: order.total,
        paid: order.paid || 0,
        balance: order.total - (order.paid || 0),
        status: order.status,
        reference: order.orderNumber,
        invoiceNumber: order.invoiceNumber,
        createdBy: 'System' // Orders don't have salesPerson field
      });
    });

    // Add workshop jobs
    workshopJobs.forEach(job => {
      // Get the first assigned technician's name
      const assignedTechnician = job.resources?.assignedTechnicians?.[0];
      const technicianName = assignedTechnician?.user ? 
        `${assignedTechnician.user.firstName || ''} ${assignedTechnician.user.lastName || ''}`.trim() : 
        (assignedTechnician?.name || 'Unknown');

      allSalesData.push({
        _id: job._id,
        source: 'workshop',
        sourceType: 'Workshop',
        date: job.createdAt,
        customer: job.customer ? 
          `${job.customer.firstName || ''} ${job.customer.lastName || ''}`.trim() : 
          'N/A',
        type: 'sale',
        total: job.estimatedCost || 0,
        tax: 0, // Workshop jobs don't have separate tax
        discount: 0,
        grandTotal: job.estimatedCost || 0,
        paid: job.paid || 0,
        balance: (job.estimatedCost || 0) - (job.paid || 0),
        status: job.status,
        reference: job.jobNumber,
        invoiceNumber: job.invoiceNumber,
        createdBy: technicianName
      });
    });

    // Sort all data by date (newest first)
    allSalesData.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Apply source filter if specified
    let filteredData = allSalesData;
    if (source && source !== 'all') {
      filteredData = allSalesData.filter(item => item.sourceType === source);
    }

    // Apply client-side search filter on formatted fields (customer name, reference, etc.)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(item => {
        return (
          (item.customer && item.customer.toLowerCase().includes(searchLower)) ||
          (item.reference && item.reference.toLowerCase().includes(searchLower)) ||
          (item.invoiceNumber && item.invoiceNumber.toLowerCase().includes(searchLower)) ||
          (item.createdBy && item.createdBy.toLowerCase().includes(searchLower)) ||
          (item.status && item.status.toLowerCase().includes(searchLower)) ||
          (item.type && item.type.toLowerCase().includes(searchLower)) ||
          (item.salesOutlet && item.salesOutlet.toLowerCase().includes(searchLower))
        );
      });
    }

    // Apply pagination
    const total = filteredData.length;
    const paginatedData = filteredData.slice(skip, skip + limit);

    // Calculate summary statistics
    const summary = {
      totalAmount: filteredData.reduce((sum, item) => sum + (item.total || 0), 0),
      totalTax: filteredData.reduce((sum, item) => sum + (item.tax || 0), 0),
      totalDiscount: filteredData.reduce((sum, item) => sum + (item.discount || 0), 0),
      grandTotal: filteredData.reduce((sum, item) => sum + (item.grandTotal || 0), 0),
      totalPaid: filteredData.reduce((sum, item) => sum + (item.paid || 0), 0),
      totalBalance: filteredData.reduce((sum, item) => sum + (item.balance || 0), 0),
      count: total,
      // Source breakdown (exclude POS invoices and invoices linked to transactions to avoid double-counting)
      sourceBreakdown: {
        transactions: transactions.length,
        invoices: invoices.filter(inv => !inv.isPosTransaction && !transactionInvoiceIds.has(inv._id.toString())).length,
        orders: orders.length,
        workshopJobs: workshopJobs.length
      }
    };

    res.json({
      success: true,
      data: paginatedData,
      summary: summary,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
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
  getSalespersonDashboard,
  getSalesReport
};
