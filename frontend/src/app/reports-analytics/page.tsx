'use client';

import React, { useState, useEffect } from 'react';
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
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  CreditCardIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import { generateReportPDF, generateReportCSV, createReportData } from '@/lib/reportUtils';
import toast from 'react-hot-toast';

const ReportsAnalyticsPage: React.FC = () => {
  const { hasRole, hasPermission } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('orders');
  
  // Sales Person Tracking States
  const [salesPersonFilters, setSalesPersonFilters] = useState({
    salesPersonId: '',
    salesOutlet: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
    reportType: 'summary' // 'summary' or 'detailed'
  });

  // Check permissions
  const canViewOrders = hasRole('admin') || hasRole('manager') || hasRole('sales_person');
  const canViewWorkshop = hasRole('admin') || hasRole('manager') || hasRole('workshop_employee');
  const canViewInventory = hasRole('admin') || hasRole('manager') || hasRole('warehouse_manager') || hasRole('warehouse_employee');


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
    enabled: canViewOrders && activeTab === 'sales',
  });

  // Sales by Currency Query
  const { data: salesByCurrencyData, isLoading: currencyLoading } = useQuery({
    queryKey: ['reports-analytics-sales-by-currency', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getSalesByCurrency({ period: selectedPeriod }),
    enabled: canViewOrders && activeTab === 'transactions',
  });

  // Sales by Sales Person - Summary Query
  const { data: salesSummaryBySalesPerson, isLoading: salesSummaryLoading } = useQuery({
    queryKey: ['reports-analytics-sales-summary-by-salesperson', salesPersonFilters.startDate, salesPersonFilters.endDate],
    queryFn: () => reportsAnalyticsAPI.getSalesSummaryBySalesPerson({
      startDate: salesPersonFilters.startDate,
      endDate: salesPersonFilters.endDate
    }),
    enabled: canViewOrders && activeTab === 'sales' && salesPersonFilters.reportType === 'summary',
  });

  // Sales by Sales Person - Detailed Query
  const { data: salesBySalesPerson, isLoading: salesPersonLoading } = useQuery({
    queryKey: ['reports-analytics-sales-by-salesperson', salesPersonFilters],
    queryFn: () => reportsAnalyticsAPI.getSalesBySalesPerson(salesPersonFilters),
    enabled: canViewOrders && activeTab === 'sales' && salesPersonFilters.reportType === 'detailed' && !!salesPersonFilters.salesPersonId,
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
    enabled: canViewOrders && (activeTab === 'orders' || activeTab === 'sales'),
  });

  const { data: topProductsChart, isLoading: topProductsLoading } = useQuery({
    queryKey: ['reports-analytics-top-products', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getTopProductsChart({ period: selectedPeriod, limit: 10 }),
    enabled: canViewOrders && (activeTab === 'orders' || activeTab === 'sales'),
  });

  const { data: revenueAnalyticsChart, isLoading: revenueAnalyticsLoading } = useQuery({
    queryKey: ['reports-analytics-revenue-analytics', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getRevenueAnalyticsChart({ period: selectedPeriod }),
    enabled: canViewOrders && activeTab === 'transactions',
  });

  const { data: workshopAnalyticsChart, isLoading: workshopAnalyticsLoading } = useQuery({
    queryKey: ['reports-analytics-workshop-chart', selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getWorkshopAnalyticsChart({ period: selectedPeriod }),
    enabled: canViewWorkshop && activeTab === 'workshop',
  });

  const tabs = [
    { id: 'orders', name: 'Order Analytics', icon: ShoppingBagIcon, permission: canViewOrders },
    { id: 'sales', name: 'Sales Analytics', icon: CurrencyDollarIcon, permission: canViewOrders },
    { id: 'transactions', name: 'Transactions', icon: BanknotesIcon, permission: canViewOrders },
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

  // Helper function to handle report download
  const handleDownloadReport = async (reportType: string, data: any, format: 'pdf' | 'csv') => {
    try {
      // Create report data with summary and any available table data
      const reportData = createReportData(
        data.summary || {},
        data.topCustomers || data.topProducts || data.topTechnicians || data.categories || data.paymentMethods || data.jobTypes || data.technicians || []
      );
      
      if (format === 'pdf') {
        await generateReportPDF(
          `${reportType} Report`,
          reportData,
          undefined,
          `${reportType.toLowerCase().replace(/\s+/g, '_')}_report.pdf`
        );
        toast.success('PDF report downloaded successfully');
      } else {
        generateReportCSV(
          `${reportType} Report`,
          reportData,
          undefined,
          `${reportType.toLowerCase().replace(/\s+/g, '_')}_report.csv`
        );
        toast.success('CSV report downloaded successfully');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.error('Failed to download report');
    }
  };


  const renderOrderAnalytics = () => {
    if (orderLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }


    const data = orderAnalytics?.data?.data;
    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-6">
        {/* Download buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleDownloadReport('Order Analytics', data, 'pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownloadReport('Order Analytics', data, 'csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download CSV
          </button>
        </div>
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
            ) : (() => {
                const productsData = topProductsChart?.data?.data?.topProductsByQuantity || [];
                
                if (productsData.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <CubeIcon className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">No products sold yet</p>
                      <p className="text-sm text-gray-500 mt-2">Products will appear here once sales are recorded</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {productsData.map((p: any, index: number) => {
                      const quantity = Number(p?.totalQuantity) || 0;
                      const revenue = p?.totalRevenue || 0;
                      return (
                        <div key={p?._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-red-600 text-white rounded-full font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{p?.name || 'Unknown Product'}</p>
                              <p className="text-sm text-gray-500">SKU: {p?.sku || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{quantity.toLocaleString()} units</p>
                            <p className="text-sm text-gray-500">{formatCurrency(revenue)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>
        </div>

      </div>
    );
  };

  // Merged Sales Analytics (POS + Sales by Person)
  const renderSalesAnalytics = () => {
    return (
      <div className="space-y-6">
        {/* POS Sales Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm bordCCer border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">POS Sales Analytics</h3>
          {renderPOSSalesContent()}
        </div>

        {/* Sales by Person Section */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Person</h3>
          {renderSalesPersonContent()}
        </div>
      </div>
    );
  };
  
  // Content without download buttons
  const renderPOSSalesContent = () => {
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
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Payment Methods</h4>
            <div className="space-y-2">
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
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Top Selling Products</h4>
            <div className="space-y-2">
              {data.topProducts.slice(0, 5).map((product: any) => (
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

        {/* Revenue Trends Chart */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-4">Revenue Trends</h4>
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
      </div>
    );
  };
  
  const renderSalesPersonContent = () => {
    const isLoading = salesPersonFilters.reportType === 'summary' ? salesSummaryLoading : salesPersonLoading;
    const summaryData = salesSummaryBySalesPerson?.data;
    const detailedData = salesBySalesPerson?.data;
    const data = salesPersonFilters.reportType === 'summary' 
      ? (Array.isArray(summaryData?.data) ? summaryData?.data : [])
      : (Array.isArray((detailedData as any)?.transactions) ? (detailedData as any)?.transactions : []);
    
    const pagination = (detailedData as any)?.pagination;

    if (isLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    if (!data) return <div>No data available</div>;

    return (
      <div className="space-y-4">
        {/* Filters */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-md font-semibold text-gray-900 mb-3">Report Filters</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={salesPersonFilters.reportType}
                onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, reportType: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Transactions</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={salesPersonFilters.startDate}
                onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={salesPersonFilters.endDate}
                onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {salesPersonFilters.reportType === 'detailed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person ID</label>
                <input
                  type="text"
                  placeholder="Enter Sales Person ID"
                  value={salesPersonFilters.salesPersonId}
                  onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, salesPersonId: e.target.value, page: 1 }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Data Display */}
        {data.length > 0 ? (
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Revenue</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.slice(0, 10).map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm text-gray-900">{JSON.stringify(item).substring(0, 100)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{formatCurrency(item?.totalRevenue || item?.amount || 0)}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{item?.status || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {pagination && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">No data available for the selected filters</div>
        )}
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
        {/* Download buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleDownloadReport('POS Sales', data, 'pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownloadReport('POS Sales', data, 'csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download CSV
          </button>
        </div>
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
        {/* Download buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleDownloadReport('Workshop Analytics', data, 'pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownloadReport('Workshop Analytics', data, 'csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download CSV
          </button>
        </div>
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
            ) : (() => {
                const techniciansData = workshopAnalyticsChart?.data?.data?.topTechnicians || [];
                
                if (techniciansData.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <WrenchScrewdriverIcon className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">No technicians assigned yet</p>
                      <p className="text-sm text-gray-500 mt-2">Assign technicians to workshop jobs to see statistics here</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {techniciansData.map((t: any, index: number) => {
                      const jobCount = Number(t?.jobCount) || 0;
                      const revenue = t?.totalRevenue || 0;
                      return (
                        <div key={t?._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{t?.technicianName || t?.name || 'Unknown Technician'}</p>
                              <p className="text-sm text-gray-500">
                                {t?.role ? `${t.role.charAt(0).toUpperCase() + t.role.slice(1)}` : 'Technician'}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{jobCount} {jobCount === 1 ? 'job' : 'jobs'}</p>
                            <p className="text-sm text-gray-500">Total Revenue</p>
                            <p className="text-sm font-semibold text-green-600">{formatCurrency(revenue)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
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
        {/* Download buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleDownloadReport('Inventory Analytics', data, 'pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownloadReport('Inventory Analytics', data, 'csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download CSV
          </button>
        </div>
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

  const renderSalesPersonAnalytics = () => {
    const isLoading = salesPersonFilters.reportType === 'summary' ? salesSummaryLoading : salesPersonLoading;
    const summaryData = salesSummaryBySalesPerson?.data;
    const detailedData = salesBySalesPerson?.data;
    const data = salesPersonFilters.reportType === 'summary' 
      ? (Array.isArray(summaryData?.data) ? summaryData?.data : [])
      : (Array.isArray((detailedData as any)?.transactions) ? (detailedData as any)?.transactions : []);
    
    const pagination = (detailedData as any)?.pagination;

    if (isLoading) {
      return <div className="flex justify-center items-center h-64">Loading...</div>;
    }

    if (!data) return <div>No data available</div>;

    // Helper to download sales person report
    const handleDownloadSalesPersonReport = async (format: 'pdf' | 'csv') => {
      try {
        const reportTitle = salesPersonFilters.reportType === 'summary' 
          ? 'Sales Summary by Person' 
          : 'Sales Transactions by Person';
        
        const reportData = createReportData({}, data);
        
        if (format === 'pdf') {
          await generateReportPDF(
            reportTitle,
            reportData,
            undefined,
            `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.pdf`
          );
          toast.success('PDF report downloaded successfully');
        } else {
          generateReportCSV(
            reportTitle,
            reportData,
            undefined,
            `${reportTitle.toLowerCase().replace(/\s+/g, '_')}.csv`
          );
          toast.success('CSV report downloaded successfully');
        }
      } catch (error) {
        console.error('Error downloading report:', error);
        toast.error('Failed to download report');
      }
    };

    return (
      <div className="space-y-6">
        {/* Download buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleDownloadSalesPersonReport('pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownloadSalesPersonReport('csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download CSV
          </button>
        </div>
        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Report Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
              <select
                value={salesPersonFilters.reportType}
                onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, reportType: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="summary">Summary Report</option>
                <option value="detailed">Detailed Transactions</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={salesPersonFilters.startDate}
                onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, startDate: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={salesPersonFilters.endDate}
                onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, endDate: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            {salesPersonFilters.reportType === 'detailed' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sales Person ID</label>
                <input
                  type="text"
                  placeholder="Enter Sales Person ID"
                  value={salesPersonFilters.salesPersonId}
                  onChange={(e) => setSalesPersonFilters(prev => ({ ...prev, salesPersonId: e.target.value, page: 1 }))}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Summary Report */}
        {salesPersonFilters.reportType === 'summary' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Summary by Sales Person</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sales Person</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Average Sale</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sale</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((person: any, index: number) => (
                    <tr key={person._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{person.salesPersonName}</div>
                          <div className="text-sm text-gray-500">{person.salesPersonEmail}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {person.totalTransactions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(person.totalSales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(person.averageSale)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {person.lastSale ? formatDate(person.lastSale) : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Report */}
        {salesPersonFilters.reportType === 'detailed' && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Sales Transactions</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction #</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment Method</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice #</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.map((transaction: any, index: number) => (
                    <tr key={transaction._id || index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {transaction.transactionNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.customer ? `${transaction.customer.firstName} ${transaction.customer.lastName}` : 'Walk-in'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.paymentMethod}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {transaction.invoice?.invoiceNumber || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination && (
              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} results
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSalesPersonFilters(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={!pagination.hasPrev}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setSalesPersonFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!pagination.hasNext}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTransactionsAnalytics = () => {
    return (
      <div className="space-y-6">
        {/* Download buttons */}
        <div className="flex justify-end gap-2">
          <button
            onClick={() => handleDownloadReport('Transactions', {}, 'pdf')}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <DocumentArrowDownIcon className="h-5 w-5" />
            Download PDF
          </button>
          <button
            onClick={() => handleDownloadReport('Transactions', {}, 'csv')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ArrowDownTrayIcon className="h-5 w-5" />
            Download CSV
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Methods Distribution */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Methods Distribution</h3>
            {revenueAnalyticsLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (() => {
                const paymentMethods = revenueAnalyticsChart?.data?.data?.paymentMethodBreakdown || [];
                
                if (paymentMethods.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <CreditCardIcon className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">No payment methods recorded yet</p>
                      <p className="text-sm text-gray-500 mt-2">Payment methods will appear here once transactions are recorded</p>
                    </div>
                  );
                }
                
                const totalAmount = paymentMethods.reduce((sum: number, p: any) => sum + (Number(p.totalAmount) || 0), 0);
                
                return (
                  <div className="space-y-3">
                    {paymentMethods.map((p: any, index: number) => {
                      const amount = Number(p.totalAmount) || 0;
                      const percentage = totalAmount > 0 ? ((amount / totalAmount) * 100).toFixed(1) : 0;
                      return (
                        <div key={p?._id || index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-semibold">
                              {index + 1}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 capitalize">{p?._id || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{percentage}% of total</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{formatCurrency(amount)}</p>
                            <p className="text-sm text-gray-500">{p?.count || 0} transactions</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
          </div>

          {/* Sales by Currency */}
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales by Currency</h3>
            {currencyLoading ? (
              <div className="flex justify-center items-center h-64">Loading...</div>
            ) : (() => {
                const currencies = salesByCurrencyData?.data?.data?.currencyBreakdown || [];
                
                if (currencies.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                      <CurrencyDollarIcon className="h-16 w-16 text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">No currency data available yet</p>
                      <p className="text-sm text-gray-500 mt-2">Currency breakdown will appear here once sales are recorded</p>
                    </div>
                  );
                }
                
                return (
                  <div className="space-y-3">
                    {currencies.map((c: any, index: number) => (
                      <div key={c._id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-semibold">
                              {index + 1}
                            </div>
                            <span className="text-lg font-semibold text-gray-900">{c._id || 'USD'}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm text-gray-600">Invoices</div>
                          <div className="text-sm font-medium text-gray-900">{c.totalInvoices}</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm text-gray-600">Revenue (local)</div>
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(c.totalRevenueLocal, c._id || 'USD')}</div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="text-sm text-gray-600">Paid (local)</div>
                          <div className="text-sm font-medium text-gray-900">{formatCurrency(c.totalPaidLocal, c._id || 'USD')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'orders':
        return renderOrderAnalytics();
      case 'sales':
        return renderSalesAnalytics();
      case 'transactions':
        return renderTransactionsAnalytics();
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
