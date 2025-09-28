'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { Invoice, InvoiceItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import DataTable from '@/components/ui/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { invoicesAPI } from '@/lib/api';
import { 
  DocumentTextIcon, 
  EyeIcon, 
  PrinterIcon, 
  ArrowDownTrayIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';

const CustomerInvoicesPage: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Fetch customer's invoices
  const { data: invoicesData, isLoading, refetch } = useQuery({
    queryKey: ['customer-invoices', currentPage, pageSize, searchTerm, statusFilter],
    queryFn: () => invoicesAPI.getInvoices({
      page: currentPage,
      limit: pageSize,
      customerPhone: user?.phone,
      search: searchTerm || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
    enabled: !!user?.phone
  });


  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    // Implement print functionality
    window.print();
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    // Implement download functionality
    console.log('Download invoice:', invoice._id);
  };

  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-gray-900">{value}</span>
      ),
    },
    {
      key: 'invoiceDate',
      label: 'Date',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900">{value ? formatDate(value) : 'N/A'}</span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm font-medium text-gray-900">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'paid',
      label: 'Paid',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm font-medium text-green-600">{formatCurrency(value || 0)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'paid' ? 'bg-green-100 text-green-800' :
          value === 'partial' ? 'bg-yellow-100 text-yellow-800' :
          value === 'overdue' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Invoice) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewInvoice(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Invoice"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handlePrintInvoice(row)}
            className="text-gray-600 hover:text-gray-900"
            title="Print Invoice"
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDownloadInvoice(row)}
            className="text-green-600 hover:text-green-900"
            title="Download Invoice"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const getStatusCounts = () => {
    if (isLoading || !invoicesData?.data?.data?.data || !Array.isArray(invoicesData.data.data.data)) {
      return {
        total: 0,
        paid: 0,
        partial: 0,
        overdue: 0,
      };
    }
    
    const invoices = invoicesData.data.data.data;
    return {
      total: invoices.length,
      paid: invoices.filter((inv: Invoice) => inv.status === 'paid').length,
      partial: invoices.filter((inv: Invoice) => inv.status === 'partial').length,
      overdue: invoices.filter((inv: Invoice) => inv.status === 'overdue').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <Layout title="My Invoices">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">My Invoices</h2>
              <p className="text-gray-600">Manage and view all your invoices</p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              {statusCounts.total} total invoices
            </div>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-green-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Paid</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.paid}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-yellow-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Partial</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.partial}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                  <div className="h-4 w-4 bg-red-600 rounded-full"></div>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{statusCounts.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="overdue">Overdue</option>
                <option value="pending">Pending</option>
              </select>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <FunnelIcon className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </div>

        {/* Invoices Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Invoice History</h3>
              </div>
              <div className="text-sm text-gray-500">
                {invoicesData?.data?.data?.pagination?.total || 0} total invoices
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={invoiceColumns}
              data={Array.isArray(invoicesData?.data?.data?.data) ? invoicesData.data.data.data : []}
              loading={isLoading}
              pagination={invoicesData?.data?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No invoices found. Your invoices will appear here when available."
            />
          </div>
        </div>

        {/* Phone Number Required Message */}
        {!user?.phone && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Phone Number Required
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>You must have a phone number in your profile to view invoices. 
                  Please update your profile with a valid phone number to access your invoices.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Modal */}
        <Modal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          title={`Invoice ${selectedInvoice?.invoiceNumber || ''}`}
          size="lg"
        >
          {selectedInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Invoice Details</h4>
                  <p className="text-sm text-gray-600">Invoice #: {selectedInvoice.invoiceNumber}</p>
                  <p className="text-sm text-gray-600">Date: {formatDate(selectedInvoice.invoiceDate)}</p>
                  <p className="text-sm text-gray-600">Due Date: {selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : 'N/A'}</p>
                  {(selectedInvoice as any).customerPhone && (
                    <p className="text-sm text-gray-600">Phone: {(selectedInvoice as any).customerPhone}</p>
                  )}
                </div>
                <div className="text-right">
                  <h4 className="font-medium text-gray-900">Status</h4>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedInvoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {selectedInvoice.status.charAt(0).toUpperCase() + selectedInvoice.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Invoice Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                <div className="space-y-2">
                  {selectedInvoice.items?.map((item: InvoiceItem, index: number) => {
                    const unitPrice = item.unitPrice || item.price || 0;
                    const quantity = item.quantity || 0;
                    const discount = item.discount || 0;
                    const taxRate = item.taxRate || 0;
                    
                    // Calculate breakdown
                    const subtotal = unitPrice * quantity;
                    const discountAmount = (subtotal * discount) / 100;
                    const afterDiscount = subtotal - discountAmount;
                    const taxAmount = (afterDiscount * taxRate) / 100;
                    const itemTotal = afterDiscount + taxAmount;
                    
                    return (
                      <div key={index} className="p-3 bg-gray-50 rounded">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            <p className="text-sm text-gray-600">
                              Qty: {quantity} × {formatCurrency(unitPrice)}
                            </p>
                            {item.sku && (
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{formatCurrency(itemTotal)}</p>
                        </div>
                        
                        {/* Tax and Discount Breakdown */}
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount ({discount}%):</span>
                              <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                          )}
                          {taxRate > 0 && (
                            <div className="flex justify-between text-blue-600">
                              <span>Tax ({taxRate}%):</span>
                              <span>+{formatCurrency(taxAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-gray-700 border-t pt-1">
                            <span>Total:</span>
                            <span>{formatCurrency(itemTotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice Totals */}
              <div className="border-t pt-4">
                {(() => {
                  const priceItems = selectedInvoice.items?.map((item: InvoiceItem) => ({
                    name: item.name,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || item.price || 0,
                    discount: item.discount || 0,
                    taxRate: item.taxRate || 0
                  })) || [];
                  
                  const calculation = calculatePrice(priceItems, [], [], {
                    cost: selectedInvoice.shipping?.cost || 0
                  });
                  
                  return (
                    <div className="space-y-4">
                      <PriceSummary 
                        calculation={calculation} 
                        showBreakdown={true}
                        showItems={false}
                        title=""
                        className="bg-transparent p-0"
                      />
                      
                      {/* Payment Status */}
                      <div className="space-y-2 pt-2 border-t">
                        <div className="flex justify-between text-green-600">
                          <span>Paid:</span>
                          <span>{formatCurrency(selectedInvoice.paid || 0)}</span>
                        </div>
                        <div className="flex justify-between text-red-600">
                          <span>Balance:</span>
                          <span>{formatCurrency(selectedInvoice.total - (selectedInvoice.paid || 0))}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  className="flex items-center gap-2"
                >
                  <PrinterIcon className="h-4 w-4" />
                  Print
                </Button>
                <Button
                  onClick={() => handleDownloadInvoice(selectedInvoice)}
                  className="flex items-center gap-2"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerInvoicesPage;