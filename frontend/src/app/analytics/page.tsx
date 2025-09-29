'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import ChartContainer from '@/components/charts/ChartContainer';
import SalesChart from '@/components/charts/SalesChart';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { analyticsAPI } from '@/lib/api';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UsersIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  CalendarIcon,
  FunnelIcon,
  WrenchScrewdriverIcon,
  ArchiveBoxIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

// Import the new analytics components
import SalesPerformance from '@/components/analytics/SalesPerformance';
import InventoryAnalysis from '@/components/analytics/InventoryAnalysis';
import WorkshopPerformance from '@/components/analytics/WorkshopPerformance';

const AnalyticsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'workshop'>('overview');
  const [dateRange, setDateRange] = useState('7d');
  const [chartType, setChartType] = useState('area');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  // Fetch overview data from API
  const { data: salesData, isLoading: salesDataLoading } = useQuery({
    queryKey: ['overview-sales-data', dateRange],
    queryFn: () => analyticsAPI.getSalesPerformance({
      dateRange,
      groupBy: 'day'
    }),
  });

  const { data: categoryData, isLoading: categoryDataLoading } = useQuery({
    queryKey: ['overview-category-data', dateRange],
    queryFn: () => analyticsAPI.getProductPerformance({
      dateRange,
      groupBy: 'category'
    }),
  });

  const { data: topProductsData, isLoading: topProductsLoading } = useQuery({
    queryKey: ['overview-top-products-data', dateRange],
    queryFn: () => analyticsAPI.getProductPerformance({
      dateRange,
      groupBy: 'product',
      limit: 5
    }),
  });

  const { data: paymentMethodData, isLoading: paymentMethodLoading } = useQuery({
    queryKey: ['overview-payment-method-data', dateRange],
    queryFn: () => analyticsAPI.getSalesPerformance({
      dateRange,
      groupBy: 'paymentMethod'
    }),
  });

  const { data: monthlyComparisonData, isLoading: monthlyComparisonLoading } = useQuery({
    queryKey: ['overview-monthly-comparison-data', dateRange],
    queryFn: () => analyticsAPI.getSalesPerformance({
      dateRange,
      groupBy: 'month',
      compare: true
    }),
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => analyticsAPI.getOverviewMetrics({ dateRange }),
    refetchInterval: 30000
  });

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
    { value: 'custom', label: 'Custom range' },
  ];

  const chartTypeOptions = [
    { value: 'area', label: 'Area Chart' },
    { value: 'line', label: 'Line Chart' },
  ];

  const metricOptions = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'sales', label: 'Sales' },
  ];

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'revenue':
        return <CurrencyDollarIcon className="h-5 w-5" />;
      case 'orders':
        return <ShoppingCartIcon className="h-5 w-5" />;
      case 'customers':
        return <UsersIcon className="h-5 w-5" />;
      default:
        return <ChartBarIcon className="h-5 w-5" />;
    }
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? (
      <ArrowUpIcon className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowDownIcon className="h-4 w-4 text-red-500" />
    );
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const formatMetricValue = (value: number, metric: string) => {
    switch (metric) {
      case 'revenue':
        return formatCurrency(value);
      case 'orders':
      case 'customers':
        return formatNumber(value);
      default:
        return value.toString();
    }
  };

  const tabs = [
    {
      id: 'overview',
      name: 'Overview',
      icon: ChartBarIcon,
      description: 'General business metrics and trends'
    },
    {
      id: 'sales',
      name: 'Sales Performance',
      icon: BuildingStorefrontIcon,
      description: 'Track sales by shop, product, and salesperson'
    },
    {
      id: 'inventory',
      name: 'Inventory Analysis',
      icon: ArchiveBoxIcon,
      description: 'Monitor stock levels and turnover rates'
    },
    {
      id: 'workshop',
      name: 'Workshop Performance',
      icon: WrenchScrewdriverIcon,
      description: 'Analyze job completion and efficiency'
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'sales':
        return <SalesPerformance />;
      case 'inventory':
        return <InventoryAnalysis />;
      case 'workshop':
        return <WorkshopPerformance />;
      default:
        return renderOverviewContent();
    }
  };

  const renderOverviewContent = () => (
    <div className="space-y-6">
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
                {isLoading ? '...' : formatCurrency(analyticsData?.data?.totalRevenue || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analyticsData?.data?.revenueGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(analyticsData?.data?.revenueGrowth || 0)}`}>
                  {Math.abs(analyticsData?.data?.revenueGrowth || 0)}%
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
                {isLoading ? '...' : formatNumber(analyticsData?.data?.totalOrders || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analyticsData?.data?.ordersGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(analyticsData?.data?.ordersGrowth || 0)}`}>
                  {Math.abs(analyticsData?.data?.ordersGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Customers</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : formatNumber(analyticsData?.data?.totalCustomers || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analyticsData?.data?.customersGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(analyticsData?.data?.customersGrowth || 0)}`}>
                  {Math.abs(analyticsData?.data?.customersGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ArrowTrendingUpIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Order Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : formatCurrency(analyticsData?.data?.averageOrderValue || 0)}
              </p>
              <div className="flex items-center mt-1">
                {getGrowthIcon(analyticsData?.data?.aovGrowth || 0)}
                <span className={`ml-1 text-sm font-medium ${getGrowthColor(analyticsData?.data?.aovGrowth || 0)}`}>
                  {Math.abs(analyticsData?.data?.aovGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Sales Trend"
          description="Revenue and sales performance over time"
          trend={{ value: 12.5, isPositive: true, label: 'vs last month' }}
          actions={
            <div className="flex space-x-2">
              <Select
                options={chartTypeOptions}
                value={chartType}
                onChange={(e) => setChartType(e.target.value)}
                className="w-32"
              />
              <Select
                options={metricOptions}
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="w-32"
              />
            </div>
          }
        >
          <SalesChart 
            data={salesData?.data || []} 
            type={chartType as 'line' | 'area'}
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Sales by Category"
          description="Revenue distribution across product categories"
          trend={{ value: 8.3, isPositive: true, label: 'vs last month' }}
        >
          <PieChart 
            data={categoryData?.data || []}
            height={300}
            showLegend={true}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Top Products"
          description="Best performing products by revenue"
          trend={{ value: 15.2, isPositive: true, label: 'vs last month' }}
        >
          <BarChart 
            data={topProductsData?.data || []}
            height={300}
            orientation="horizontal"
            formatValue={(value) => formatCurrency(value)}
          />
        </ChartContainer>

        <ChartContainer
          title="Payment Methods"
          description="Distribution of payment methods used"
          trend={{ value: 2.1, isPositive: true, label: 'vs last month' }}
        >
          <PieChart 
            data={paymentMethodData?.data || []}
            height={300}
            showLegend={true}
            showLabel={true}
          />
        </ChartContainer>
      </div>

      {/* Monthly Comparison */}
      <ChartContainer
        title="Monthly Performance Comparison"
        description="Current vs previous year performance"
        trend={{ value: 18.7, isPositive: true, label: 'vs previous year' }}
      >
        <BarChart 
          data={(monthlyComparisonData?.data || []).map((item: any) => ({
            name: item.name,
            value: item.current,
            color: '#3b82f6'
          }))}
          height={300}
          formatValue={(value) => formatCurrency(value)}
        />
      </ChartContainer>

      {/* Quick Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Key Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ArrowTrendingUpIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Revenue Growth</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Revenue increased by 12.5% compared to last month, driven by increased customer acquisition.
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <UsersIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Customer Growth</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Customer base grew by 15.2% with improved retention rates and new customer acquisition.
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ShoppingCartIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-900">Order Volume</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              Order volume increased by 8.3% with higher frequency purchases from existing customers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Layout title="Reporting & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reporting & Analytics</h1>
            <p className="text-gray-600">Comprehensive business intelligence and performance insights</p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-3">
            <Select
              options={dateRangeOptions}
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full sm:w-48"
            />
            <Button
              variant="outline"
              leftIcon={<FunnelIcon className="h-4 w-4" />}
            >
              Filters
            </Button>
            <Button
              leftIcon={<CalendarIcon className="h-4 w-4" />}
            >
              Export
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
