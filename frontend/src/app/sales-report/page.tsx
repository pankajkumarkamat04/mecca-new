'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import DataTable from '@/components/ui/DataTable';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { reportsAnalyticsAPI, invoicesAPI } from '@/lib/api';
import { formatCurrency, formatDate, getLogoUrl } from '@/lib/utils';
import { formatAmountWithCurrency } from '@/lib/currencyUtils';
import { useSettings } from '@/contexts/SettingsContext';
import { ArrowDownTrayIcon, DocumentArrowDownIcon, EyeIcon } from '@heroicons/react/24/outline';
import { generateReportPDF, generateReportCSV } from '@/lib/reportUtils';
import toast from 'react-hot-toast';

const SalesReportPage: React.FC = () => {
  const { company } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['sales-report', currentPage, pageSize, searchTerm, filterType, filterStatus, filterSource, filterPaymentMethod, startDate, endDate],
    queryFn: () =>
      reportsAnalyticsAPI.getSalesReport({
        page: currentPage,
        limit: pageSize,
        search: searchTerm || undefined,
        type: filterType === 'all' ? undefined : filterType,
        status: filterStatus === 'all' ? undefined : filterStatus,
        source: filterSource === 'all' ? undefined : filterSource,
        paymentMethod: filterPaymentMethod === 'all' ? undefined : filterPaymentMethod,
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
    {
      key: 'paymentMethod',
      label: 'Payment Method',
      sortable: true,
      render: (row: any) => {
        if (!row.paymentMethod) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        const method = row.paymentMethod.toLowerCase();
        const methodLabels: { [key: string]: string } = {
          'cash': 'Cash',
          'card': 'Card',
          'credit_card': 'Card',
          'debit_card': 'Card',
          'bank_transfer': 'Bank Transfer',
          'stripe': 'Card',
          'paypal': 'Card',
          'other': 'Other',
        };
        const label = methodLabels[method] || method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
        return (
          <span className="text-sm text-gray-900 capitalize">
            {label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      render: (row: any) => {
        // Determine invoice ID - show button for all invoice-related rows
        // For standalone invoices: use row._id (which is the invoice ID)
        // For transactions linked to invoices: use row.invoiceId (from backend)
        const invoiceId = row.source === 'invoice' 
          ? row._id 
          : row.invoiceId;
        
        // Show view button for any row with invoice information
        // Backend ensures invoiceId is always included for invoice rows
        const showViewButton = (row.source === 'invoice' || row.sourceType === 'Invoice' || !!row.invoiceId) && !!invoiceId;
        
        if (!showViewButton) {
          return <span className="text-sm text-gray-400">-</span>;
        }
        
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (invoiceId) {
                setSelectedInvoiceId(invoiceId);
                setShowInvoiceModal(true);
              }
            }}
            title="View Invoice Details"
          >
            <EyeIcon className="h-4 w-4 mr-1" />
            View
          </Button>
        );
      },
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

  const paymentMethodOptions = [
    { value: 'all', label: 'All Payment Methods' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
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

  // Fetch invoice details when modal is open
  const { data: invoiceData, isLoading: invoiceLoading } = useQuery({
    queryKey: ['invoice-details', selectedInvoiceId],
    queryFn: () => invoicesAPI.getInvoiceById(selectedInvoiceId || ''),
    enabled: !!selectedInvoiceId && showInvoiceModal,
  });

  const selectedInvoice = invoiceData?.data?.data || null;

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <Select
                options={paymentMethodOptions}
                value={filterPaymentMethod}
                onChange={(e) => {
                  setFilterPaymentMethod(e.target.value);
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
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
            onClick={() => {
              // Clicking total transactions - could filter to show all
              setFilterStatus('all');
              setFilterType('all');
              setFilterSource('all');
              setCurrentPage(1);
            }}
            title="Click to clear all filters"
          >
            <div className="text-sm font-medium text-gray-500">Total Transactions</div>
            <div className="text-2xl font-bold text-gray-900">{summary.count || 0}</div>
          </div>
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
            onClick={() => {
              // Clicking total amount - filter by paid status
              setFilterStatus('paid');
              setCurrentPage(1);
            }}
            title="Click to filter paid transactions"
          >
            <div className="text-sm font-medium text-gray-500">Total Amount</div>
            <div className="text-2xl font-bold text-gray-900">{formatCurrency(summary.totalAmount || 0)}</div>
          </div>
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
            onClick={() => {
              // Clicking total paid - filter by paid status
              setFilterStatus('paid');
              setCurrentPage(1);
            }}
            title="Click to filter paid transactions"
          >
            <div className="text-sm font-medium text-gray-500">Total Paid</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalPaid || 0)}</div>
          </div>
          <div 
            className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-red-50 hover:border-red-300 transition-colors"
            onClick={() => {
              // Clicking outstanding balance - filter by unpaid/partial status
              setFilterStatus('partial');
              setCurrentPage(1);
            }}
            title="Click to filter unpaid transactions"
          >
            <div className="text-sm font-medium text-gray-500">Outstanding Balance</div>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalBalance || 0)}</div>
          </div>
        </div>

        {/* Source Breakdown Cards */}
        {summary.sourceBreakdown && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition-colors"
              onClick={() => {
                setFilterSource('POS/Financial');
                setCurrentPage(1);
              }}
              title="Click to filter by POS/Financial transactions"
            >
              <div className="text-sm font-medium text-gray-500">POS/Financial</div>
              <div className="text-xl font-bold text-blue-600">{summary.sourceBreakdown.transactions || 0}</div>
            </div>
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => {
                setFilterSource('Invoice');
                setCurrentPage(1);
              }}
              title="Click to filter by Invoice transactions"
            >
              <div className="text-sm font-medium text-gray-500">Invoices</div>
              <div className="text-xl font-bold text-green-600">{summary.sourceBreakdown.invoices || 0}</div>
            </div>
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-purple-50 hover:border-purple-300 transition-colors"
              onClick={() => {
                setFilterSource('Order');
                setCurrentPage(1);
              }}
              title="Click to filter by Order transactions"
            >
              <div className="text-sm font-medium text-gray-500">Orders</div>
              <div className="text-xl font-bold text-purple-600">{summary.sourceBreakdown.orders || 0}</div>
            </div>
            <div 
              className="bg-white p-4 rounded-lg shadow-sm border cursor-pointer hover:bg-orange-50 hover:border-orange-300 transition-colors"
              onClick={() => {
                setFilterSource('Workshop');
                setCurrentPage(1);
              }}
              title="Click to filter by Workshop transactions"
            >
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

        {/* Invoice Details Modal */}
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => {
            setShowInvoiceModal(false);
            setSelectedInvoiceId(null);
          }}
          title="Invoice Details"
          size="xl"
        >
          {invoiceLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600"></div>
            </div>
          ) : selectedInvoice ? (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Invoice #{(selectedInvoice as any).invoiceNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Date: {formatDate((selectedInvoice as any).invoiceDate)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Due: {(selectedInvoice as any).dueDate ? formatDate((selectedInvoice as any).dueDate) : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-3">
                    {company?.logo?.url && (
                      <Image
                        width={40}
                        height={40}
                        src={getLogoUrl(company.logo.url)}
                        alt="Logo"
                        className="object-contain"
                      />
                    )}
                    <div className="text-2xl font-bold text-gray-900">
                      {formatAmountWithCurrency(
                        (selectedInvoice as any).total || 0,
                        company?.currencySettings,
                        (selectedInvoice as any)?.currency?.displayCurrency || 'USD'
                      )}
                    </div>
                  </div>
                  {getStatusBadge((selectedInvoice as any).status)}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                {(selectedInvoice as any).customer && typeof (selectedInvoice as any).customer === 'object' ? (
                  <div>
                    <p className="font-medium">
                      {(selectedInvoice as any).customer.firstName} {(selectedInvoice as any).customer.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{(selectedInvoice as any).customer.email}</p>
                    {(selectedInvoice as any).customer.phone && (
                      <p className="text-sm text-gray-600">{(selectedInvoice as any).customer.phone}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500">No customer information</p>
                    {(selectedInvoice as any).customerPhone && (
                      <p className="text-sm text-gray-600">Phone: {(selectedInvoice as any).customerPhone}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Invoice Items */}
              {(selectedInvoice as any).items && (selectedInvoice as any).items.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                  <div className="space-y-3">
                    {(selectedInvoice as any).items.map((item: any, index: number) => {
                      const toNumber = (v: any, fb = 0) => {
                        const n = typeof v === 'string' ? Number(v) : v;
                        return Number.isFinite(n) ? n : fb;
                      };
                      const unitPrice = toNumber(item.unitPrice, 0);
                      const quantity = toNumber(item.quantity, 0);
                      const discount = toNumber(item.discount, 0);
                      const taxRate = toNumber(item.taxRate, 0);
                      
                      const subtotal = unitPrice * quantity;
                      const discountAmount = (subtotal * discount) / 100;
                      const afterDiscount = subtotal - discountAmount;
                      const taxAmount = (afterDiscount * taxRate) / 100;
                      const itemTotal = afterDiscount + taxAmount;
                      const displayCurrency = (selectedInvoice as any)?.currency?.displayCurrency || 'USD';
                      
                      return (
                        <div key={index} className="p-4 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {typeof item.product === 'object' && item.product?.name
                                  ? item.product.name
                                  : (item.name || 'Unknown Product')}
                              </p>
                              <p className="text-sm text-gray-600">
                                Qty: {quantity} × {formatAmountWithCurrency(unitPrice, company?.currencySettings, displayCurrency)}
                              </p>
                              {item.sku && (
                                <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                              )}
                            </div>
                            <p className="font-medium text-gray-900 text-lg">
                              {formatAmountWithCurrency(itemTotal, company?.currencySettings, displayCurrency)}
                            </p>
                          </div>
                          
                          {/* Tax and Discount Breakdown */}
                          <div className="text-sm text-gray-600 space-y-1">
                            <div className="flex justify-between">
                              <span>Subtotal:</span>
                              <span>{formatAmountWithCurrency(subtotal, company?.currencySettings, displayCurrency)}</span>
                            </div>
                            {discount > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Discount ({discount}%):</span>
                                <span>-{formatAmountWithCurrency(discountAmount, company?.currencySettings, displayCurrency)}</span>
                              </div>
                            )}
                            {taxRate > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Tax ({taxRate}%):</span>
                                <span>+{formatAmountWithCurrency(taxAmount, company?.currencySettings, displayCurrency)}</span>
                              </div>
                            )}
                            <div className="flex justify-between font-medium text-gray-800 border-t pt-1">
                              <span>Total:</span>
                              <span>{formatAmountWithCurrency(itemTotal, company?.currencySettings, displayCurrency)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Invoice Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                {(() => {
                  const inv: any = selectedInvoice;
                  const toNumber = (v: any, fb = 0) => {
                    const n = typeof v === 'string' ? Number(v) : v;
                    return Number.isFinite(n) ? n : fb;
                  };
                  const items = inv.items || [];
                  const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
                  const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
                  const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
                  const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
                  const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
                  const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
                  const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
                  const shippingCost = toNumber(inv.shipping?.cost);
                  const subtotal = toNumber(inv.subtotal, computedSubtotal);
                  const totalDiscount = toNumber(inv.totalDiscount, computedTotalDiscount);
                  const totalTax = toNumber(inv.totalTax, computedTotalTax);
                  const totalAmount = toNumber(inv.total, subtotal - totalDiscount + totalTax + shippingCost);
                  const paid = toNumber(inv.paid);
                  const due = toNumber(inv.balance, Math.max(0, totalAmount - paid));
                  const displayCurrency = inv.currency?.displayCurrency || 'USD';
                  
                  return (
                    <>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Subtotal:</span>
                        <span>{formatAmountWithCurrency(subtotal, company?.currencySettings, displayCurrency)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total Discount:</span>
                        <span>-{formatAmountWithCurrency(totalDiscount, company?.currencySettings, displayCurrency)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total Tax:</span>
                        <span>{formatAmountWithCurrency(totalTax, company?.currencySettings, displayCurrency)}</span>
                      </div>
                      {shippingCost > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Shipping:</span>
                          <span>{formatAmountWithCurrency(shippingCost, company?.currencySettings, displayCurrency)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-semibold text-gray-900 border-t border-gray-200 pt-2">
                        <span>Total ({displayCurrency}):</span>
                        <span>{formatAmountWithCurrency(totalAmount, company?.currencySettings, displayCurrency)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>Paid:</span>
                        <span>{formatAmountWithCurrency(paid, company?.currencySettings, displayCurrency)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-gray-900">
                        <span>Due:</span>
                        <span>{formatAmountWithCurrency(due, company?.currencySettings, displayCurrency)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Customer Address */}
              {(selectedInvoice as any).customer && typeof (selectedInvoice as any).customer === 'object' && (selectedInvoice as any).customer.address && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Customer Address:</h4>
                  <div className="text-sm text-gray-600">
                    {(selectedInvoice as any).customer.address.street && (
                      <p>{(selectedInvoice as any).customer.address.street}</p>
                    )}
                    {(selectedInvoice as any).customer.address.city && (
                      <p>
                        {(selectedInvoice as any).customer.address.city}
                        {(selectedInvoice as any).customer.address.state && `, ${(selectedInvoice as any).customer.address.state}`}
                        {(selectedInvoice as any).customer.address.zipCode && ` ${(selectedInvoice as any).customer.address.zipCode}`}
                      </p>
                    )}
                    {(selectedInvoice as any).customer.address.country && (
                      <p>{(selectedInvoice as any).customer.address.country}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Shipping Address */}
              {(selectedInvoice as any).shipping?.address && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Shipping Address:</h4>
                  <div className="text-sm text-gray-600">
                    {(selectedInvoice as any).shipping.address.street && (
                      <p>{(selectedInvoice as any).shipping.address.street}</p>
                    )}
                    {(selectedInvoice as any).shipping.address.city && (
                      <p>
                        {(selectedInvoice as any).shipping.address.city}
                        {(selectedInvoice as any).shipping.address.state && `, ${(selectedInvoice as any).shipping.address.state}`}
                        {(selectedInvoice as any).shipping.address.zipCode && ` ${(selectedInvoice as any).shipping.address.zipCode}`}
                      </p>
                    )}
                    {(selectedInvoice as any).shipping.address.country && (
                      <p>{(selectedInvoice as any).shipping.address.country}</p>
                    )}
                    {(selectedInvoice as any).shipping.method && (
                      <p className="mt-2 font-medium">Method: {(selectedInvoice as any).shipping.method}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Payment History */}
              {(selectedInvoice as any).payments && Array.isArray((selectedInvoice as any).payments) && (selectedInvoice as any).payments.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-3">Payment History</h4>
                  <div className="space-y-2">
                    {(selectedInvoice as any).payments.map((payment: any, index: number) => {
                      const displayCurrency = (selectedInvoice as any)?.currency?.displayCurrency || 'USD';
                      const paymentAmount = formatAmountWithCurrency(payment.amount || 0, company?.currencySettings, displayCurrency);
                      
                      return (
                        <div key={index} className="flex justify-between items-start p-3 bg-white rounded border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">{formatDate(payment.date)}</span>
                              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                {payment.method ? payment.method.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) : 'N/A'}
                              </span>
                            </div>
                            {payment.reference && (
                              <p className="text-sm text-gray-600">Reference: {payment.reference}</p>
                            )}
                            {payment.transactionId && (
                              <p className="text-xs text-gray-500">Transaction ID: {payment.transactionId}</p>
                            )}
                            {payment.processedBy && typeof payment.processedBy === 'object' && (
                              <p className="text-xs text-gray-500 mt-1">
                                Processed by: {payment.processedBy.firstName} {payment.processedBy.lastName}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{paymentAmount}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {(selectedInvoice as any).notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{(selectedInvoice as any).notes}</p>
                </div>
              )}

              {/* Terms */}
              {(selectedInvoice as any).terms && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2">Terms & Conditions</h4>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{(selectedInvoice as any).terms}</p>
                </div>
              )}

              {/* Invoice Metadata */}
              <div className="border-t border-gray-200 pt-4">
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                  {(selectedInvoice as any).createdBy && typeof (selectedInvoice as any).createdBy === 'object' && (
                    <div>
                      <span className="font-medium text-gray-700">Created By:</span>{' '}
                      <span>{(selectedInvoice as any).createdBy.firstName} {(selectedInvoice as any).createdBy.lastName}</span>
                    </div>
                  )}
                  {(selectedInvoice as any).createdAt && (
                    <div>
                      <span className="font-medium text-gray-700">Created At:</span>{' '}
                      <span>{formatDate((selectedInvoice as any).createdAt)}</span>
                    </div>
                  )}
                  {(selectedInvoice as any).updatedAt && (
                    <div>
                      <span className="font-medium text-gray-700">Last Updated:</span>{' '}
                      <span>{formatDate((selectedInvoice as any).updatedAt)}</span>
                    </div>
                  )}
                  {(selectedInvoice as any).currency && (
                    <div>
                      <span className="font-medium text-gray-700">Currency:</span>{' '}
                      <span>{(selectedInvoice as any).currency.displayCurrency || 'USD'}</span>
                      {(selectedInvoice as any).currency.exchangeRate && (selectedInvoice as any).currency.exchangeRate !== 1 && (
                        <span className="ml-2 text-xs">
                          (Rate: {(selectedInvoice as any).currency.exchangeRate})
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              Invoice not found
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default SalesReportPage;
