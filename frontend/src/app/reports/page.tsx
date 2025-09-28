'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { reportsAPI } from '@/lib/api';
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
  const [selectedReport, setSelectedReport] = useState<string>('');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const [filters, setFilters] = useState({
    category: 'all',
    paymentMethod: 'all',
  });

  // Fetch dashboard stats
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportsAPI.getDashboardStats(),
    refetchInterval: 30000,
  });

  // Fetch sales report
  const { data: salesReport, isLoading: salesLoading } = useQuery({
    queryKey: ['sales-report', dateRange, filters],
    queryFn: () => reportsAPI.getSalesReport({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      category: filters.category === 'all' ? undefined : filters.category,
    }),
    enabled: selectedReport === 'sales' && !!dateRange.startDate && !!dateRange.endDate,
  });

  const handleGenerateReport = (reportType: string) => {
    setSelectedReport(reportType);
    setIsReportModalOpen(true);
  };

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
                  {statsLoading ? '...' : formatCurrency(dashboardStats?.data?.data?.sales?.monthlyTotal || 0)}
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
                  {statsLoading ? '...' : formatNumber(dashboardStats?.data?.data?.sales?.monthlyInvoices || 0)}
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
                  {statsLoading ? '...' : formatNumber(dashboardStats?.data?.data?.customers?.total || 0)}
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

        {/* Recent Reports */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Reports</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Sales Report - December 2024</h4>
                    <p className="text-sm text-gray-500">Generated on {formatDate(new Date())}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <ChartBarIcon className="h-8 w-8 text-green-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Inventory Report - December 2024</h4>
                    <p className="text-sm text-gray-500">Generated on {formatDate(new Date())}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-8 w-8 text-purple-600 mr-3" />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Profit & Loss - Q4 2024</h4>
                    <p className="text-sm text-gray-500">Generated on {formatDate(new Date())}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button size="sm" variant="outline">
                    <EyeIcon className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <ArrowDownTrayIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
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

            {/* Report Preview */}
            {salesReport && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Report Preview</h4>
                <p className="text-sm text-gray-600">
                  Report will include data from {formatDate(dateRange.startDate)} to {formatDate(dateRange.endDate)}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsReportModalOpen(false)}
              >
                Cancel
              </Button>
              <Button>
                Generate Report
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default ReportsPage;
