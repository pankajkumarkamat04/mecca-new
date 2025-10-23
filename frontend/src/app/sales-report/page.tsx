'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { reportsAnalyticsAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowDownTrayIcon, DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { generateReportPDF, generateReportCSV } from '@/lib/reportUtils';
import toast from 'react-hot-toast';

const SalesReportPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-report', currentPage, pageSize, searchTerm, filterType, filterStatus, filterSource, startDate, endDate],
    queryFn: () =>
      reportsAnalyticsAPI.getSalesReport({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        type: filterType === 'all' ? undefined : filterType,
        status: filterStatus === 'all' ? undefined : filterStatus,
        source: filterSource === 'all' ? undefined : filterSource,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const transactions = data?.data?.data || [];
  const summary = data?.data?.summary || {};
  const pagination = data?.data?.pagination || {};

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      posted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-blue-100 text-blue-800',
      overdue: 'bg-red-100 text-red-800',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const typeColors = {
      sale: 'bg-green-100 text-green-800',
      purchase: 'bg-blue-100 text-blue-800',
      payment: 'bg-purple-100 text-purple-800',
      receipt: 'bg-yellow-100 text-yellow-800',
      expense: 'bg-red-100 text-red-800',
      income: 'bg-green-100 text-green-800',
      transfer: 'bg-indigo-100 text-indigo-800',
      adjustment: 'bg-orange-100 text-orange-800',
      journal: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${typeColors[type as keyof typeof typeColors] || 'bg-gray-100 text-gray-800'}`}>
        {type}
      </span>
    );
  };

  const columns = [
    {
      key: 'date',
      label: 'Date',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">
          {formatDate(row.date)}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">
          {row.customer || 'N/A'}
        </span>
      ),
    },
    {
      key: 'sourceType',
      label: 'Source',
      sortable: true,
      render: (row: any) => {
        const sourceColors = {
          'POS/Financial': 'bg-blue-100 text-blue-800',
          'Invoice': 'bg-green-100 text-green-800',
          'Order': 'bg-purple-100 text-purple-800',
          'Workshop': 'bg-orange-100 text-orange-800',
        };
        return (
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${sourceColors[row.sourceType as keyof typeof sourceColors] || 'bg-gray-100 text-gray-800'}`}>
            {row.sourceType}
          </span>
        );
      },
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row: any) => getTypeBadge(row.type),
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(row.total)}
        </span>
      ),
    },
    {
      key: 'tax',
      label: 'Tax',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-600">
          {formatCurrency(row.tax)}
        </span>
      ),
    },
    {
      key: 'discount',
      label: 'Discount',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-600">
          {formatCurrency(row.discount)}
        </span>
      ),
    },
    {
      key: 'grandTotal',
      label: 'Grand Total',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">
          {formatCurrency(row.grandTotal)}
        </span>
      ),
    },
    {
      key: 'paid',
      label: 'Paid',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-600">
          {formatCurrency(row.paid)}
        </span>
      ),
    },
    {
      key: 'balance',
      label: 'Balance',
      sortable: true,
      render: (row: any) => (
        <span className={`text-sm font-medium ${row.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {formatCurrency(row.balance)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => getStatusBadge(row.status),
    },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'sale', label: 'Sale' },
    { value: 'purchase', label: 'Purchase' },
    { value: 'payment', label: 'Payment' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'expense', label: 'Expense' },
    { value: 'income', label: 'Income' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' },
    { value: 'journal', label: 'Journal' },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'posted', label: 'Posted' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'paid', label: 'Paid' },
    { value: 'partial', label: 'Partial' },
    { value: 'overdue', label: 'Overdue' },
  ];

  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'POS/Financial', label: 'POS/Financial' },
    { value: 'Invoice', label: 'Invoice' },
    { value: 'Order', label: 'Order' },
    { value: 'Workshop', label: 'Workshop' },
  ];

  const handleDownloadReport = async (format: 'pdf' | 'csv') => {
    try {
      const reportData = {
        title: 'Sales Report',
        subtitle: `Generated on ${new Date().toLocaleDateString()}`,
        filters: {
          type: filterType !== 'all' ? filterType : undefined,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          dateRange: startDate && endDate ? `${startDate} to ${endDate}` : undefined,
          search: searchTerm || undefined,
        },
        summary: {
          totalTransactions: summary.count || 0,
          totalAmount: summary.totalAmount || 0,
          totalTax: summary.totalTax || 0,
          totalDiscount: summary.totalDiscount || 0,
          grandTotal: summary.grandTotal || 0,
          totalPaid: summary.totalPaid || 0,
          totalBalance: summary.totalBalance || 0,
        },
        data: transactions,
        columns: columns.map(col => ({ key: col.key, label: col.label })),
      };

      if (format === 'pdf') {
        await generateReportPDF('Sales Report', reportData);
      } else {
        await generateReportCSV('Sales Report', reportData);
      }
      
      toast.success(`${format.toUpperCase()} report downloaded successfully`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const exportCsv = () => handleDownloadReport('csv');

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-red-600">Error loading sales report: {(error as any)?.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Report</h1>
            <p className="text-gray-600">Detailed sales transactions with type information</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleDownloadReport('pdf')}>
              <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv}>
              <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <Select
                options={sourceOptions}
                value={filterSource}
                onChange={(e) => setFilterSource(e.target.value)}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Transactions</div>
            <div className="text-2xl font-bold text-gray-900">{summary.count || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Outstanding Balance</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalBalance || 0)}</div>
          </div>
        </div>

        {/* Source Breakdown Cards */}
        {summary.sourceBreakdown && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">POS/Financial</div>
              <div className="text-xl font-bold text-blue-600">{summary.sourceBreakdown.transactions || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Invoices</div>
              <div className="text-xl font-bold text-green-600">{summary.sourceBreakdown.invoices || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Orders</div>
              <div className="text-xl font-bold text-purple-600">{summary.sourceBreakdown.orders || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border">
              <div className="text-sm font-medium text-gray-500">Workshop Jobs</div>
              <div className="text-xl font-bold text-orange-600">{summary.sourceBreakdown.workshopJobs || 0}</div>
            </div>
          </div>
        )}

        {/* Data Table */}
        <div className="bg-white rounded-lg shadow-sm border">
          <DataTable
            data={transactions}
            columns={columns}
            loading={isLoading}
            pagination={{
              page: currentPage,
              limit: pageSize,
              total: pagination.total || 0,
              pages: pagination.pages || 0
            }}
            onPageChange={setCurrentPage}
            emptyMessage="No sales transactions found"
          />
        </div>
      </div>
    </Layout>
  );
};

export default SalesReportPage;
