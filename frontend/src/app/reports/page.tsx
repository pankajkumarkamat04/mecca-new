'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { insightsAPI } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  DocumentTextIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PrinterIcon,
} from '@heroicons/react/24/outline';

const ReportsPage: React.FC = () => {
  // Default last 30 days and default sales selected
  const todayDefault = new Date();
  const thirtyDaysAgoDefault = new Date(todayDefault.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [selectedReport, setSelectedReport] = useState<string>('sales');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: thirtyDaysAgoDefault.toISOString().split('T')[0],
    endDate: todayDefault.toISOString().split('T')[0],
  });
  const [filters, setFilters] = useState({
    category: 'all',
    paymentMethod: 'all',
  });

  // Fetch insights overview (dashboard + analytics overview)
  const { data: overview, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['insights-overview'],
    queryFn: () => insightsAPI.getOverview(),
    refetchInterval: 30000,
  });


  // Fetch unified sales insights
  const { data: salesReport, isLoading: salesLoading, error: salesError } = useQuery({
    queryKey: ['insights-sales', dateRange, filters],
    queryFn: () => insightsAPI.getSales({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      groupBy: 'day',
      category: filters.category === 'all' ? undefined : filters.category,
    }),
    enabled: selectedReport === 'sales' && !!dateRange.startDate && !!dateRange.endDate,
  });

  // Removed saved reports usage in unified module


  // Test API connectivity to insights
  React.useEffect(() => {
    const testAPI = async () => {
      try {
        const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${API_BASE_URL}/insights/overview`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
      } catch (error) {
        console.error('🔍 Insights API Test Error:', error);
      }
    };
    testAPI();
  }, []);


  const handleGenerateReport = (reportType: string) => {
    setSelectedReport(reportType);
    
    // Set default date range (last 30 days)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    setDateRange({
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    });
    
    setIsReportModalOpen(true);
  };

  const handleExecuteReport = () => {
    if (!selectedReport || !dateRange.startDate || !dateRange.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    
    // The report will be generated automatically by the useQuery hook
    // when the conditions are met (enabled: selectedReport === 'sales' && !!dateRange.startDate && !!dateRange.endDate)
    // We don't close the modal immediately so user can see the report preview
    toast.success(`${selectedReport} report generated successfully`);
  };

  // Save report removed in unified insights module

  const handleExportReport = (reportType: string) => {
    toast.success(`${reportType} report exported successfully`);
  };

  const handlePrintReport = (reportType: string) => {
    toast.success(`${reportType} report sent to printer`);
  };

  const reportTypes = [
    {
      id: 'sales',
      name: 'Sales Report',
      description: 'Revenue, transactions, and sales analytics',
      icon: ChartBarIcon,
      color: 'bg-blue-500',
    },
    {
      id: 'inventory',
      name: 'Inventory Report',
      description: 'Stock levels, movements, and valuation',
      icon: ChartBarIcon,
      color: 'bg-orange-500',
    },
  ];


  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'food', label: 'Food & Beverage' },
  ];

  const paymentMethodOptions = [
    { value: 'all', label: 'All Payment Methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'online', label: 'Online' },
  ];

  return (
    <Layout title="Reports & Analytics">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600">Generate comprehensive business reports and analytics</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
            >
              Export All
            </Button>
          </div>
        </div>

        {/* Debug Panel */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">🔍 Debug Information</h3>
          <div className="text-xs text-yellow-700 space-y-1">
            <p><strong>Overview:</strong> {overview ? 'Loaded' : 'Not loaded'}</p>
            <p><strong>Stats Loading:</strong> {statsLoading ? 'Yes' : 'No'}</p>
            <p><strong>Stats Error:</strong> {statsError ? statsError.message : 'None'}</p>
            {overview?.data?.data && (
              <div className="mt-2 pl-2 border-l-2 border-yellow-400">
                <p><strong>Monthly Sales:</strong> ${overview.data.data.dashboard?.sales?.monthlyTotal || 0}</p>
                <p><strong>Monthly Invoices:</strong> {overview.data.data.dashboard?.sales?.monthlyInvoices || 0}</p>
                <p><strong>Total Customers:</strong> {overview.data.data.dashboard?.customers?.total || 0}</p>
                <p><strong>Total Products:</strong> {overview.data.data.dashboard?.products?.total || 0}</p>
                <p><strong>Low Stock:</strong> {overview.data.data.dashboard?.products?.lowStock || 0}</p>
              </div>
            )}
            <p className="pt-2"><strong>Sales Report:</strong> {salesReport ? 'Loaded' : 'Not loaded'}</p>
            <p><strong>Selected Report:</strong> {selectedReport || 'None'}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Sales</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsLoading ? '...' : formatCurrency(overview?.data?.data?.dashboard?.sales?.monthlyTotal || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <DocumentTextIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Invoices</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsLoading ? '...' : formatNumber(overview?.data?.data?.dashboard?.sales?.monthlyInvoices || 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Customers</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {statsLoading ? '...' : formatNumber(overview?.data?.data?.dashboard?.customers?.total || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportTypes.map((report) => (
            <div
              key={report.id}
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-semibold text-gray-900">{report.name}</h3>
                </div>
              </div>
              <p className="text-gray-600 text-sm mb-4">{report.description}</p>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  onClick={() => handleGenerateReport(report.id)}
                  className="flex-1"
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Generate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportReport(report.id)}
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handlePrintReport(report.id)}
                >
                  <PrinterIcon className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Insights Sales Summary (replaces saved reports section) */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Sales Insights (Last 30 Days)</h3>
          </div>
          <div className="p-6">
            {salesLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Loading sales insights...</p>
              </div>
            ) : salesReport?.data?.data ? (
              <div className="space-y-2 text-sm text-gray-700">
                <p>• Total Sales: {formatCurrency(salesReport.data.data.summary?.totalSales || 0)}</p>
                <p>• Total Invoices: {salesReport.data.data.summary?.totalInvoices || 0}</p>
                <p>• Average Invoice: {formatCurrency(salesReport.data.data.summary?.averageInvoice || 0)}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No insights available</p>
              </div>
            )}
          </div>
        </div>

        {/* Report Generation Modal */}
        <Modal
          isOpen={isReportModalOpen}
          onClose={() => setIsReportModalOpen(false)}
          title={`Generate ${selectedReport.charAt(0).toUpperCase() + selectedReport.slice(1)} Report`}
          size="lg"
        >
          <div className="space-y-6">
            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <Input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <Input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                  fullWidth
                />
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Select
                  options={categoryOptions}
                  value={filters.category}
                  onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <Select
                  options={paymentMethodOptions}
                  value={filters.paymentMethod}
                  onChange={(e) => setFilters({ ...filters, paymentMethod: e.target.value })}
                  fullWidth
                />
              </div>
            </div>

            {/* Report Preview (Insights Sales) */}
            {salesReport && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Report Preview</h4>
                {dateRange.startDate && dateRange.endDate && (
                  <p className="text-sm text-gray-600 mb-2">
                    Report includes data from {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                  </p>
                )}
                {salesReport.data && (
                  <div className="text-sm text-gray-700">
                    <p>• Total Sales: {formatCurrency(salesReport.data.data?.summary?.totalSales || salesReport.data.data?.summary?.totalSales || 0)}</p>
                    <p>• Total Invoices: {salesReport.data.data?.summary?.totalInvoices || 0}</p>
                    <p>• Average Invoice: {formatCurrency(salesReport.data.data?.summary?.averageInvoice || 0)}</p>
                  </div>
                )}
              </div>
            )}
            
            {salesLoading && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">Generating report...</p>
              </div>
            )}
            
            {salesError && (
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-red-700">Error generating report: {salesError.message}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsReportModalOpen(false)}
              >
                {salesReport ? 'Close' : 'Cancel'}
              </Button>
              {!salesReport && (
                <Button onClick={handleExecuteReport}>
                  Generate Report
                </Button>
              )}
              {salesReport && (
                <>
                  <Button onClick={() => handleExportReport(selectedReport)}>
                    Export Report
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ReportsPage;
