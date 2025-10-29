'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { reportsAnalyticsAPI, salesOutletsAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { ArrowDownTrayIcon, DocumentArrowDownIcon, BuildingStorefrontIcon, EyeIcon } from '@heroicons/react/24/outline';
import { generateReportPDF, generateReportCSV } from '@/lib/reportUtils';
import toast from 'react-hot-toast';

const OutletSalesReportPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [selectedOutlet, setSelectedOutlet] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedOutletForModal, setSelectedOutletForModal] = useState<string | null>(null);
  const [showOutletDetailsModal, setShowOutletDetailsModal] = useState(false);
  const [modalTab, setModalTab] = useState<'stats' | 'transactions'>('stats');

  // Fetch active sales outlets
  const { data: outletsData } = useQuery({
    queryKey: ['sales-outlets-active'],
    queryFn: () => salesOutletsAPI.getActiveOutlets(),
  });

  const outlets = outletsData?.data?.data || [];
  const outletOptions = [
    { value: 'all', label: 'All Outlets' },
    ...outlets.map((outlet: any) => ({
      value: outlet._id || outlet.id,
      label: outlet.name || outlet.outletCode || 'Unknown Outlet'
    }))
  ];

  const { data, isLoading, error } = useQuery({
    queryKey: ['outlet-sales-report', currentPage, pageSize, searchTerm, filterType, filterStatus, filterSource, selectedOutlet, startDate, endDate],
    queryFn: () =>
      reportsAnalyticsAPI.getSalesReport({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        type: filterType === 'all' ? undefined : filterType,
        status: filterStatus === 'all' ? undefined : filterStatus,
        source: filterSource === 'all' ? undefined : filterSource,
        salesOutletId: selectedOutlet === 'all' ? undefined : selectedOutlet,
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
      key: 'salesOutlet',
      label: 'Sales Outlet',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">
          {row.salesOutlet || 'N/A'}
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
      const selectedOutletName = selectedOutlet === 'all' 
        ? 'All Outlets' 
        : outlets.find((o: any) => (o._id || o.id) === selectedOutlet)?.name || 'Selected Outlet';
      
      const reportData = {
        title: 'Outlet Sales Report',
        subtitle: `${selectedOutletName} - Generated on ${new Date().toLocaleDateString()}`,
        filters: {
          outlet: selectedOutletName,
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
        await generateReportPDF('Outlet Sales Report', reportData);
      } else {
        await generateReportCSV('Outlet Sales Report', reportData);
      }
      
      toast.success(`${format.toUpperCase()} report downloaded successfully`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  const exportCsv = () => handleDownloadReport('csv');

  // Fetch outlet stats when modal is open (must be before early return)
  const { data: outletStatsData, isLoading: statsLoading } = useQuery({
    queryKey: ['outlet-stats', selectedOutletForModal],
    queryFn: () => salesOutletsAPI.getOutletStats(selectedOutletForModal || ''),
    enabled: !!selectedOutletForModal && showOutletDetailsModal && modalTab === 'stats',
  });

  // Fetch outlet transactions when modal is open (must be before early return)
  const { data: outletTransactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['outlet-transactions', selectedOutletForModal, startDate, endDate],
    queryFn: () =>
      reportsAnalyticsAPI.getSalesReport({
        salesOutletId: selectedOutletForModal || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: 50,
      }),
    enabled: !!selectedOutletForModal && showOutletDetailsModal && modalTab === 'transactions',
  });

  if (error) {
    return (
      <Layout title="Outlet Sales Report">
        <div className="text-center py-8">
          <p className="text-red-600">Error loading outlet sales report: {(error as any)?.message}</p>
        </div>
      </Layout>
    );
  }

  const outletStats = outletStatsData?.data?.data || {};
  const outletTransactions = outletTransactionsData?.data?.data || [];

  const handleViewOutletDetails = (outletId: string) => {
    setSelectedOutletForModal(outletId);
    setShowOutletDetailsModal(true);
    setModalTab('stats');
  };

  const selectedOutletName = selectedOutlet === 'all' 
    ? 'All Outlets' 
    : outlets.find((o: any) => (o._id || o.id) === selectedOutlet)?.name || 'Selected Outlet';

  const selectedOutletDetails = outlets.find((o: any) => (o._id || o.id) === selectedOutletForModal);

  return (
    <Layout title="Outlet Sales Report">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Outlet Sales Report</h1>
            <p className="text-gray-600">Sales transactions by outlet over a specific period</p>
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

        {/* Sales Outlets List */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <BuildingStorefrontIcon className="h-5 w-5 mr-2" />
              Sales Outlets
            </h2>
          </div>
          <div className="p-4">
            {outlets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No sales outlets found
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {outlets.map((outlet: any) => (
                  <div
                    key={outlet._id || outlet.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{outlet.name || 'Unknown Outlet'}</h3>
                        {outlet.outletCode && (
                          <p className="text-sm text-gray-500 mt-1">Code: {outlet.outletCode}</p>
                        )}
                        {outlet.address?.city && (
                          <p className="text-sm text-gray-500 mt-1">{outlet.address.city}</p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleViewOutletDetails(outlet._id || outlet.id)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <BuildingStorefrontIcon className="h-4 w-4 inline mr-1" />
                Sales Outlet
              </label>
              <Select
                options={outletOptions}
                value={selectedOutlet}
                onChange={(e) => {
                  setSelectedOutlet(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <Select
                options={sourceOptions}
                value={filterSource}
                onChange={(e) => {
                  setFilterSource(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                fullWidth
              />
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Outlet</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{selectedOutletName}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Transactions</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{summary.count || 0}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalAmount || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Paid</div>
            <div className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(summary.totalPaid || 0)}</div>
          </div>
        </div>

        {/* Additional Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Outstanding Balance</div>
            <div className="text-xl font-bold text-red-600 mt-1">{formatCurrency(summary.totalBalance || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Tax</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalTax || 0)}</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="text-sm font-medium text-gray-500">Total Discount</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(summary.totalDiscount || 0)}</div>
          </div>
        </div>

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
            emptyMessage="No sales transactions found for the selected outlet and period"
          />
        </div>

        {/* Outlet Details Modal */}
        <Modal
          isOpen={showOutletDetailsModal}
          onClose={() => {
            setShowOutletDetailsModal(false);
            setSelectedOutletForModal(null);
          }}
          title={selectedOutletDetails?.name || 'Outlet Details'}
          description={selectedOutletDetails?.outletCode ? `Code: ${selectedOutletDetails.outletCode}` : undefined}
          size="xl"
        >
          <div className="space-y-4">
            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setModalTab('stats')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    modalTab === 'stats'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Statistics
                </button>
                <button
                  onClick={() => setModalTab('transactions')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    modalTab === 'transactions'
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Transactions
                </button>
              </nav>
            </div>

            {/* Stats Tab */}
            {modalTab === 'stats' && (
              <div className="space-y-4">
                {statsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-500">Total Sales</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(outletStats.totalSales ?? 0)}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-500">Total Transactions</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {outletStats.totalTransactions ?? 0}
                      </div>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-sm font-medium text-gray-500">Average Transaction Value</div>
                      <div className="text-2xl font-bold text-gray-900 mt-1">
                        {formatCurrency(outletStats.averageTransactionValue ?? 0)}
                      </div>
                    </div>
                    {outletStats.lastSaleDate && (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="text-sm font-medium text-gray-500">Last Sale Date</div>
                        <div className="text-lg font-semibold text-gray-900 mt-1">
                          {formatDate(outletStats.lastSaleDate)}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Transactions Tab */}
            {modalTab === 'transactions' && (
              <div className="space-y-4">
                {transactionsLoading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {outletTransactions.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No transactions found for this outlet
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Source
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total
                              </th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {outletTransactions.map((transaction: any, index: number) => (
                              <tr key={transaction._id || index} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(transaction.date)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                  {transaction.customer || 'N/A'}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    transaction.sourceType === 'POS/Financial' ? 'bg-blue-100 text-blue-800' :
                                    transaction.sourceType === 'Invoice' ? 'bg-green-100 text-green-800' :
                                    transaction.sourceType === 'Order' ? 'bg-purple-100 text-purple-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {transaction.sourceType}
                                  </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {formatCurrency(transaction.grandTotal || transaction.total || 0)}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {getStatusBadge(transaction.status)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default OutletSalesReportPage;

