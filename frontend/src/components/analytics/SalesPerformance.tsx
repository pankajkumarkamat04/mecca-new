'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import ChartContainer from '@/components/charts/ChartContainer';
import SalesChart from '@/components/charts/SalesChart';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/ui/DataTable';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { analyticsAPI } from '@/lib/api';
import {
  BuildingStorefrontIcon,
  UserGroupIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  FunnelIcon,
  ChartBarIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

const SalesPerformance: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedShop, setSelectedShop] = useState('all');
  const [selectedSalesperson, setSelectedSalesperson] = useState('all');
  const [reportType, setReportType] = useState('monthly');

  // Fetch sales performance data from API
  const { data: salesPerformanceData, isLoading: salesPerformanceLoading } = useQuery({
    queryKey: ['sales-performance-data', dateRange, selectedShop, selectedSalesperson],
    queryFn: () => analyticsAPI.getSalesBySalesperson({
      dateRange,
      shop: selectedShop,
      salesperson: selectedSalesperson
    }),
  });

  const { data: shopPerformanceData, isLoading: shopPerformanceLoading } = useQuery({
    queryKey: ['shop-performance-data', dateRange],
    queryFn: () => analyticsAPI.getSalesByShop({ dateRange }),
  });

  const { data: productPerformanceData, isLoading: productPerformanceLoading } = useQuery({
    queryKey: ['product-performance-data', dateRange],
    queryFn: () => analyticsAPI.getProductPerformance({ dateRange }),
  });

  const { data: monthlyTrendData, isLoading: monthlyTrendLoading } = useQuery({
    queryKey: ['monthly-trend-data', dateRange],
    queryFn: () => analyticsAPI.getSalesPerformance({ 
      dateRange,
      groupBy: 'month'
    }),
  });

  const { data: customerBehaviorData, isLoading: customerBehaviorLoading } = useQuery({
    queryKey: ['customer-behavior-data', dateRange],
    queryFn: () => analyticsAPI.getCustomerBehavior({ dateRange }),
  });

  // Fetch sales performance data
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-performance', dateRange, selectedShop, selectedSalesperson],
    queryFn: () => analyticsAPI.getSalesPerformance({
      dateRange,
      shop: selectedShop,
      salesperson: selectedSalesperson
    }),
    refetchInterval: 30000
  });

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
    { value: 'custom', label: 'Custom range' },
  ];

  const shopOptions = [
    { value: 'all', label: 'All Shops' },
    { value: 'main', label: 'Main Store' },
    { value: 'branch-a', label: 'Branch A' },
    { value: 'branch-b', label: 'Branch B' },
  ];

  const salespersonOptions = [
    { value: 'all', label: 'All Salespeople' },
    { value: 'john', label: 'John Doe' },
    { value: 'jane', label: 'Jane Smith' },
    { value: 'mike', label: 'Mike Johnson' },
    { value: 'sarah', label: 'Sarah Wilson' },
    { value: 'david', label: 'David Brown' },
  ];

  const reportTypeOptions = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'yearly', label: 'Yearly' },
  ];

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowTrendingDownIcon className="h-4 w-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const salesPerformanceColumns = [
    {
      key: 'salesperson',
      label: 'Salesperson',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.salesperson}</div>
          <div className="text-sm text-gray-500">{row.shop}</div>
        </div>
      )
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{formatCurrency(row.revenue)}</div>
          <div className="text-sm text-gray-500">{formatNumber(row.orders)} orders</div>
        </div>
      )
    },
    {
      key: 'avgOrderValue',
      label: 'Avg Order Value',
      render: (row: any) => formatCurrency(row.avgOrderValue)
    },
    {
      key: 'growth',
      label: 'Growth',
      render: (row: any) => (
        <div className="flex items-center">
          {getGrowthIcon(row.growth)}
          <span className={`ml-1 text-sm font-medium ${getGrowthColor(row.growth)}`}>
            {Math.abs(row.growth)}%
          </span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Select
            label="Date Range"
            options={dateRangeOptions}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
          <Select
            label="Shop"
            options={shopOptions}
            value={selectedShop}
            onChange={(e) => setSelectedShop(e.target.value)}
          />
          <Select
            label="Salesperson"
            options={salespersonOptions}
            value={selectedSalesperson}
            onChange={(e) => setSelectedSalesperson(e.target.value)}
          />
          <Select
            label="Report Type"
            options={reportTypeOptions}
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : formatCurrency(salesData?.data?.totalRevenue || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(salesData?.data?.revenueGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(salesData?.data?.revenueGrowth || 0)}`}>
                  {Math.abs(salesData?.data?.revenueGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ShoppingCartIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Orders</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : formatNumber(salesData?.data?.totalOrders || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(salesData?.data?.ordersGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(salesData?.data?.ordersGrowth || 0)}`}>
                  {Math.abs(salesData?.data?.ordersGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : formatCurrency(salesData?.data?.avgOrderValue || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(salesData?.data?.aovGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(salesData?.data?.aovGrowth || 0)}`}>
                  {Math.abs(salesData?.data?.aovGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Top Performer</p>
              <p className="text-lg font-semibold text-gray-900">
                {isLoading ? '...' : salesData?.data?.topPerformer || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {isLoading ? '...' : salesData?.data?.topShop || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Revenue Trend"
          description="Monthly revenue performance over time"
          trend={{ value: 10.4, isPositive: true, label: 'vs last month' }}
        >
          <SalesChart 
            data={monthlyTrendData?.data || []} 
            type="area"
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Shop Performance"
          description="Revenue distribution across shops"
          trend={{ value: 8.3, isPositive: true, label: 'vs last month' }}
        >
          <PieChart 
            data={shopPerformanceData?.data || []}
            height={300}
            showLegend={true}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Products by Revenue"
          description="Best performing products"
          trend={{ value: 15.2, isPositive: true, label: 'vs last month' }}
        >
          <BarChart 
            data={(productPerformanceData?.data || []).map((p: any) => ({
              name: p.name,
              value: p.revenue,
              color: '#3b82f6'
            }))}
            height={300}
            orientation="horizontal"
            formatValue={(value) => formatCurrency(value)}
          />
        </ChartContainer>

        <ChartContainer
          title="Customer Segments"
          description="Revenue by customer type"
          trend={{ value: 12.1, isPositive: true, label: 'vs last month' }}
        >
          <PieChart 
            data={customerBehaviorData?.data || []}
            height={300}
            showLegend={true}
            showLabel={true}
          />
        </ChartContainer>
      </div>

      {/* Sales Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Sales Performance by Salesperson</h3>
          <p className="text-sm text-gray-600">Detailed breakdown of individual performance</p>
        </div>
        <DataTable
          data={salesPerformanceData?.data || []}
          columns={salesPerformanceColumns}
          loading={salesPerformanceLoading}
        />
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <BuildingStorefrontIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Top Performing Shop</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Main Store leads with {formatCurrency(224100)} in revenue, showing 10.4% growth.
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UsersIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Top Salesperson</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              John Doe from Main Store generated {formatCurrency(125400)} with 12.5% growth.
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-900">Average Order Value</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              AOV increased to {formatCurrency(346)} with 1.6% growth, indicating higher value purchases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SalesPerformance;
