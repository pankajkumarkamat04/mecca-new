'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { stockAlertAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { generateReportPDF, generateReportCSV } from '@/lib/reportUtils';
import toast from 'react-hot-toast';

const StockAlertsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  // Stock Alerts data
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts', { 
      page: currentPage, 
      limit: pageSize, 
      search: searchTerm, 
      alertType: alertTypeFilter === 'all' ? undefined : alertTypeFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
    }],
    queryFn: () => stockAlertAPI.getStockAlerts({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      alertType: alertTypeFilter === 'all' ? undefined : alertTypeFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
    }),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Stock Alert stats
  const { data: alertStatsData, isLoading: alertStatsLoading } = useQuery({
    queryKey: ['stock-alert-stats'],
    queryFn: () => stockAlertAPI.getStockAlertStats(),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  const checkLowStockMutation = useMutation({
    mutationFn: (data: any) => stockAlertAPI.checkLowStock(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
      toast.success(`Stock check completed. ${response?.data?.data?.alertsFound || 0} alerts found.`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check low stock');
    },
  });

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getAlertTypeColor = (alertType: string) => {
    const colors = {
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800',
      overstock: 'bg-blue-100 text-blue-800',
      expiring_soon: 'bg-orange-100 text-orange-800',
      expired: 'bg-red-100 text-red-800',
      reorder_point: 'bg-purple-100 text-purple-800',
    };
    return colors[alertType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  // Stock Alerts columns
  const alertsColumns = [
    {
      key: 'product',
      label: 'Product',
      render: (row: any) => (
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{row.productName}</div>
            <div className="text-sm text-gray-500">{row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'alertType',
      label: 'Alert Type',
      render: (row: any) => (
        <div className="flex flex-col space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertTypeColor(row.alertType)}`}>
            {(row.alertType || 'unknown').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(row.severity)}`}>
            {(row.severity || 'unknown').charAt(0).toUpperCase() + (row.severity || 'unknown').slice(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'currentStock',
      label: 'Stock Level',
      render: (row: any) => (
        <div className="text-sm">
          <div className="text-gray-900">{row.currentStock} units</div>
          <div className="text-gray-500">Threshold: {row.threshold}</div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row: any) => (
        <div className="text-sm text-gray-900">
          {row.warehouse?.name || 'No warehouse'}
        </div>
      ),
    },
    {
      key: 'supplier',
      label: 'Supplier',
      render: (row: any) => (
        <div className="text-sm text-gray-900">
          {row.supplier?.name || 'No supplier'}
        </div>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (row: any) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {row.message}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row: any) => (
        <div className="text-sm text-gray-900">
          {new Date(row.createdAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  // Export handlers
  const handleExportPDF = async () => {
    try {
      const alerts = alertsData?.data?.data || [];
      const columns = [
        { key: 'productName', label: 'Product Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'alertType', label: 'Alert Type' },
        { key: 'severity', label: 'Severity' },
        { key: 'currentStock', label: 'Current Stock' },
        { key: 'threshold', label: 'Threshold' },
        { key: 'warehouse', label: 'Warehouse', render: (row: any) => row.warehouse?.name || 'N/A' },
        { key: 'supplier', label: 'Supplier', render: (row: any) => row.supplier?.name || 'N/A' },
        { key: 'message', label: 'Message' },
        { key: 'createdAt', label: 'Created', render: (row: any) => formatDate(new Date(row.createdAt)) },
      ];
      
      await generateReportPDF('Stock Alerts Report', alerts, columns, 'stock-alerts-report');
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExportCSV = async () => {
    try {
      const alerts = alertsData?.data?.data || [];
      const columns = [
        { key: 'productName', label: 'Product Name' },
        { key: 'sku', label: 'SKU' },
        { key: 'alertType', label: 'Alert Type' },
        { key: 'severity', label: 'Severity' },
        { key: 'currentStock', label: 'Current Stock' },
        { key: 'threshold', label: 'Threshold' },
        { key: 'warehouse', label: 'Warehouse', render: (row: any) => row.warehouse?.name || 'N/A' },
        { key: 'supplier', label: 'Supplier', render: (row: any) => row.supplier?.name || 'N/A' },
        { key: 'message', label: 'Message' },
        { key: 'createdAt', label: 'Created', render: (row: any) => formatDate(new Date(row.createdAt)) },
      ];
      
      generateReportCSV('Stock Alerts Report', alerts, columns, 'stock-alerts-report');
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  return (
    <Layout title="Stock Alerts">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Stock Alerts</h1>
            <p className="text-sm text-gray-600 sm:text-base">Monitor low stock, out of stock, and other inventory alerts</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={handleExportPDF}
              leftIcon={<DocumentArrowDownIcon className="h-5 w-5" />}
            >
              Export PDF
            </Button>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              leftIcon={<ArrowDownTrayIcon className="h-5 w-5" />}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Alert Stats */}
        {alertStatsData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.data?.totalAlerts || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
                  <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.data?.criticalAlerts || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Resolved Today</p>
                  <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.data?.resolvedToday || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <ClockIcon className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Resolution Time</p>
                  <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.data?.avgResolutionTime || 0}h</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Actions */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="w-full sm:w-64">
                <Input
                  type="text"
                  placeholder="Search alerts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  options={[
                    { value: 'all', label: 'All Types' },
                    { value: 'low_stock', label: 'Low Stock' },
                    { value: 'out_of_stock', label: 'Out of Stock' },
                    { value: 'overstock', label: 'Overstock' },
                    { value: 'expiring_soon', label: 'Expiring Soon' },
                    { value: 'expired', label: 'Expired' },
                    { value: 'reorder_point', label: 'Reorder Point' },
                  ]}
                  value={alertTypeFilter}
                  onChange={(e) => setAlertTypeFilter(e.target.value)}
                  fullWidth
                />
              </div>
              <div className="w-full sm:w-48">
                <Select
                  options={[
                    { value: 'all', label: 'All Severities' },
                    { value: 'low', label: 'Low' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'high', label: 'High' },
                    { value: 'critical', label: 'Critical' },
                  ]}
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="primary"
                onClick={() => {
                  checkLowStockMutation.mutate({
                    checkAllProducts: true,
                    autoResolve: false
                  });
                }}
              >
                Check Low Stock
              </Button>
            </div>
          </div>
        </div>

        {/* Alerts Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Stock Alerts</h3>
          </div>
          <DataTable
            columns={alertsColumns}
            data={alertsData?.data?.data || []}
            loading={alertsLoading}
            pagination={{
              page: currentPage,
              limit: pageSize,
              total: alertsData?.data?.pagination?.total || 0,
              pages: alertsData?.data?.pagination?.pages || 1,
            }}
            onPageChange={setCurrentPage}
            emptyMessage="No stock alerts found"
          />
        </div>
      </div>
    </Layout>
  );
};

export default StockAlertsPage;

