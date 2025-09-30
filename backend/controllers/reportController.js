const Invoice = require('../models/Invoice');
// const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Supplier = require('../models/Supplier');
// const Account = require('../models/Account');
// Projects/Tasks removed
const Support = require('../models/Support');
// HRM module removed

// @desc    Get sales report
// @route   GET /api/reports/sales
// @access  Private
const getSalesReport = async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate || new Date();
    const groupBy = req.query.groupBy || 'day'; // day, week, month, year

    const matchStage = {
      invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: { $in: ['paid', 'partial', 'pending', 'overdue'] } // Include pending and overdue invoices
    };

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
          totalSales: { $sum: '$total' },
          totalInvoices: { $sum: 1 },
          averageInvoice: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top products by quantity sold in the period
    const topProducts = await Invoice.aggregate([
      { $match: matchStage },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          name: { $ifNull: ['$productInfo.name', 'Unknown'] },
          sku: '$productInfo.sku',
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    const customerStats = await Invoice.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$customer',
          totalSpent: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'customers',
          localField: '_id',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      { $unwind: '$customerInfo' },
      {
        $project: {
          customerName: { $concat: ['$customerInfo.firstName', ' ', '$customerInfo.lastName'] },
          totalSpent: 1,
          invoiceCount: 1
        }
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 10 }
    ]);

    const totalSales = salesData.reduce((sum, item) => sum + item.totalSales, 0);
    const totalInvoices = salesData.reduce((sum, item) => sum + item.totalInvoices, 0);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalSales,
          totalInvoices,
          averageInvoice: totalInvoices > 0 ? totalSales / totalInvoices : 0
        },
        salesData,
        salesTrend: salesData,
        topCustomers: customerStats,
        topProducts
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

// @desc    Get purchase report
// @route   GET /api/reports/purchases
// @access  Private
const getPurchaseReport = async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate || new Date();

    const purchaseTransactions = await Transaction.find({
      type: 'purchase',
      date: { $gte: new Date(startDate), $lte: new Date(endDate) },
      status: 'posted'
    })
    .populate('supplier', 'name')
    .populate('entries.account', 'name code')
    .sort({ date: -1 });

    const supplierStats = await Transaction.aggregate([
      {
        $match: {
          type: 'purchase',
          date: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: 'posted'
        }
      },
      {
        $group: {
          _id: '$supplier',
          totalPurchases: { $sum: '$amount' },
          transactionCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: '_id',
          foreignField: '_id',
          as: 'supplierInfo'
        }
      },
      { $unwind: '$supplierInfo' },
      {
        $project: {
          supplierName: '$supplierInfo.name',
          totalPurchases: 1,
          transactionCount: 1
        }
      },
      { $sort: { totalPurchases: -1 } }
    ]);

    const totalPurchases = purchaseTransactions.reduce((sum, t) => sum + t.amount, 0);

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: {
          totalPurchases,
          transactionCount: purchaseTransactions.length
        },
        transactions: purchaseTransactions,
        supplierStats
      }
    });
  } catch (error) {
    console.error('Get purchase report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get profit and loss report
// @route   GET /api/reports/profit-loss
// @access  Private
const getProfitLossReport = async (req, res) => {
  try {
    const startDate = req.query.startDate || new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = req.query.endDate || new Date();

    // Get revenue from sales
    const revenueData = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: { $in: ['paid', 'partial'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$total' }
        }
      }
    ]);

    // Get expenses
    const expenseData = await Transaction.aggregate([
      {
        $match: {
          type: 'expense',
          date: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: 'posted'
        }
      },
      {
        $group: {
          _id: null,
          totalExpenses: { $sum: '$amount' }
        }
      }
    ]);

    // Get cost of goods sold (COGS)
    const cogsData = await Transaction.aggregate([
      {
        $match: {
          type: 'purchase',
          date: { $gte: new Date(startDate), $lte: new Date(endDate) },
          status: 'posted'
        }
      },
      {
        $group: {
          _id: null,
          totalCOGS: { $sum: '$amount' }
        }
      }
    ]);

    const totalRevenue = revenueData[0]?.totalRevenue || 0;
    const totalExpenses = expenseData[0]?.totalExpenses || 0;
    const totalCOGS = cogsData[0]?.totalCOGS || 0;
    const grossProfit = totalRevenue - totalCOGS;
    const netProfit = grossProfit - totalExpenses;

    res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        revenue: {
          total: totalRevenue
        },
        cogs: {
          total: totalCOGS
        },
        grossProfit,
        expenses: {
          total: totalExpenses
        },
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0
      }
    });
  } catch (error) {
    console.error('Get profit loss report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get balance sheet report
// @route   GET /api/reports/balance-sheet
// @access  Private
const getBalanceSheetReport = async (req, res) => {
  try {
    const asOfDate = req.query.asOfDate || new Date();

    // Get assets
    const assets = await Account.aggregate([
      {
        $match: { type: 'asset', isActive: true }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { accountId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$accountId', '$entries.account'] },
                date: { $lte: new Date(asOfDate) },
                status: 'posted'
              }
            },
            {
              $unwind: '$entries'
            },
            {
              $match: {
                $expr: { $eq: ['$entries.account', '$$accountId'] }
              }
            },
            {
              $group: {
                _id: null,
                balance: { $sum: { $subtract: ['$entries.debit', '$entries.credit'] } }
              }
            }
          ],
          as: 'transactions'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          category: 1,
          balance: { $ifNull: [{ $arrayElemAt: ['$transactions.balance', 0] }, 0] }
        }
      },
      {
        $group: {
          _id: '$category',
          accounts: { $push: '$$ROOT' },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    // Get liabilities
    const liabilities = await Account.aggregate([
      {
        $match: { type: 'liability', isActive: true }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { accountId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$accountId', '$entries.account'] },
                date: { $lte: new Date(asOfDate) },
                status: 'posted'
              }
            },
            {
              $unwind: '$entries'
            },
            {
              $match: {
                $expr: { $eq: ['$entries.account', '$$accountId'] }
              }
            },
            {
              $group: {
                _id: null,
                balance: { $sum: { $subtract: ['$entries.credit', '$entries.debit'] } }
              }
            }
          ],
          as: 'transactions'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          category: 1,
          balance: { $ifNull: [{ $arrayElemAt: ['$transactions.balance', 0] }, 0] }
        }
      },
      {
        $group: {
          _id: '$category',
          accounts: { $push: '$$ROOT' },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    // Get equity
    const equity = await Account.aggregate([
      {
        $match: { type: 'equity', isActive: true }
      },
      {
        $lookup: {
          from: 'transactions',
          let: { accountId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: { $in: ['$$accountId', '$entries.account'] },
                date: { $lte: new Date(asOfDate) },
                status: 'posted'
              }
            },
            {
              $unwind: '$entries'
            },
            {
              $match: {
                $expr: { $eq: ['$entries.account', '$$accountId'] }
              }
            },
            {
              $group: {
                _id: null,
                balance: { $sum: { $subtract: ['$entries.credit', '$entries.debit'] } }
              }
            }
          ],
          as: 'transactions'
        }
      },
      {
        $project: {
          name: 1,
          code: 1,
          category: 1,
          balance: { $ifNull: [{ $arrayElemAt: ['$transactions.balance', 0] }, 0] }
        }
      },
      {
        $group: {
          _id: '$category',
          accounts: { $push: '$$ROOT' },
          totalBalance: { $sum: '$balance' }
        }
      }
    ]);

    const totalAssets = assets.reduce((sum, item) => sum + item.totalBalance, 0);
    const totalLiabilities = liabilities.reduce((sum, item) => sum + item.totalBalance, 0);
    const totalEquity = equity.reduce((sum, item) => sum + item.totalBalance, 0);

    res.json({
      success: true,
      data: {
        asOfDate,
        assets: {
          categories: assets,
          total: totalAssets
        },
        liabilities: {
          categories: liabilities,
          total: totalLiabilities
        },
        equity: {
          categories: equity,
          total: totalEquity
        },
        balance: totalAssets - (totalLiabilities + totalEquity)
      }
    });
  } catch (error) {
    console.error('Get balance sheet report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get inventory report
// @route   GET /api/reports/inventory
// @access  Private
const getInventoryReport = async (req, res) => {
  try {
    const lowStockThreshold = req.query.lowStockThreshold || 10;
    const category = req.query.category || '';

    const filter = { isActive: true };
    if (category) filter.category = category;

    const products = await Product.find(filter)
      .populate('category', 'name');

    const lowStockProducts = products.filter(p => p.inventory.currentStock <= lowStockThreshold);
    const outOfStockProducts = products.filter(p => p.inventory.currentStock === 0);

    const totalInventoryValue = products.reduce((sum, product) => {
      return sum + (product.inventory.currentStock * product.pricing.costPrice);
    }, 0);

    const categoryStats = products.reduce((acc, product) => {
      const catName = product.category?.name || 'Uncategorized';
      if (!acc[catName]) {
        acc[catName] = {
          count: 0,
          value: 0,
          lowStock: 0,
          outOfStock: 0
        };
      }
      acc[catName].count++;
      acc[catName].value += product.inventory.currentStock * product.pricing.costPrice;
      if (product.inventory.currentStock <= lowStockThreshold) acc[catName].lowStock++;
      if (product.inventory.currentStock === 0) acc[catName].outOfStock++;
      return acc;
    }, {});

    res.json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalInventoryValue,
          lowStockProducts: lowStockProducts.length,
          outOfStockProducts: outOfStockProducts.length
        },
        lowStockProducts,
        outOfStockProducts,
        categoryStats
      }
    });
  } catch (error) {
    console.error('Get inventory report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get project report
// @route   GET /api/reports/projects
// @access  Private
const getProjectReport = async (req, res) => {
  try {
    const status = req.query.status || '';

    const filter = { isActive: true };
    if (status) filter.status = status;

    const projects = await Project.find(filter)
      .populate('customer', 'firstName lastName')
      .populate('projectManager', 'firstName lastName')
      .populate('team.user', 'firstName lastName');

    const projectStats = await Project.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalBudget: { $sum: '$budget.estimated' },
          averageProgress: { $avg: '$progress.percentage' }
        }
      }
    ]);

    const overBudgetProjects = projects.filter(p => 
      p.budget.actual > p.budget.estimated && p.budget.estimated > 0
    );

    const overdueProjects = projects.filter(p => 
      p.timeline.endDate < new Date() && p.status !== 'completed'
    );

    res.json({
      success: true,
      data: {
        summary: {
          totalProjects: projects.length,
          overBudgetProjects: overBudgetProjects.length,
          overdueProjects: overdueProjects.length
        },
        projectStats,
        projects,
        overBudgetProjects,
        overdueProjects
      }
    });
  } catch (error) {
    console.error('Get project report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get dashboard statistics
// @route   GET /api/reports/dashboard
// @access  Private
const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Sales statistics
    const monthlySales = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: thisMonth },
          status: { $in: ['paid', 'partial', 'pending', 'overdue'] } // Include pending and overdue
        }
      },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$total' },
          invoiceCount: { $sum: 1 }
        }
      }
    ]);

    // Customer statistics
    const totalCustomers = await Customer.countDocuments({ isActive: true });
    const newCustomersThisMonth = await Customer.countDocuments({
      isActive: true,
      createdAt: { $gte: thisMonth }
    });

    // Product statistics
    const totalProducts = await Product.countDocuments({ isActive: true });
    const lowStockProducts = await Product.countDocuments({
      isActive: true,
      $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] }
    });

    // Project statistics removed

    // Support statistics
    const openTickets = await Support.countDocuments({
      isActive: true,
      status: { $in: ['open', 'in_progress'] }
    });
    const overdueTickets = await Support.getOverdueTickets();

    // Employee statistics removed with HRM module

    // Sales trend data for the last 30 days
    const salesTrend = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: { $in: ['paid', 'partial', 'pending', 'overdue'] } // Include pending and overdue
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$invoiceDate' } },
          totalSales: { $sum: '$total' },
          totalInvoices: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Top products by quantity sold in the last 30 days
    const topProducts = await Invoice.aggregate([
      {
        $match: {
          invoiceDate: { $gte: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
          status: { $in: ['paid', 'partial', 'pending', 'overdue'] } // Include pending and overdue
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.total' }
        }
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'productInfo'
        }
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          productId: '$_id',
          name: { $ifNull: ['$productInfo.name', 'Unknown'] },
          sku: '$productInfo.sku',
          totalQuantity: 1,
          totalRevenue: 1
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        sales: {
          monthlyTotal: monthlySales[0]?.totalSales || 0,
          monthlyInvoices: monthlySales[0]?.invoiceCount || 0
        },
        customers: {
          total: totalCustomers,
          newThisMonth: newCustomersThisMonth
        },
        products: {
          total: totalProducts,
          lowStock: lowStockProducts
        },
        support: {
          openTickets,
          overdueTickets: overdueTickets.length
        },
        salesTrend,
        topProducts
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Save a report to database
// @route   POST /api/reports/save
// @access  Private
const saveReport = async (req, res) => {
  try {
    const Report = require('../models/Report');
    const { name, type, description, dateRange, filters, data, summary } = req.body;

    const report = await Report.create({
      name,
      type,
      description,
      dateRange,
      filters,
      data,
      summary,
      generatedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Save report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get all saved reports
// @route   GET /api/reports/saved
// @access  Private
const getSavedReports = async (req, res) => {
  try {
    const Report = require('../models/Report');
    const { type, status, page = 1, limit = 10 } = req.query;

    const filter = { isActive: true };
    if (type) filter.type = type;
    if (status) filter.status = status;

    const reports = await Report.find(filter)
      .populate('generatedBy', 'firstName lastName email')
      .sort({ generatedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Report.countDocuments(filter);

    res.json({
      success: true,
      data: {
        reports,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        total
      }
    });
  } catch (error) {
    console.error('Get saved reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Get a single saved report
// @route   GET /api/reports/saved/:id
// @access  Private
const getSavedReportById = async (req, res) => {
  try {
    const Report = require('../models/Report');
    const report = await Report.findById(req.params.id)
      .populate('generatedBy', 'firstName lastName email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    console.error('Get saved report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// @desc    Delete a saved report
// @route   DELETE /api/reports/saved/:id
// @access  Private
const deleteSavedReport = async (req, res) => {
  try {
    const Report = require('../models/Report');
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    report.isActive = false;
    await report.save();

    res.json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete saved report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  getSalesReport,
  getPurchaseReport,
  getProfitLossReport,
  getBalanceSheetReport,
  getInventoryReport,
  getProjectReport,
  getDashboardStats,
  saveReport,
  getSavedReports,
  getSavedReportById,
  deleteSavedReport
};
