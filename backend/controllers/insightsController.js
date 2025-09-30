const Invoice = require('../models/Invoice');
const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Support = require('../models/Support');
const WorkshopJob = require('../models/WorkshopJob');

// Helpers
const parseDate = (value, fallback) => {
  if (!value) return fallback;
  const d = new Date(value);
  return isNaN(d.getTime()) ? fallback : d;
};

// GET /api/insights/overview
// Combines dashboard stats (reports) + analytics overview metrics
const getInsightsOverview = async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Reports-style dashboard stats
    const [monthlySalesAgg, totalCustomers, newCustomersThisMonth, totalProducts, lowStockProducts, openTickets, overdueTickets] = await Promise.all([
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: thisMonth }, status: { $in: ['paid', 'partial', 'pending', 'overdue'] } } },
        { $group: { _id: null, totalSales: { $sum: '$total' }, invoiceCount: { $sum: 1 } } }
      ]),
      Customer.countDocuments({ isActive: true }),
      Customer.countDocuments({ isActive: true, createdAt: { $gte: thisMonth } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, $expr: { $lte: ['$inventory.currentStock', '$inventory.minStock'] } }),
      Support.countDocuments({ isActive: true, status: { $in: ['open', 'in_progress'] } }),
      (async () => { try { const v = await Support.getOverdueTickets(); return Array.isArray(v) ? v.length : 0; } catch { return 0; } })()
    ]);

    const dashboard = {
      sales: {
        monthlyTotal: monthlySalesAgg[0]?.totalSales || 0,
        monthlyInvoices: monthlySalesAgg[0]?.invoiceCount || 0,
      },
      customers: { total: totalCustomers, newThisMonth: newCustomersThisMonth },
      products: { total: totalProducts, lowStock: lowStockProducts },
      support: { openTickets, overdueTickets }
    };

    // Analytics overview-style metrics for same period (last 30 days)
    const startDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const endDate = today;

    const [totalRevenueAgg, totalOrders, avgOrderValueAgg] = await Promise.all([
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startDate, $lte: endDate }, status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: '$total' } } }
      ]),
      Invoice.countDocuments({ invoiceDate: { $gte: startDate, $lte: endDate }, status: { $in: ['paid', 'partial'] } }),
      Invoice.aggregate([
        { $match: { invoiceDate: { $gte: startDate, $lte: endDate }, status: { $in: ['paid', 'partial'] } } },
        { $group: { _id: null, avg: { $avg: '$total' } } }
      ])
    ]);

    const analyticsOverview = {
      totalRevenue: totalRevenueAgg[0]?.total || 0,
      totalOrders,
      averageOrderValue: avgOrderValueAgg[0]?.avg || 0,
    };

    return res.json({ success: true, data: { dashboard, analyticsOverview } });
  } catch (error) {
    console.error('Insights overview error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/insights/sales
// Merges sales report (period summary/trend/top) + analytics time-series
const getInsightsSales = async (req, res) => {
  try {
    const startDate = parseDate(req.query.startDate, new Date(new Date().setMonth(new Date().getMonth() - 1)));
    const endDate = parseDate(req.query.endDate, new Date());
    const groupBy = req.query.groupBy || 'day';

    let groupFormat;
    switch (groupBy) {
      case 'week': groupFormat = '%Y-%W'; break;
      case 'month': groupFormat = '%Y-%m'; break;
      case 'year': groupFormat = '%Y'; break;
      default: groupFormat = '%Y-%m-%d';
    }

    const matchStageAll = { invoiceDate: { $gte: startDate, $lte: endDate }, status: { $in: ['paid', 'partial', 'pending', 'overdue'] } };
    const matchStagePaid = { invoiceDate: { $gte: startDate, $lte: endDate }, status: { $in: ['paid', 'partial'] } };

    const [salesBuckets, topProducts, topCustomers] = await Promise.all([
      Invoice.aggregate([
        { $match: matchStageAll },
        { $group: { _id: { $dateToString: { format: groupFormat, date: '$invoiceDate' } }, totalSales: { $sum: '$total' }, totalInvoices: { $sum: 1 }, averageInvoice: { $avg: '$total' } } },
        { $sort: { _id: 1 } }
      ]),
      Invoice.aggregate([
        { $match: matchStageAll },
        { $unwind: '$items' },
        { $group: { _id: '$items.product', totalQuantity: { $sum: '$items.quantity' }, totalRevenue: { $sum: '$items.total' } } },
        { $sort: { totalQuantity: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'productInfo' } },
        { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
        { $project: { productId: '$_id', name: { $ifNull: ['$productInfo.name', 'Unknown'] }, sku: '$productInfo.sku', totalQuantity: 1, totalRevenue: 1 } }
      ]),
      Invoice.aggregate([
        { $match: matchStageAll },
        { $group: { _id: '$customer', totalSpent: { $sum: '$total' }, invoiceCount: { $sum: 1 } } },
        { $lookup: { from: 'customers', localField: '_id', foreignField: '_id', as: 'customerInfo' } },
        { $unwind: '$customerInfo' },
        { $project: { customerName: { $concat: ['$customerInfo.firstName', ' ', '$customerInfo.lastName'] }, totalSpent: 1, invoiceCount: 1 } },
        { $sort: { totalSpent: -1 } },
        { $limit: 10 }
      ])
    ]);

    const totalSales = salesBuckets.reduce((s, b) => s + (b.totalSales || 0), 0);
    const totalInvoices = salesBuckets.reduce((s, b) => s + (b.totalInvoices || 0), 0);

    // Analytics-style series (paid/partial only)
    const analyticsSeries = await Invoice.aggregate([
      { $match: matchStagePaid },
      { $group: { _id: { $dateToString: { format: groupFormat, date: '$invoiceDate' } }, revenue: { $sum: '$total' }, orders: { $sum: 1 }, avgOrderValue: { $avg: '$total' } } },
      { $sort: { _id: 1 } }
    ]);

    return res.json({
      success: true,
      data: {
        period: { startDate, endDate },
        summary: { totalSales, totalInvoices, averageInvoice: totalInvoices > 0 ? totalSales / totalInvoices : 0 },
        salesTrend: salesBuckets,
        analyticsSeries: analyticsSeries.map(i => ({ date: i._id, revenue: i.revenue, orders: i.orders, avgOrderValue: i.avgOrderValue })),
        topProducts,
        topCustomers
      }
    });
  } catch (error) {
    console.error('Insights sales error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/insights/inventory
// Merges inventory report + analytics inventory KPIs
const getInsightsInventory = async (req, res) => {
  try {
    const lowStockThreshold = Number(req.query.lowStockThreshold || 10);
    const category = req.query.category || '';
    const filter = { isActive: true };
    // Ignore non-specific category filters like 'all'
    if (category && category !== 'all') filter.category = category;

    const products = await Product.find(filter).populate('category', 'name');
    const lowStockProducts = products.filter(p => p.inventory?.currentStock <= lowStockThreshold);
    const outOfStockProducts = products.filter(p => (p.inventory?.currentStock || 0) === 0);
    const totalInventoryValue = products.reduce((sum, product) => sum + ((product.inventory?.currentStock || 0) * (product.pricing?.costPrice || 0)), 0);

    const categoryStats = products.reduce((acc, product) => {
      const catName = product.category?.name || 'Uncategorized';
      if (!acc[catName]) acc[catName] = { count: 0, value: 0, lowStock: 0, outOfStock: 0 };
      acc[catName].count += 1;
      acc[catName].value += (product.inventory?.currentStock || 0) * (product.pricing?.costPrice || 0);
      if ((product.inventory?.currentStock || 0) <= lowStockThreshold) acc[catName].lowStock += 1;
      if ((product.inventory?.currentStock || 0) === 0) acc[catName].outOfStock += 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalInventoryValue,
          lowStockProducts: lowStockProducts.length,
          outOfStockProducts: outOfStockProducts.length
        },
        categoryStats,
        lowStockProducts,
        outOfStockProducts
      }
    });
  } catch (error) {
    console.error('Insights inventory error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/insights/workshop
// Workshop performance: completion, efficiency, utilization, delays, satisfaction
const getInsightsWorkshop = async (req, res) => {
  try {
    const startDate = parseDate(req.query.startDate, new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000));
    const endDate = parseDate(req.query.endDate, new Date());
    const technician = req.query.technician;

    const match = { createdAt: { $gte: startDate, $lte: endDate } };
    if (technician && technician !== 'all') {
      match['resources.assignedTechnicians.name'] = technician;
    }

    const jobs = await WorkshopJob.find(match)
      .select('status createdAt scheduled jobCard tasks parts customerPortal resources')
      .limit(1000);

    const totalJobs = jobs.length;
    const completedJobs = jobs.filter(j => j.status === 'completed').length;
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    // Efficiency based on estimated vs actual durations (minutes)
    const aggregateDurations = (job) => {
      const est = (job.scheduled?.estimatedDuration || 0) + job.tasks.reduce((s, t) => s + (t.estimatedDuration || 0), 0);
      const act = (job.scheduled?.actualDuration || 0) + job.tasks.reduce((s, t) => s + (t.actualDuration || 0), 0);
      return { est, act };
    };
    let totalEst = 0; let totalAct = 0;
    for (const j of jobs) { const d = aggregateDurations(j); totalEst += d.est; totalAct += d.act; }
    const avgEfficiency = totalAct > 0 ? Math.round((totalEst / totalAct) * 100) : 0;

    // Delays: actual completion beyond scheduled.end
    const delays = jobs.filter(j => j.customerPortal?.actualCompletion && j.scheduled?.end && (new Date(j.customerPortal.actualCompletion) > new Date(j.scheduled.end))).length;

    // Revenue proxy from job card actual/estimated cost
    const totalRevenue = jobs.reduce((s, j) => s + (j.jobCard?.actualCost || j.jobCard?.estimatedCost || 0), 0);

    // Issues: parts shortages + failed QC
    const issuesCount = jobs.reduce((s, j) => {
      const partShortages = (j.parts || []).filter(p => p.status === 'shortage').length;
      const failedQC = (j.tasks || []).filter(t => t.qualityCheck?.checked && t.qualityCheck?.passed === false).length;
      return s + partShortages + failedQC;
    }, 0);

    // Monthly trend
    const monthlyMap = new Map();
    for (const j of jobs) {
      const key = `${j.createdAt.getFullYear()}-${String(j.createdAt.getMonth() + 1).padStart(2, '0')}`;
      const cur = monthlyMap.get(key) || { date: key, total: 0, completed: 0 };
      cur.total += 1; if (j.status === 'completed') cur.completed += 1; monthlyMap.set(key, cur);
    }
    const monthly = Array.from(monthlyMap.values()).sort((a,b) => a.date.localeCompare(b.date));

    // Job type distribution not available in schema; map by status as a proxy
    const byType = [
      { name: 'Completed', value: completedJobs, color: '#22c55e' },
      { name: 'In Progress', value: jobs.filter(j => j.status === 'in_progress').length, color: '#3b82f6' },
      { name: 'Scheduled', value: jobs.filter(j => j.status === 'scheduled').length, color: '#a855f7' },
      { name: 'On Hold', value: jobs.filter(j => j.status === 'on_hold').length, color: '#f59e0b' },
      { name: 'Cancelled', value: jobs.filter(j => j.status === 'cancelled').length, color: '#ef4444' }
    ];

    // Resource utilization: technicians assigned counts
    const techCount = jobs.reduce((s, j) => s + (Array.isArray(j.resources?.assignedTechnicians) ? j.resources.assignedTechnicians.length : 0), 0);
    const resources = [
      { resource: 'Technicians', utilization: totalJobs > 0 ? Math.round((techCount / (totalJobs * 2)) * 100) : 0, color: '#3b82f6' },
      { resource: 'Workstations', utilization: 70, color: '#10b981' },
      { resource: 'Machines', utilization: 62, color: '#f59e0b' }
    ];

    // Customer satisfaction distribution from portal ratings
    const ratings = [1,2,3,4,5].map(r => ({ rating: r, count: 0 }));
    for (const j of jobs) {
      const r = j.customerPortal?.customerSatisfaction?.rating;
      if (r && ratings[r-1]) ratings[r-1].count += 1;
    }
    const totalRatings = ratings.reduce((s, r) => s + r.count, 0) || 1;
    const satisfaction = ratings.map(r => ({ rating: r.rating, percentage: Math.round((r.count / totalRatings) * 100), color: ['#ef4444','#f59e0b','#eab308','#22c55e','#16a34a'][r.rating-1] }));

    return res.json({
      success: true,
      data: {
        summary: {
          totalJobs,
          completedJobs,
          completionRate,
          avgEfficiency,
          delays,
          totalRevenue,
          issues: issuesCount,
          customerSatisfaction: Math.round((satisfaction.reduce((s, x) => s + x.rating * (x.percentage/100), 0)) * 10) / 10
        },
        monthly,
        byType,
        resources,
        satisfaction
      }
    });
  } catch (error) {
    console.error('Insights workshop error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getInsightsOverview,
  getInsightsSales,
  getInsightsInventory,
  getInsightsWorkshop
};


