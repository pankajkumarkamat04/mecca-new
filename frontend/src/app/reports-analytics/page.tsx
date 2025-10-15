'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { reportsAnalyticsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import SalesChart from '@/components/charts/SalesChart';
import BarChart from '@/components/charts/BarChart';
import {
  ChartBarIcon,
  ShoppingBagIcon,
  WrenchScrewdriverIcon,
  CubeIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const ReportsAnalyticsPage: React.FC = () => {
  const { hasRole, hasPermission } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('dashboard');

  // Check permissions
  const canViewOrders = hasRole('admin') || hasRole('manager') || hasRole('sales_person');
  const canViewWorkshop = hasRole('admin') || hasRole('manager') || hasRole('workshop_employee');
  const canViewInventory = hasRole('admin') || hasRole('manager') || hasRole('warehouse_manager') || hasRole('warehouse_employee');

  // Dashboard Summary Query
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['reports-analytics-dashboard'],
    queryFn: () => reportsAnalyticsAPI.getDashboardSummary(),
  });

  // Order Analytics Query
  const { data: orderAnalytics, isLoading: orderLoading } = useQuery({
    queryKey: ['reports-analytics-orders', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getOrderAnalytics({ period: selectedPeriod }),
    enabled: canViewOrders && activeTab === 'orders',
  });

  // POS Sales Analytics Query
  const { data: posAnalytics, isLoading: posLoading } = useQuery({
    queryKey: ['reports-analytics-pos', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getPOSSalesAnalytics({ period: selectedPeriod }),
    enabled: canViewOrders && activeTab === 'pos-sales',
  });

  // Sales by Currency Query
  const { data: salesByCurrencyData, isLoading: currencyLoading } = useQuery({
    queryKey: ['reports-analytics-sales-by-currency', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getSalesByCurrency({ period: selectedPeriod }),
    enabled: canViewOrders && activeTab === 'pos-sales',
  });

  // Workshop Analytics Query
  const { data: workshopAnalytics, isLoading: workshopLoading } = useQuery({
    queryKey: ['reports-analytics-workshop', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getWorkshopAnalytics({ period: selectedPeriod }),
    enabled: canViewWorkshop && activeTab === 'workshop',
  });

  // Inventory Analytics Query
  const { data: inventoryAnalytics, isLoading: inventoryLoading } = useQuery({
    queryKey: ['reports-analytics-inventory', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getInventoryAnalytics({ period: selectedPeriod }),
    enabled: canViewInventory && activeTab === 'inventory',
  });

  // Chart Queries
  const { data: salesTrendsChart, isLoading: salesTrendsLoading } = useQuery({
    queryKey: ['reports-analytics-sales-trends', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getSalesTrendsChart({ period: selectedPeriod }),
    enabled: canViewOrders && (activeTab === 'orders' || activeTab === 'pos-sales'),
  });

  const { data: topProductsChart, isLoading: topProductsLoading } = useQuery({
    queryKey: ['reports-analytics-top-products', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getTopProductsChart({ period: selectedPeriod, limit: 10 }),
    enabled: canViewOrders && (activeTab === 'orders' || activeTab === 'pos-sales'),
  });

  const { data: revenueAnalyticsChart, isLoading: revenueAnalyticsLoading } = useQuery({
    queryKey: ['reports-analytics-revenue-analytics', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getRevenueAnalyticsChart({ period: selectedPeriod }),
    enabled: canViewOrders && activeTab === 'pos-sales',
  });

  const { data: workshopAnalyticsChart, isLoading: workshopAnalyticsLoading } = useQuery({
    queryKey: ['reports-analytics-workshop-chart', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getWorkshopAnalyticsChart({ period: selectedPeriod }),
    enabled: canViewWorkshop && activeTab === 'workshop',
  });

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: ChartBarIcon, permission: true },
    { id: 'orders', name: 'Order Analytics', icon: ShoppingBagIcon, permission: canViewOrders },
    { id: 'pos-sales', name: 'POS Sales', icon: CurrencyDollarIcon, permission: canViewOrders },
    { id: 'workshop', name: 'Workshop', icon: WrenchScrewdriverIcon, permission: canViewWorkshop },
    { id: 'inventory', name: 'Inventory', icon: CubeIcon, permission: canViewInventory },
  ].filter(tab => tab.permission);

  const periodOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  const StatCard = ({ title, value, icon: Icon, color = 'blue', subtitle }: any) => (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center">
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
        <div className="ml-4">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-semibold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => {
    if (dashboardLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }


    const data = dashboardData?.data?.data;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Orders (30d)"
            value={data.orders?.total || 0}
            icon={ShoppingBagIcon}
            color="blue"
          />
          <StatCard
            title="Total Revenue (30d)"
            value={formatCurrency(data.orders?.revenue || 0)}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <StatCard
            title="Workshop Jobs (30d)"
            value={data.workshop?.total || 0}
            icon={WrenchScrewdriverIcon}
            color="purple"
          />
          <StatCard
            title="Total Products"
            value={data.inventory?.total || 0}
            icon={CubeIcon}
            color="indigo"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Pending Orders"
            value={data.orders?.pending || 0}
            icon={ExclamationTriangleIcon}
            color="yellow"
          />
          <StatCard
            title="Active Jobs"
            value={data.workshop?.inProgress || 0}
            icon={WrenchScrewdriverIcon}
            color="orange"
          />
          <StatCard
            title="Low Stock Items"
            value={data.inventory?.lowStock || 0}
            icon={ExclamationTriangleIcon}
            color="red"
          />
          <StatCard
            title="Today's Sales"
            value={data.sales?.today || 0}
            icon={CurrencyDollarIcon}
            color="green"
          />
        </div>


      </div>
    );
  };

  const renderOrderAnalytics = () => {
    if (orderLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }


    const data = orderAnalytics?.data?.data;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Orders"
            value={data.summary?.totalOrders || 0}
            icon={ShoppingBagIcon}
            color="blue"
          />
          <StatCard
            title="Completed Orders"
            value={data.summary?.completedOrders || 0}
            icon={ShoppingBagIcon}
            color="green"
          />
          <StatCard
            title="Completion Rate"
            value={`${data.summary?.completionRate || 0}%`}
            icon={ChartBarIcon}
            color="purple"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.summary?.totalRevenue || 0)}
            icon={CurrencyDollarIcon}
            color="green"
          />
        </div>

        {data.topCustomers && data.topCustomers.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Customers</h3>
            <div className="space-y-3">
              {data.topCustomers.slice(0, 5).map((customer: any, index: number) => (
                <div key={customer._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {customer.customer?.firstName} {customer.customer?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{customer.orderCount} orders</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trends Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Trends</h3>
            {salesTrendsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <SalesChart
                type="area"
                data={(salesTrendsChart?.data?.data?.dailyTrends || []).map((d: any) => ({
                  date: `${d._id.year}-${d._id.month.toString().padStart(2, '0')}-${d._id.day.toString().padStart(2, '0')}`,
                  sales: d.count,
                  revenue: d.revenue,
                  orders: d.count,
                }))}
              />
            )}
          </div>

          {/* Top Products Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Products by Quantity</h3>
            {topProductsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <BarChart
                data={(topProductsChart?.data?.data?.topProductsByQuantity || []).map((p: any) => ({
                  name: p.name || 'Unknown',
                  value: p.totalQuantity,
                }))}
              />
            )}
          </div>
        </div>

      </div>
    );
  };

  const renderPOSSalesAnalytics = () => {
    if (posLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    const data = posAnalytics?.data?.data;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <StatCard
            title="Total Sales"
            value={data.summary?.totalSales || 0}
            icon={ShoppingBagIcon}
            color="blue"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.summary?.totalRevenue || 0)}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <StatCard
            title="Avg Transaction"
            value={formatCurrency(data.summary?.averageTransactionValue || 0)}
            icon={ChartBarIcon}
            color="purple"
          />
        </div>

        {data.paymentMethods && data.paymentMethods.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods</h3>
            <div className="space-y-3">
              {data.paymentMethods.map((method: any) => (
                <div key={method._id} className="flex items-center justify-between">
                  <span className="capitalize font-medium text-gray-900">{method._id}</span>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{method.count} transactions</p>
                    <p className="text-sm text-gray-500">{formatCurrency(method.totalAmount)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.topProducts && data.topProducts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Products</h3>
            <div className="space-y-3">
              {data.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div key={product._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.product?.name}</p>
                    <p className="text-sm text-gray-500">{product.quantitySold} sold</p>
                  </div>
                  <p className="font-semibold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sales by Currency */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Currency</h3>
          {currencyLoading ? (
            <div className="flex justify-center items-center h-32">Loading...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {(salesByCurrencyData?.data?.data?.currencyBreakdown || []).map((c: any) => (
                <div key={c._id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">Currency</div>
                    <div className="text-sm font-medium text-gray-900">{c._id || 'USD'}</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-600">Invoices</div>
                    <div className="text-sm font-medium text-gray-900">{c.totalInvoices}</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-600">Revenue (base)</div>
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(c.totalRevenueBase)}</div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-600">Paid (base)</div>
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(c.totalPaidBase)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Analytics Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trends</h3>
            {revenueAnalyticsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <SalesChart
                type="line"
                data={(revenueAnalyticsChart?.data?.data?.monthlyRevenue || []).map((d: any) => ({
                  date: `${d._id.year}-${d._id.month.toString().padStart(2, '0')}`,
                  sales: d.revenue,
                  revenue: d.revenue,
                  orders: d.orderCount,
                }))}
              />
            )}
          </div>

          {/* Payment Methods Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods Distribution</h3>
            {revenueAnalyticsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <BarChart
                data={(revenueAnalyticsChart?.data?.data?.paymentMethodBreakdown || []).map((p: any) => ({
                  name: p._id || 'Unknown',
                  value: p.totalAmount,
                }))}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkshopAnalytics = () => {
    if (workshopLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    const data = workshopAnalytics?.data?.data;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Jobs"
            value={data.summary?.totalJobs || 0}
            icon={WrenchScrewdriverIcon}
            color="blue"
          />
          <StatCard
            title="Completed Jobs"
            value={data.summary?.completedJobs || 0}
            icon={WrenchScrewdriverIcon}
            color="green"
          />
          <StatCard
            title="Completion Rate"
            value={`${data.summary?.completionRate || 0}%`}
            icon={ChartBarIcon}
            color="purple"
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(data.summary?.totalRevenue || 0)}
            icon={CurrencyDollarIcon}
            color="green"
          />
        </div>

        {data.jobTypes && data.jobTypes.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Types</h3>
            <div className="space-y-3">
              {data.jobTypes.map((jobType: any) => (
                <div key={jobType._id} className="flex items-center justify-between">
                  <span className="capitalize font-medium text-gray-900">{jobType._id}</span>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{jobType.count} jobs</p>
                    <p className="text-sm text-gray-500">Avg: {formatCurrency(jobType.avgCost)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.technicians && data.technicians.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Technicians</h3>
            <div className="space-y-3">
              {data.technicians.slice(0, 5).map((tech: any, index: number) => (
                <div key={tech._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {tech.technician?.firstName} {tech.technician?.lastName}
                    </p>
                    <p className="text-sm text-gray-500">{tech.completedCount}/{tech.jobCount} completed</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {tech.jobCount} jobs
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Workshop Job Trends Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Trends</h3>
            {workshopAnalyticsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <SalesChart
                type="area"
                data={(workshopAnalyticsChart?.data?.data?.jobTrends || []).map((d: any) => ({
                  date: `${d._id.year}-${d._id.month.toString().padStart(2, '0')}-${d._id.day.toString().padStart(2, '0')}`,
                  sales: d.count,
                  revenue: d.totalRevenue,
                  orders: d.count,
                }))}
              />
            )}
          </div>

          {/* Top Technicians Chart */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Technicians by Jobs</h3>
            {workshopAnalyticsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (
              <BarChart
                data={(workshopAnalyticsChart?.data?.data?.topTechnicians || []).map((t: any) => ({
                  name: t.technicianName || 'Unknown',
                  value: t.jobCount,
                }))}
              />
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderInventoryAnalytics = () => {
    if (inventoryLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    const data = inventoryAnalytics?.data?.data;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Products"
            value={data.summary?.totalProducts || 0}
            icon={CubeIcon}
            color="blue"
          />
          <StatCard
            title="Low Stock"
            value={data.summary?.lowStockProducts || 0}
            icon={ExclamationTriangleIcon}
            color="yellow"
          />
          <StatCard
            title="Out of Stock"
            value={data.summary?.outOfStockProducts || 0}
            icon={ExclamationTriangleIcon}
            color="red"
          />
          <StatCard
            title="Stock Health"
            value={`${data.summary?.stockHealth || 0}%`}
            icon={ChartBarIcon}
            color="green"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatCard
            title="Total Stock Value"
            value={formatCurrency(data.summary?.totalStockValue || 0)}
            icon={CurrencyDollarIcon}
            color="green"
          />
          <StatCard
            title="Average Stock Value"
            value={formatCurrency(data.summary?.avgStockValue || 0)}
            icon={ChartBarIcon}
            color="purple"
          />
        </div>

        {data.categories && data.categories.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Inventory by Category</h3>
            <div className="space-y-3">
              {data.categories.map((category: any) => (
                <div key={category._id} className="flex items-center justify-between">
                  <span className="capitalize font-medium text-gray-900">{category.categoryName || 'Uncategorized'}</span>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">{category.productCount} products</p>
                    <p className="text-sm text-gray-500">{formatCurrency(category.totalValue)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {data.reorderAlerts && data.reorderAlerts.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reorder Alerts</h3>
            <div className="space-y-3">
              {data.reorderAlerts.slice(0, 10).map((product: any) => (
                <div key={product._id} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-red-600">{product.inventory?.currentStock} left</p>
                    <p className="text-sm text-gray-500">Reorder: {product.inventory?.reorderLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return renderDashboard();
      case 'orders':
        return renderOrderAnalytics();
      case 'pos-sales':
        return renderPOSSalesAnalytics();
      case 'workshop':
        return renderWorkshopAnalytics();
      case 'inventory':
        return renderInventoryAnalytics();
      default:
        return <div>Select a tab to view analytics</div>;
    }
  };

  return (
    <Layout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Real-time insights and analytics for your business</p>
          </div>
          
          {activeTab !== 'dashboard' && (
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <tab.icon className="h-5 w-5 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="mt-6">
          {renderContent()}
        </div>
      </div>
    </Layout>
  );
};

export default ReportsAnalyticsPage;
