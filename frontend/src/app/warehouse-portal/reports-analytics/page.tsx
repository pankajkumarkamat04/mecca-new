'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import WarehousePortalLayout from '../layout';
import { warehouseAPI, reportsAnalyticsAPI, receivedGoodsAPI, purchaseOrderAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChartBarIcon,
  ShoppingBagIcon,
  CubeIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TruckIcon,
  ArchiveBoxIcon,
  BuildingOfficeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import { generateReportPDF, generateReportCSV, createReportData } from '@/lib/reportUtils';
import toast from 'react-hot-toast';

const WarehouseReportsAnalyticsPage: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const { hasPermission } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  
  const canDownloadReports = hasPermission('reportsAnalytics', 'create') || hasPermission('reportsAnalytics', 'read');

  // Fetch warehouse dashboard data
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery({
    queryKey: ['warehouse-dashboard', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseDashboard(warehouseId!),
    enabled: !!warehouseId,
  });

  // Fetch inventory analytics
  const { data: inventoryAnalytics, isLoading: inventoryLoading } = useQuery({
    queryKey: ['warehouse-inventory-analytics', warehouseId, selectedPeriod],
    queryFn: () => reportsAnalyticsAPI.getInventoryAnalytics({ period: selectedPeriod, warehouseId }),
    enabled: !!warehouseId && activeTab === 'inventory',
  });

  // Fetch warehouse orders stats
  const { data: ordersStats, isLoading: ordersStatsLoading } = useQuery({
    queryKey: ['warehouse-orders-stats', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseOrders(warehouseId!, { limit: 1000 }),
    enabled: !!warehouseId && (activeTab === 'overview' || activeTab === 'orders'),
  });

  // Fetch received goods stats
  const { data: receivedGoodsStats, isLoading: receivedGoodsStatsLoading } = useQuery({
    queryKey: ['received-goods-stats', warehouseId],
    queryFn: () => receivedGoodsAPI.getReceivedGoodsStats({ warehouseId }),
    enabled: !!warehouseId && activeTab === 'receiving',
  });

  // Fetch purchase orders stats
  const { data: purchaseOrdersStats, isLoading: purchaseOrdersStatsLoading } = useQuery({
    queryKey: ['purchase-orders-stats', warehouseId],
    queryFn: () => purchaseOrderAPI.getPurchaseOrderStats(),
    enabled: !!warehouseId && activeTab === 'procurement',
  });

  // Fetch purchase orders list for detailed analytics
  const { data: purchaseOrdersData, isLoading: purchaseOrdersLoading } = useQuery({
    queryKey: ['purchase-orders-list', warehouseId],
    queryFn: () => purchaseOrderAPI.getPurchaseOrders({ limit: 1000 }),
    enabled: !!warehouseId && activeTab === 'procurement',
  });

  // Fetch received goods list for detailed analytics
  const { data: receivedGoodsData, isLoading: receivedGoodsLoading } = useQuery({
    queryKey: ['received-goods-list', warehouseId],
    queryFn: () => receivedGoodsAPI.getReceivedGoods({ limit: 1000 }),
    enabled: !!warehouseId && activeTab === 'receiving',
  });

  const statistics = dashboardData?.data?.data?.statistics || {};
  const warehouse = dashboardData?.data?.data?.warehouse;

  // Calculate orders statistics
  const orders = ordersStats?.data?.data || [];
  const ordersByStatus = orders.reduce((acc: any, order: any) => {
    const status = order.orderStatus || 'pending';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const totalOrdersValue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
  const pendingOrders = orders.filter((o: any) => o.orderStatus === 'pending').length;
  const processingOrders = orders.filter((o: any) => o.orderStatus === 'processing').length;

  const inventoryData = inventoryAnalytics?.data?.data || {};
  const stockMovements = inventoryData.stockMovements || [];
  const topMovingProducts = inventoryData.topMovingProducts || [];
  const reorderAlerts = inventoryData.reorderAlerts || [];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'inventory', name: 'Inventory', icon: CubeIcon },
    { id: 'orders', name: 'Orders', icon: ShoppingBagIcon },
    { id: 'receiving', name: 'Receiving', icon: TruckIcon },
    { id: 'procurement', name: 'Procurement', icon: ArchiveBoxIcon },
  ];

  const downloadReport = async (type: 'pdf' | 'csv') => {
    if (!canDownloadReports) {
      toast.error('You do not have permission to download reports');
      return;
    }

    try {
      const reportTitle = `Warehouse Reports - ${warehouse?.name || 'Warehouse'}`;
      const reportData = createReportData(
        {
          totalProducts: statistics.totalProducts || 0,
          lowStockAlerts: statistics.lowStockProducts || 0,
          totalStockValue: statistics.totalStockValue || 0,
          activeEmployees: statistics.activeEmployees || 0,
          totalOrders: orders.length,
          pendingOrders: pendingOrders,
          processingOrders: processingOrders,
          totalOrdersValue: totalOrdersValue,
        },
        [],
        undefined
      );

      if (type === 'pdf') {
        await generateReportPDF(
          reportTitle,
          reportData,
          undefined,
          `warehouse_report_${warehouse?.code || 'all'}.pdf`
        );
        toast.success('PDF report downloaded successfully');
      } else {
        generateReportCSV(
          reportTitle,
          reportData,
          undefined,
          `warehouse_report_${warehouse?.code || 'all'}.csv`
        );
        toast.success('CSV report downloaded successfully');
      }
    } catch (error) {
      console.error('Download report error:', error);
      toast.error('Failed to download report');
    }
  };

  const getPeriodLabel = (period: string) => {
    const labels: any = {
      '7d': 'Last 7 Days',
      '30d': 'Last 30 Days',
      '90d': 'Last 90 Days',
      '1y': 'Last Year',
      'all': 'All Time'
    };
    return labels[period] || period;
  };

  if (!warehouseId) {
    return (
      <WarehousePortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Warehouse Selected</h3>
            <p className="text-gray-600">Please select a warehouse to view reports and analytics</p>
          </div>
        </div>
      </WarehousePortalLayout>
    );
  }

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Reports & Analytics</h1>
            <p className="text-sm text-gray-600 sm:text-base">{warehouse?.name || 'Warehouse Analytics'}</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
            {canDownloadReports && (
              <>
                <Button
                  onClick={() => downloadReport('pdf')}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 sm:w-auto"
                >
                  <DocumentArrowDownIcon className="h-5 w-5" />
                  Download PDF
                </Button>
                <Button
                  onClick={() => downloadReport('csv')}
                  variant="outline"
                  size="sm"
                  className="flex items-center justify-center gap-2 sm:w-auto"
                >
                  <ArrowDownTrayIcon className="h-5 w-5" />
                  Download CSV
                </Button>
              </>
            )}
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="rounded-md border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 border-b-2 py-3 px-1 text-sm font-medium whitespace-nowrap
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }
                `}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {/* Total Products */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {statistics.totalProducts || 0}
                    </p>
                  </div>
                  <div className="bg-blue-100 rounded-full p-3">
                    <CubeIcon className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Low Stock Alerts */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {statistics.lowStockProducts || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-100 rounded-full p-3">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Total Stock Value */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Stock Value</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {formatCurrency(statistics.totalStockValue || 0)}
                    </p>
                  </div>
                  <div className="bg-green-100 rounded-full p-3">
                    <CurrencyDollarIcon className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Active Employees */}
              <div className="rounded-lg bg-white p-6 shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Active Employees</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {statistics.activeEmployees || 0}
                    </p>
                  </div>
                  <div className="bg-purple-100 rounded-full p-3">
                    <BuildingOfficeIcon className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Summary */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Orders Summary</h3>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Value</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {formatCurrency(totalOrdersValue)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Processing</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{processingOrders}</p>
                  </div>
                </div>

                {/* Orders by Status */}
                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-medium text-gray-700">Orders by Status</h4>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                    {Object.entries(ordersByStatus).map(([status, count]: any) => (
                      <div key={status} className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-600 capitalize">{status.replace('_', ' ')}</p>
                        <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Stock Movements */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(dashboardData?.data?.data?.recentMovements && dashboardData.data.data.recentMovements.length > 0 ? (
                      dashboardData.data.data.recentMovements.slice(0, 10).map((movement: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {movement.product?.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              bg-blue-100 text-blue-800 capitalize">
                              {movement.movementType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {movement.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(movement.totalCost || 0)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(movement.createdAt)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-sm text-gray-500">
                          No recent stock movements
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* Stock Value Analysis */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Stock Movement Analysis</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {stockMovements.map((movement: any) => (
                  <div key={movement._id} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600 capitalize">{movement._id.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{movement.count || 0}</p>
                    <p className="text-xs text-gray-500 mt-1">{movement.totalQuantity || 0} units</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Moving Products */}
            <div className="rounded-lg bg-white shadow">
              <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                <h3 className="text-lg font-medium text-gray-900">Top Moving Products</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Movement</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Value</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {topMovingProducts.map((product: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {product.product?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {product.totalMovement || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(product.totalValue || 0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reorder Alerts */}
            {reorderAlerts.length > 0 && (
              <div className="rounded-lg bg-white shadow">
                <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                  <h3 className="text-lg font-medium text-gray-900">Reorder Alerts</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min Stock</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reorderAlerts.map((product: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {product.name || 'Unknown'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                            {product.inventory?.currentStock || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {product.inventory?.minStock || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency((product.pricing?.costPrice || 0) * (product.inventory?.currentStock || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Orders Statistics</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">{orders.length}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-3xl font-bold text-green-600 mt-2">
                    {formatCurrency(totalOrdersValue)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingOrders}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Processing</p>
                  <p className="text-3xl font-bold text-blue-600 mt-2">{processingOrders}</p>
                </div>
              </div>
            </div>

            {/* Orders by Status Chart */}
            <div className="rounded-lg bg-white p-6 shadow">
              <h3 className="mb-4 text-lg font-medium text-gray-900">Orders by Status</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {Object.entries(ordersByStatus).map(([status, count]: any) => (
                  <div key={status} className="bg-gray-50 rounded-lg p-4 text-center">
                    <p className="text-xs text-gray-600 capitalize">{status.replace('_', ' ')}</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Receiving Tab */}
        {activeTab === 'receiving' && (
          <div className="space-y-6">
            {receivedGoodsStatsLoading ? (
              <div className="rounded-lg bg-white p-12 text-center shadow">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading receiving analytics...</p>
              </div>
            ) : (
              <>
                {/* Receiving Statistics */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Receiving Statistics</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Receipts</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {receivedGoodsStats?.data?.totalReceipts || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Pending</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-2">
                        {receivedGoodsStats?.data?.pendingReceipts || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Approved</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {receivedGoodsStats?.data?.approvedReceipts || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Items</p>
                      <p className="text-3xl font-bold text-blue-600 mt-2">
                        {receivedGoodsStats?.data?.totalItems || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Received Goods by Status */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Receiving by Status</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Pending</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {receivedGoodsStats?.data?.pendingReceipts || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Inspected</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {receivedGoodsStats?.data?.inspectedReceipts || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Approved</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {receivedGoodsStats?.data?.approvedReceipts || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Rejected</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {receivedGoodsStats?.data?.rejectedReceipts || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {formatCurrency(receivedGoodsStats?.data?.totalValue || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Receipts */}
                {receivedGoodsData && (
                  <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                      <h3 className="text-lg font-medium text-gray-900">Recent Receipts</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Order</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(receivedGoodsData?.data?.data || []).slice(0, 10).map((receipt: any) => (
                            <tr key={receipt._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {receipt.receiptNumber || receipt._id}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {receipt.purchaseOrder?.orderNumber || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(receipt.receivedDate || receipt.createdAt)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {receipt.totalItems || 0}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  receipt.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  receipt.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  receipt.status === 'inspected' ? 'bg-blue-100 text-blue-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {receipt.status || 'pending'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(receipt.totalValue || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Procurement Tab */}
        {activeTab === 'procurement' && (
          <div className="space-y-6">
            {purchaseOrdersStatsLoading ? (
              <div className="rounded-lg bg-white p-12 text-center shadow">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-gray-600 mt-4">Loading procurement analytics...</p>
              </div>
            ) : (
              <>
                {/* Procurement Statistics */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Procurement Statistics</h3>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {purchaseOrdersStats?.data?.totalOrders || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="text-3xl font-bold text-green-600 mt-2">
                        {formatCurrency(purchaseOrdersStats?.data?.totalValue || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Pending Value</p>
                      <p className="text-3xl font-bold text-yellow-600 mt-2">
                        {formatCurrency(purchaseOrdersStats?.data?.pendingValue || 0)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Overdue</p>
                      <p className="text-3xl font-bold text-red-600 mt-2">
                        {purchaseOrdersStats?.data?.overdueOrders || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Purchase Orders by Status */}
                <div className="rounded-lg bg-white p-6 shadow">
                  <h3 className="mb-4 text-lg font-medium text-gray-900">Purchase Orders by Status</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Draft</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {purchaseOrdersStats?.data?.draftOrders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Sent</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {purchaseOrdersStats?.data?.sentOrders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Confirmed</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {purchaseOrdersStats?.data?.confirmedOrders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Completed</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {purchaseOrdersStats?.data?.completedOrders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Partial</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">
                        {purchaseOrdersStats?.data?.partialOrders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Cancelled</p>
                      <p className="text-2xl font-bold text-red-600 mt-1">
                        {purchaseOrdersStats?.data?.cancelledOrders || 0}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Total Value</p>
                      <p className="text-2xl font-bold text-green-600 mt-1">
                        {formatCurrency(purchaseOrdersStats?.data?.totalValue || 0)}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-gray-600">Pending Value</p>
                      <p className="text-2xl font-bold text-yellow-600 mt-1">
                        {formatCurrency(purchaseOrdersStats?.data?.pendingValue || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Recent Purchase Orders */}
                {purchaseOrdersData && (
                  <div className="rounded-lg bg-white shadow">
                    <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
                      <h3 className="text-lg font-medium text-gray-900">Recent Purchase Orders</h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order #</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(purchaseOrdersData?.data?.data || []).slice(0, 10).map((order: any) => (
                            <tr key={order._id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {order.orderNumber}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.supplierName || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatDate(order.orderDate)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {order.expectedDeliveryDate ? formatDate(order.expectedDeliveryDate) : 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  order.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                                  order.status === 'confirmed' ? 'bg-purple-100 text-purple-800' :
                                  'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {order.status || 'draft'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {formatCurrency(order.totalAmount || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </WarehousePortalLayout>
  );
};

export default WarehouseReportsAnalyticsPage;

