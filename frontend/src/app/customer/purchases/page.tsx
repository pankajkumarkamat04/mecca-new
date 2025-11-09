'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery } from '@tanstack/react-query';
import { Invoice, InvoiceItem } from '@/types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentTextIcon, EyeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { invoicesAPI } from '@/lib/api';

const CustomerPurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  // Fetch customer's invoices/purchases (filtered by customer ID on backend)
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery({
    queryKey: ['customer-purchases', currentPage, pageSize],
    queryFn: () => invoicesAPI.getInvoices({
      page: currentPage,
      limit: pageSize
      // No additional filters needed - backend handles customer filtering automatically
    }),
    enabled: !!user // Only need user to be logged in
  });


  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm font-mono text-gray-900">{row.invoiceNumber}</span>
      ),
    },
    {
      key: 'invoiceDate',
      label: 'Date',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">{formatDate(row.invoiceDate)}</span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm font-medium text-gray-900">{formatCurrency(row.total)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.status === 'paid' ? 'bg-green-100 text-green-800' :
          row.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
          row.status === 'overdue' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {(row.status || 'unknown').charAt(0).toUpperCase() + (row.status || 'unknown').slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Invoice) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedInvoice(row);
              setIsInvoiceModalOpen(true);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="View Invoice"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];


  return (
    <Layout title="My Purchases">
      <div className="space-y-6">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-gray-900">Purchase History</h2>
              <p className="text-sm text-gray-600 sm:text-base">View all your purchases and order history</p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <DocumentTextIcon className="mr-2 h-5 w-5" />
              {purchasesData?.data?.pagination?.total || 0} total purchases
            </div>
          </div>
        </div>

        {/* Purchases Section */}
        <div className="rounded-lg bg-white shadow">
          <div className="flex flex-col gap-2 border-b border-gray-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center">
              <DocumentTextIcon className="mr-2 h-5 w-5 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900">Purchase History</h3>
            </div>
            <div className="text-sm text-gray-500">
              {purchasesData?.data?.pagination?.total || 0} total purchases
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={invoiceColumns}
              data={purchasesData?.data?.data || []}
              loading={purchasesLoading}
              pagination={purchasesData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No purchases found. Your purchase history will appear here once you make an order."
            />
          </div>
        </div>


        {/* Show helpful message if no purchases yet */}
        {purchasesData && purchasesData.data && purchasesData.data.data && purchasesData.data.data.length === 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  No Purchases Yet
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>You haven't made any purchases yet. Once you place an order, it will appear in your purchase history.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invoice Details Modal */}
        <Modal
          isOpen={isInvoiceModalOpen}
          onClose={() => {
            setIsInvoiceModalOpen(false);
            setSelectedInvoice(null);
          }}
          title="Invoice Details"
        >
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-500">Invoice Number</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.invoiceNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedInvoice.invoiceDate)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total Amount</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedInvoice.total)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                    selectedInvoice.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {(selectedInvoice.status || 'unknown').charAt(0).toUpperCase() + (selectedInvoice.status || 'unknown').slice(1)}
                  </span>
                </div>
              </div>
              
              {selectedInvoice.items && selectedInvoice.items.length > 0 && (
                <>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Items</label>
                    <div className="mt-2 space-y-2">
                      {selectedInvoice.items.map((item: InvoiceItem, index: number) => (
                        <div key={index} className="rounded bg-gray-50 p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.name}</p>
                              <p className="text-xs text-gray-500">
                                Qty: {item.quantity || 0} × {formatCurrency(item.unitPrice || item.price || 0)}
                              </p>
                              {item.sku && (
                                <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                              )}
                            </div>
                            <p className="text-sm font-medium">{formatCurrency((item.unitPrice || item.price || 0) * (item.quantity || 0))}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Price Summary */}
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
                        cost: selectedInvoice.shippingCost || 0
                      });
                      
                      return (
                        <PriceSummary 
                          calculation={calculation} 
                          showBreakdown={true}
                          showItems={false}
                          title=""
                          className="bg-transparent p-0"
                        />
                      );
                    })()}
                  </div>
                </>
              )}

              {selectedInvoice.customerPhone && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone Number</label>
                  <p className="text-sm text-gray-900">{selectedInvoice.customerPhone}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

      </div>
    </Layout>
  );
};

export default CustomerPurchasesPage;
