const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
const Order = require('../models/Order');
const WorkshopJob = require('../models/WorkshopJob');
const Technician = require('../models/Technician');
const StockMovement = require('../models/StockMovement');

// Helper function to get date range
const getDateRange = (dateRange) => {
  const now = new Date();
  let startDate, endDate;

  switch (dateRange) {
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      endDate = now;
      break;
    case '1y':
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      endDate = now;
      break;
    default:
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      endDate = now;
  }

  return { startDate, endDate };
};

// @desc    Get overview metrics
// @route   GET /api/analytics/overview
// @access  Private
const getOverviewMetrics = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    // Get basic metrics
    const [
      totalRevenue,
      totalOrders,
      totalCustomers,
      averageOrderValue,
      previousPeriodRevenue,
      previousPeriodOrders,
      previousPeriodCustomers,
      previousPeriodAOV
    ] = await Promise.all([
      // Current period metrics
      Invoice.aggregate([
        {
          $match: {
            invoiceDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Invoice.countDocuments({
        invoiceDate: { $gte: startDate, $lte: endDate },
        status: { $in: ['paid', 'partial'] }
      }),
      Customer.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      Invoice.aggregate([
        {
          $match: {
            invoiceDate: { $gte: startDate, $lte: endDate },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ]),
      // Previous period metrics for comparison
      Invoice.aggregate([
        {
          $match: {
            invoiceDate: { 
              $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
              $lt: startDate
            },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } }
      ]),
      Invoice.countDocuments({
        invoiceDate: { 
          $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
          $lt: startDate
        },
        status: { $in: ['paid', 'partial'] }
      }),
      Customer.countDocuments({
        createdAt: { 
          $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
          $lt: startDate
        }
      }),
      Invoice.aggregate([
        {
          $match: {
            invoiceDate: { 
              $gte: new Date(startDate.getTime() - (endDate.getTime() - startDate.getTime())),
              $lt: startDate
            },
            status: { $in: ['paid', 'partial'] }
          }
        },
        { $group: { _id: null, avg: { $avg: '$totalAmount' } } }
      ])
    ]);

    const currentRevenue = totalRevenue[0]?.total || 0;
    const currentOrders = totalOrders;
    const currentCustomers = totalCustomers;
    const currentAOV = averageOrderValue[0]?.avg || 0;

    const prevRevenue = previousPeriodRevenue[0]?.total || 0;
    const prevOrders = previousPeriodOrders;
    const prevCustomers = previousPeriodCustomers;
    const prevAOV = previousPeriodAOV[0]?.avg || 0;

    // Calculate growth percentages
    const revenueGrowth = prevRevenue > 0 ? ((currentRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersGrowth = prevOrders > 0 ? ((currentOrders - prevOrders) / prevOrders) * 100 : 0;
    const customersGrowth = prevCustomers > 0 ? ((currentCustomers - prevCustomers) / prevCustomers) * 100 : 0;
    const aovGrowth = prevAOV > 0 ? ((currentAOV - prevAOV) / prevAOV) * 100 : 0;

    res.json({
      success: true,
      data: {
        totalRevenue: currentRevenue,
        totalOrders: currentOrders,
        totalCustomers: currentCustomers,
        averageOrderValue: currentAOV,
        revenueGrowth: Math.round(revenueGrowth * 100) / 100,
        ordersGrowth: Math.round(ordersGrowth * 100) / 100,
        customersGrowth: Math.round(customersGrowth * 100) / 100,
        aovGrowth: Math.round(aovGrowth * 100) / 100
      }
    });
  } catch (error) {
    console.error('Analytics overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overview metrics',
      error: error.message
    });
  }
};

// @desc    Get sales performance data
// @route   GET /api/analytics/sales-performance
// @access  Private
const getSalesPerformance = async (req, res) => {
  try {
    const { dateRange = '30d', groupBy = 'day', shop, salesperson } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    let matchStage = {
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'partial'] }
    };

    // Add shop filter if specified
    if (shop && shop !== 'all') {
      matchStage['shop'] = shop;
    }

    // Add salesperson filter if specified
    if (salesperson && salesperson !== 'all') {
      matchStage['salesperson'] = salesperson;
    }

    let groupFormat;
    switch (groupBy) {
      case 'day':
        groupFormat = '%Y-%m-%d';
        break;
      case 'week':
        groupFormat = '%Y-%W';
        break;
      case 'month':
        groupFormat = '%Y-%m';
        break;
      case 'year':
        groupFormat = '%Y';
        break;
      default:
        groupFormat = '%Y-%m-%d';
    }

    const salesData = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $dateToString: { format: groupFormat, date: '$invoiceDate' } },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Transform data for frontend
    const transformedData = salesData.map(item => ({
      date: item._id,
      sales: item.revenue,
      revenue: item.revenue,
      orders: item.orders,
      avgOrderValue: Math.round(item.avgOrderValue * 100) / 100
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Sales performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales performance data',
      error: error.message
    });
  }
};

// @desc    Get sales by shop
// @route   GET /api/analytics/sales-by-shop
// @access  Private
const getSalesByShop = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    const shopData = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: '$shop',
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          growth: { $avg: 10.4 } // This would be calculated based on previous period
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const transformedData = shopData.map((item, index) => ({
      name: item._id || 'Unknown Shop',
      value: item.revenue,
      revenue: item.revenue,
      orders: item.orders,
      growth: Math.round(item.growth * 100) / 100,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][index % 4]
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Sales by shop error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales by shop data',
      error: error.message
    });
  }
};

// @desc    Get sales by salesperson
// @route   GET /api/analytics/sales-by-salesperson
// @access  Private
const getSalesBySalesperson = async (req, res) => {
  try {
    const { dateRange = '30d', shop, salesperson } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    let matchStage = {
      invoiceDate: { $gte: startDate, $lte: endDate },
      status: { $in: ['paid', 'partial'] }
    };

    if (shop && shop !== 'all') {
      matchStage['shop'] = shop;
    }

    if (salesperson && salesperson !== 'all') {
      matchStage['salesperson'] = salesperson;
    }

    const salespersonData = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            salesperson: '$salesperson',
            shop: '$shop'
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      },
      { $sort: { revenue: -1 } }
    ]);

    const transformedData = salespersonData.map(item => ({
      shop: item._id.shop || 'Unknown Shop',
      salesperson: item._id.salesperson || 'Unknown Salesperson',
      revenue: item.revenue,
      orders: item.orders,
      avgOrderValue: Math.round(item.avgOrderValue * 100) / 100,
      growth: Math.round((Math.random() * 20 + 5) * 100) / 100 // Mock growth for now
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Sales by salesperson error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales by salesperson data',
      error: error.message
    });
  }
};

// @desc    Get product performance data
// @route   GET /api/analytics/product-performance
// @access  Private
const getProductPerformance = async (req, res) => {
  try {
    const { dateRange = '30d', groupBy = 'product', limit = 10 } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    let groupStage;
    switch (groupBy) {
      case 'category':
        groupStage = { _id: '$category' };
        break;
      case 'product':
      default:
        groupStage = { _id: '$productName' };
        break;
    }

    const productData = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['paid', 'partial'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          ...groupStage,
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } },
          units: { $sum: '$items.quantity' },
          avgPrice: { $avg: '$items.price' }
        }
      },
      { $sort: { revenue: -1 } },
      { $limit: parseInt(limit) }
    ]);

    const transformedData = productData.map(item => ({
      name: item._id || 'Unknown Product',
      revenue: item.revenue,
      units: item.units,
      avgPrice: Math.round(item.avgPrice * 100) / 100,
      growth: Math.round((Math.random() * 20 + 5) * 100) / 100 // Mock growth for now
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Product performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch product performance data',
      error: error.message
    });
  }
};

// @desc    Get customer behavior data
// @route   GET /api/analytics/customer-behavior
// @access  Private
const getCustomerBehavior = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    const customerData = await Customer.aggregate([
      {
        $lookup: {
          from: 'invoices',
          localField: '_id',
          foreignField: 'customerId',
          as: 'invoices'
        }
      },
      {
        $project: {
          name: 1,
          email: 1,
          customerType: 1,
          totalSpent: { $sum: '$invoices.totalAmount' },
          orderCount: { $size: '$invoices' },
          avgOrderValue: { $avg: '$invoices.totalAmount' }
        }
      },
      {
        $group: {
          _id: '$customerType',
          count: { $sum: 1 },
          revenue: { $sum: '$totalSpent' },
          avgValue: { $avg: '$avgOrderValue' }
        }
      }
    ]);

    const transformedData = customerData.map((item, index) => ({
      name: item._id || 'Regular Customer',
      value: item.revenue,
      segment: item._id || 'Regular Customer',
      count: item.count,
      revenue: item.revenue,
      avgValue: Math.round(item.avgValue * 100) / 100,
      color: ['#3b82f6', '#10b981', '#f59e0b'][index % 3]
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Customer behavior error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer behavior data',
      error: error.message
    });
  }
};

// @desc    Get inventory analysis data
// @route   GET /api/analytics/inventory-analysis
// @access  Private
const getInventoryAnalysis = async (req, res) => {
  try {
    const { dateRange = '30d', category } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    let matchStage = {};
    if (category && category !== 'all') {
      matchStage['category'] = category;
    }

    const [
      totalValue,
      totalItems,
      lowStockItems,
      overstockItems,
      slowMovingItems
    ] = await Promise.all([
      Product.aggregate([
        { $match: matchStage },
        { $group: { _id: null, total: { $sum: { $multiply: ['$quantity', '$price'] } } } }
      ]),
      Product.countDocuments(matchStage),
      Product.countDocuments({ ...matchStage, quantity: { $lte: '$minimumStock' } }),
      Product.countDocuments({ ...matchStage, quantity: { $gte: { $multiply: ['$maximumStock', 0.9] } } }),
      Product.countDocuments({ 
        ...matchStage, 
        lastSoldDate: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // 60 days ago
      })
    ]);

    res.json({
      success: true,
      data: {
        totalValue: totalValue[0]?.total || 0,
        totalItems: totalItems,
        avgTurnover: 3.2, // This would be calculated based on actual turnover
        lowStockItems: lowStockItems,
        overstockItems: overstockItems,
        slowMovingItems: slowMovingItems,
        totalValueGrowth: 5.2, // This would be calculated based on previous period
        turnoverGrowth: 8.1,
        efficiencyScore: 78
      }
    });
  } catch (error) {
    console.error('Inventory analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch inventory analysis data',
      error: error.message
    });
  }
};

// @desc    Get stock levels data
// @route   GET /api/analytics/stock-levels
// @access  Private
const getStockLevels = async (req, res) => {
  try {
    const { dateRange = '30d', category } = req.query;

    let matchStage = {};
    if (category && category !== 'all') {
      matchStage['category'] = category;
    }

    const stockData = await Product.find(matchStage)
      .select('name category quantity minimumStock maximumStock price')
      .limit(50);

    const transformedData = stockData.map(product => ({
      product: product.name,
      category: product.category,
      currentStock: product.quantity,
      minStock: product.minimumStock,
      maxStock: product.maximumStock,
      value: product.quantity * product.price,
      turnover: Math.round((Math.random() * 5 + 1) * 100) / 100 // Mock turnover for now
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Stock levels error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock levels data',
      error: error.message
    });
  }
};

// @desc    Get slow moving items
// @route   GET /api/analytics/slow-moving-items
// @access  Private
const getSlowMovingItems = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    const slowMovingData = await Product.find({
      lastSoldDate: { $lt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) } // 60 days ago
    })
      .select('name category quantity price lastSoldDate')
      .limit(20);

    const transformedData = slowMovingData.map(product => ({
      product: product.name,
      category: product.category,
      daysInStock: Math.floor((Date.now() - new Date(product.lastSoldDate).getTime()) / (1000 * 60 * 60 * 24)),
      lastSale: product.lastSoldDate,
      value: product.quantity * product.price,
      recommendation: 'Discount 20%' // This would be calculated based on business rules
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Slow moving items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch slow moving items data',
      error: error.message
    });
  }
};

// @desc    Get stock movement data
// @route   GET /api/analytics/stock-movement
// @access  Private
const getStockMovement = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    const movementData = await StockMovement.aggregate([
      {
        $match: {
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          incoming: { 
            $sum: { 
              $cond: [{ $eq: ['$type', 'in'] }, '$quantity', 0] 
            } 
          },
          outgoing: { 
            $sum: { 
              $cond: [{ $eq: ['$type', 'out'] }, '$quantity', 0] 
            } 
          }
        }
      },
      {
        $addFields: {
          netChange: { $subtract: ['$incoming', '$outgoing'] }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const transformedData = movementData.map(item => ({
      date: item._id,
      incoming: item.incoming,
      outgoing: item.outgoing,
      netChange: item.netChange
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Stock movement error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock movement data',
      error: error.message
    });
  }
};

// @desc    Get turnover rates
// @route   GET /api/analytics/turnover-rates
// @access  Private
const getTurnoverRates = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;

    const turnoverData = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } },
          totalItems: { $sum: 1 },
          avgTurnover: { $avg: 3.5 } // This would be calculated based on actual sales
        }
      }
    ]);

    const transformedData = turnoverData.map((item, index) => ({
      name: item._id || 'Uncategorized',
      turnover: Math.round(item.avgTurnover * 100) / 100,
      value: item.totalValue,
      items: item.totalItems,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Turnover rates error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch turnover rates data',
      error: error.message
    });
  }
};

// @desc    Get lead time analysis
// @route   GET /api/analytics/lead-time-analysis
// @access  Private
const getLeadTimeAnalysis = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;

    const leadTimeData = await Supplier.aggregate([
      {
        $lookup: {
          from: 'purchaseorders',
          localField: '_id',
          foreignField: 'supplierId',
          as: 'orders'
        }
      },
      {
        $project: {
          name: 1,
          avgLeadTime: { $avg: '$orders.leadTime' },
          totalCost: { $sum: '$orders.totalAmount' },
          orderCount: { $size: '$orders' }
        }
      },
      {
        $addFields: {
          reliability: { $subtract: [100, { $multiply: [{ $rand: {} }, 25] }] } // Mock reliability
        }
      }
    ]);

    const transformedData = leadTimeData.map((item, index) => ({
      supplier: item.name,
      avgLeadTime: Math.round(item.avgLeadTime || 14),
      reliability: Math.round(item.reliability),
      cost: item.totalCost || 0,
      color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Lead time analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch lead time analysis data',
      error: error.message
    });
  }
};

// @desc    Get workshop performance data
// @route   GET /api/analytics/workshop-performance
// @access  Private
const getWorkshopPerformance = async (req, res) => {
  try {
    const { dateRange = '30d', groupBy = 'month', technician, jobType } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    let matchStage = {
      startDate: { $gte: startDate, $lte: endDate }
    };

    if (technician && technician !== 'all') {
      matchStage['assignedTechnician'] = technician;
    }

    if (jobType && jobType !== 'all') {
      matchStage['jobType'] = jobType;
    }

    let groupStage;
    switch (groupBy) {
      case 'month':
        groupStage = {
          _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } }
        };
        break;
      case 'jobType':
        groupStage = { _id: '$jobType' };
        break;
      default:
        groupStage = {
          _id: { $dateToString: { format: '%Y-%m', date: '$startDate' } }
        };
    }

    const workshopData = await WorkshopJob.aggregate([
      { $match: matchStage },
      {
        $group: {
          ...groupStage,
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          totalJobs: { $sum: 1 },
          totalHours: { $sum: '$estimatedHours' },
          totalRevenue: { $sum: '$estimatedCost' },
          avgEfficiency: { $avg: 115 } // Mock efficiency for now
        }
      }
    ]);

    const transformedData = workshopData.map(item => {
      if (groupBy === 'month') {
        return {
          date: item._id,
          sales: item.completedJobs,
          orders: item.completedJobs,
          completedJobs: item.completedJobs,
          totalHours: item.totalHours,
          efficiency: Math.round(item.avgEfficiency),
          revenue: item.totalRevenue
        };
      } else {
        return {
          name: item._id,
          value: item.completedJobs,
          type: item._id,
          count: item.completedJobs,
          avgDuration: 2.5, // Mock duration
          efficiency: Math.round(item.avgEfficiency),
          revenue: item.totalRevenue,
          color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][Math.floor(Math.random() * 4)]
        };
      }
    });

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Workshop performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch workshop performance data',
      error: error.message
    });
  }
};

// @desc    Get job completion data
// @route   GET /api/analytics/job-completion
// @access  Private
const getJobCompletion = async (req, res) => {
  try {
    const { dateRange = '30d', technician, jobType } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    let matchStage = {
      startDate: { $gte: startDate, $lte: endDate }
    };

    if (technician && technician !== 'all') {
      matchStage['assignedTechnician'] = technician;
    }

    if (jobType && jobType !== 'all') {
      matchStage['jobType'] = jobType;
    }

    const jobData = await WorkshopJob.find(matchStage)
      .populate('customerId', 'name')
      .populate('assignedTechnician', 'name')
      .select('jobId customerId assignedTechnician jobType status startDate endDate estimatedHours actualHours estimatedCost')
      .limit(50)
      .sort({ startDate: -1 });

    const transformedData = jobData.map(job => {
      const duration = job.endDate 
        ? Math.ceil((new Date(job.endDate) - new Date(job.startDate)) / (1000 * 60 * 60 * 24))
        : Math.ceil((Date.now() - new Date(job.startDate)) / (1000 * 60 * 60 * 24));

      const efficiency = job.actualHours && job.estimatedHours
        ? Math.round((job.estimatedHours / job.actualHours) * 100)
        : 0;

      return {
        jobId: job.jobId,
        customer: job.customerId?.name || 'Unknown Customer',
        technician: job.assignedTechnician?.name || 'Unassigned',
        type: job.jobType,
        status: job.status,
        startDate: job.startDate,
        endDate: job.endDate,
        duration: duration,
        estimatedHours: job.estimatedHours,
        actualHours: job.actualHours,
        efficiency: efficiency,
        revenue: job.estimatedCost
      };
    });

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Job completion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch job completion data',
      error: error.message
    });
  }
};

// @desc    Get technician performance data
// @route   GET /api/analytics/technician-performance
// @access  Private
const getTechnicianPerformance = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;
    const { startDate, endDate } = getDateRange(dateRange);

    const technicianData = await Technician.aggregate([
      {
        $lookup: {
          from: 'workshopjobs',
          localField: '_id',
          foreignField: 'assignedTechnician',
          as: 'jobs',
          pipeline: [
            {
              $match: {
                startDate: { $gte: startDate, $lte: endDate }
              }
            }
          ]
        }
      },
      {
        $project: {
          name: 1,
          completedJobs: {
            $size: {
              $filter: {
                input: '$jobs',
                cond: { $eq: ['$$this.status', 'completed'] }
              }
            }
          },
          totalJobs: { $size: '$jobs' },
          totalHours: { $sum: '$jobs.estimatedHours' },
          totalRevenue: { $sum: '$jobs.estimatedCost' },
          avgJobTime: { $avg: '$jobs.estimatedHours' }
        }
      },
      {
        $addFields: {
          efficiency: { $subtract: [115, { $multiply: [{ $rand: {} }, 20] }] }, // Mock efficiency
          customerRating: { $add: [4.0, { $multiply: [{ $rand: {} }, 1] }] } // Mock rating
        }
      }
    ]);

    const transformedData = technicianData.map(tech => ({
      technician: tech.name,
      completedJobs: tech.completedJobs,
      totalHours: tech.totalHours,
      efficiency: Math.round(tech.efficiency),
      revenue: tech.totalRevenue,
      avgJobTime: Math.round(tech.avgJobTime * 100) / 100,
      customerRating: Math.round(tech.customerRating * 100) / 100
    }));

    res.json({
      success: true,
      data: transformedData
    });
  } catch (error) {
    console.error('Technician performance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch technician performance data',
      error: error.message
    });
  }
};

// @desc    Get resource utilization data
// @route   GET /api/analytics/resource-utilization
// @access  Private
const getResourceUtilization = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;

    // Mock data for now - in real implementation, this would query actual resource usage
    const resourceData = [
      {
        resource: 'Technician Hours',
        utilized: 328,
        available: 400,
        utilization: 82,
        color: '#3b82f6'
      },
      {
        resource: 'Equipment Usage',
        utilized: 245,
        available: 300,
        utilization: 82,
        color: '#10b981'
      },
      {
        resource: 'Workshop Space',
        utilized: 180,
        available: 200,
        utilization: 90,
        color: '#f59e0b'
      },
      {
        resource: 'Tools & Materials',
        utilized: 195,
        available: 250,
        utilization: 78,
        color: '#ef4444'
      }
    ];

    res.json({
      success: true,
      data: resourceData
    });
  } catch (error) {
    console.error('Resource utilization error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch resource utilization data',
      error: error.message
    });
  }
};

// @desc    Get customer satisfaction data
// @route   GET /api/analytics/customer-satisfaction
// @access  Private
const getCustomerSatisfaction = async (req, res) => {
  try {
    const { dateRange = '30d' } = req.query;

    // Mock data for now - in real implementation, this would query actual customer feedback
    const satisfactionData = [
      { rating: 5, count: 45, percentage: 60, color: '#10b981' },
      { rating: 4, count: 20, percentage: 27, color: '#3b82f6' },
      { rating: 3, count: 7, percentage: 9, color: '#f59e0b' },
      { rating: 2, count: 2, percentage: 3, color: '#ef4444' },
      { rating: 1, count: 1, percentage: 1, color: '#dc2626' }
    ];

    res.json({
      success: true,
      data: satisfactionData
    });
  } catch (error) {
    console.error('Customer satisfaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch customer satisfaction data',
      error: error.message
    });
  }
};

// @desc    Export analytics data
// @route   GET /api/analytics/export/:type/:format
// @access  Private
const exportAnalytics = async (req, res) => {
  try {
    const { type, format } = req.params;
    const { dateRange = '30d', ...filters } = req.query;

    // This would implement actual export functionality
    res.json({
      success: true,
      message: `Export functionality for ${type} in ${format} format will be implemented`,
      data: {
        type,
        format,
        filters,
        dateRange
      }
    });
  } catch (error) {
    console.error('Export analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export analytics data',
      error: error.message
    });
  }
};

module.exports = {
  getOverviewMetrics,
  getSalesPerformance,
  getSalesByShop,
  getSalesBySalesperson,
  getProductPerformance,
  getCustomerBehavior,
  getInventoryAnalysis,
  getStockLevels,
  getSlowMovingItems,
  getStockMovement,
  getTurnoverRates,
  getLeadTimeAnalysis,
  getWorkshopPerformance,
  getJobCompletion,
  getTechnicianPerformance,
  getResourceUtilization,
  getCustomerSatisfaction,
  exportAnalytics
};
