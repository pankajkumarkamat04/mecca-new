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
import { insightsAPI } from '@/lib/api';
import {
  ArchiveBoxIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  TruckIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  CubeIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

const InventoryAnalysis: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [analysisType, setAnalysisType] = useState('turnover');

  // Fetch inventory data from API
  // Unified inventory insights
  const { data: inventoryInsights, isLoading: inventoryLevelsLoading, error: inventoryLevelsError } = useQuery({
    queryKey: ['insights-inventory', dateRange, selectedCategory],
    queryFn: () => insightsAPI.getInventory({ category: selectedCategory }),
    refetchInterval: 30000
  });
  const inv = (inventoryInsights as any)?.data?.data || {};
  const levels = Array.isArray(inv.levels) ? inv.levels : [];
  const movementSeries = Array.isArray(inv.movement) ? inv.movement : [];
  const turnover = Array.isArray(inv.turnover) ? inv.turnover : [];
  const slowMoving = Array.isArray(inv.slowMoving) ? inv.slowMoving : [];
  const leadTime = Array.isArray(inv.leadTime) ? inv.leadTime : [];

  

  const slowMovingItems = { data: slowMoving } as any;
  const slowMovingLoading = false as boolean;

  

  const stockMovementData = { data: movementSeries } as any;
  const stockMovementLoading = false as boolean;

  const categoryTurnoverData = { data: turnover } as any;
  const categoryTurnoverLoading = false as boolean;

  const leadTimeAnalysisData = { data: leadTime } as any;
  const leadTimeLoading = false as boolean;

  // Fetch inventory analysis data
  const isLoading = inventoryLevelsLoading;
  const inventoryData = undefined as any;

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'shoes', label: 'Shoes' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'accessories', label: 'Accessories' },
    { value: 'home', label: 'Home & Garden' },
  ];

  const analysisTypeOptions = [
    { value: 'turnover', label: 'Turnover Analysis' },
    { value: 'levels', label: 'Stock Levels' },
    { value: 'movement', label: 'Stock Movement' },
    { value: 'leadtime', label: 'Lead Time Analysis' },
  ];

  const getStockStatus = (current: number, min: number, max: number) => {
    if (current <= min) return { status: 'Low Stock', color: 'text-red-600', bgColor: 'bg-red-100' };
    if (current >= max * 0.9) return { status: 'Overstock', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { status: 'Normal', color: 'text-green-600', bgColor: 'bg-green-100' };
  };

  const getTurnoverRating = (turnover: number) => {
    if (turnover >= 4) return { rating: 'Excellent', color: 'text-green-600' };
    if (turnover >= 3) return { rating: 'Good', color: 'text-blue-600' };
    if (turnover >= 2) return { rating: 'Average', color: 'text-yellow-600' };
    return { rating: 'Poor', color: 'text-red-600' };
  };

  const inventoryColumns = [
    {
      key: 'product',
      label: 'Product',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.product}</div>
          <div className="text-sm text-gray-500">{row.category}</div>
        </div>
      )
    },
    {
      key: 'stock',
      label: 'Stock Level',
      render: (row: any) => {
        const status = getStockStatus(row.currentStock, row.minStock, row.maxStock);
        return (
          <div>
            <div className="font-medium text-gray-900">{row.currentStock} units</div>
            <div className={`text-xs ${status.color}`}>{status.status}</div>
          </div>
        );
      }
    },
    {
      key: 'value',
      label: 'Value',
      render: (row: any) => formatCurrency(row.value)
    },
    {
      key: 'turnover',
      label: 'Turnover Rate',
      render: (row: any) => {
        const rating = getTurnoverRating(row.turnover);
        return (
          <div>
            <div className="font-medium text-gray-900">{row.turnover}x</div>
            <div className={`text-xs ${rating.color}`}>{rating.rating}</div>
          </div>
        );
      }
    }
  ];

  const slowMovingColumns = [
    {
      key: 'product',
      label: 'Product',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.product}</div>
          <div className="text-sm text-gray-500">{row.category}</div>
        </div>
      )
    },
    {
      key: 'daysInStock',
      label: 'Days in Stock',
      render: (row: any) => (
        <div className="flex items-center">
          <ClockIcon className="h-4 w-4 text-gray-400 mr-1" />
          <span className="font-medium">{row.daysInStock} days</span>
        </div>
      )
    },
    {
      key: 'lastSale',
      label: 'Last Sale',
      render: (row: any) => formatDate(row.lastSale)
    },
    {
      key: 'value',
      label: 'Value',
      render: (row: any) => formatCurrency(row.value)
    },
    {
      key: 'recommendation',
      label: 'Recommendation',
      render: (row: any) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
          {row.recommendation}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Date Range"
            options={dateRangeOptions}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
          <Select
            label="Category"
            options={categoryOptions}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          />
          <Select
            label="Analysis Type"
            options={analysisTypeOptions}
            value={analysisType}
            onChange={(e) => setAnalysisType(e.target.value)}
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
              <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
              <p className="text-2xl font-semibold text-gray-900">
                {inventoryLevelsLoading ? '...' : formatCurrency(inv?.summary?.totalInventoryValue || 0)}
              </p>
              <div className="flex items-center mt-1">
                <ArrowTrendingUpIcon className="h-4 w-4 text-green-500" />
                <span className="ml-1 text-sm font-medium text-green-600">
                  {Math.abs(inventoryData?.data?.totalValueGrowth || 0)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">vs last period</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CubeIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {inventoryLevelsLoading ? '...' : formatNumber(inv?.summary?.totalProducts || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Avg turnover: {inventoryData?.data?.avgTurnover || 0}x
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {inventoryLevelsLoading ? '...' : inv?.summary?.lowStockProducts || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Need immediate attention
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Slow Moving Items</p>
              <p className="text-2xl font-semibold text-gray-900">
                {inventoryLevelsLoading ? '...' : inv?.summary?.outOfStockProducts || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Consider discounts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Stock Movement Trend"
          description="Incoming vs outgoing inventory over time"
          trend={{ value: 5.2, isPositive: true, label: 'vs last month' }}
          contentHeight={300}
        >
          <SalesChart 
            data={stockMovementData?.data || []} 
            type="area"
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Category Turnover Rates"
          description="Inventory turnover by product category"
          trend={{ value: 8.1, isPositive: true, label: 'vs last month' }}
          contentHeight={300}
        >
          <PieChart 
            data={categoryTurnoverData?.data || []}
            height={300}
            showLegend={true}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Turnover Rate by Category"
          description="How fast inventory moves in each category"
          trend={{ value: 3.2, isPositive: true, label: 'avg turnover' }}
          contentHeight={300}
        >
          <BarChart 
            data={Array.isArray(categoryTurnoverData?.data) ? categoryTurnoverData.data.map((c: any) => ({
              name: c.name,
              value: c.turnover ?? c.turnoverRate ?? 0,
              color: c.color
            })) : []}
            height={300}
            formatValue={(value) => `${value}x`}
          />
        </ChartContainer>

        <ChartContainer
          title="Supplier Lead Time Analysis"
          description="Average delivery times and reliability"
          trend={{ value: 12, isPositive: false, label: 'avg days' }}
          contentHeight={300}
        >
          <BarChart 
            data={Array.isArray(leadTimeAnalysisData?.data) ? leadTimeAnalysisData.data.map((s: any) => ({
              name: s.supplier,
              value: s.avgLeadTime,
              color: s.color
            })) : []}
            height={300}
            formatValue={(value) => `${value} days`}
          />
        </ChartContainer>
      </div>

      {/* Inventory Levels Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Current Inventory Levels</h3>
          <p className="text-sm text-gray-600">Stock levels and turnover analysis</p>
        </div>
        <DataTable
          data={Array.isArray(levels) ? levels : []}
          columns={inventoryColumns}
          loading={inventoryLevelsLoading}
        />
      </div>

      {/* Slow Moving Items Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Slow Moving Items</h3>
          <p className="text-sm text-gray-600">Items requiring attention and optimization</p>
        </div>
        <DataTable
          data={Array.isArray(slowMoving) ? slowMoving : []}
          columns={slowMovingColumns}
          loading={slowMovingLoading}
        />
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Inventory Optimization Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ArchiveBoxIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Inventory Efficiency</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              Overall efficiency score of {inv?.efficiencyScore || 0}%. Focus on improving turnover rates.
            </p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-red-900">Stock Alerts</span>
            </div>
            <p className="text-sm text-red-700 mt-1">
              {inv?.summary?.lowStockProducts || 0} items are below minimum stock levels and need immediate restocking.
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-900">Slow Moving Items</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {inv?.summary?.outOfStockProducts || 0} items haven't moved in 60+ days. Consider promotional strategies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryAnalysis;
