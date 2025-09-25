'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { quotationsAPI, customersAPI, productsAPI } from '@/lib/api';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { 
  DocumentTextIcon, 
  PlusIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const QuotationsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [showConvertToOrderModal, setShowConvertToOrderModal] = useState(false);

  // Fetch quotations
  const { data: quotationsData, isLoading } = useQuery(
    ['quotations', currentPage, pageSize, searchTerm, statusFilter],
    () => quotationsAPI.getQuotations({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    })
  );

  // Fetch customers for create modal
  const { data: customersData } = useQuery(
    ['customers-for-quotation'],
    () => customersAPI.getCustomers({ page: 1, limit: 100 })
  );

  // Fetch products for create modal
  const { data: productsData } = useQuery(
    ['products-for-quotation'],
    () => productsAPI.getProducts({ page: 1, limit: 100 })
  );

  // Create quotation mutation
  const createQuotationMutation = useMutation(
    (quotationData: any) => quotationsAPI.createQuotation(quotationData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotations');
        setShowCreateModal(false);
        toast.success('Quotation created successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to create quotation');
      },
    }
  );

  // Update quotation mutation
  const updateQuotationMutation = useMutation(
    ({ id, data }: { id: string; data: any }) => quotationsAPI.updateQuotation(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotations');
        setShowQuotationModal(false);
        toast.success('Quotation updated successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to update quotation');
      },
    }
  );

  // Delete quotation mutation
  const deleteQuotationMutation = useMutation(
    (id: string) => quotationsAPI.deleteQuotation(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotations');
        toast.success('Quotation deleted successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to delete quotation');
      },
    }
  );

  // Send quotation mutation
  const sendQuotationMutation = useMutation(
    (id: string) => quotationsAPI.sendQuotation(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotations');
        toast.success('Quotation sent successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to send quotation');
      },
    }
  );

  // Convert to order mutation
  const convertToOrderMutation = useMutation(
    (id: string) => quotationsAPI.convertToOrder(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotations');
        setShowConvertToOrderModal(false);
        toast.success('Quotation converted to order successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to convert quotation');
      },
    }
  );

  // Convert to invoice mutation
  const convertToInvoiceMutation = useMutation(
    (id: string) => quotationsAPI.convertToInvoice(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('quotations');
        setShowConvertModal(false);
        toast.success('Quotation converted to invoice successfully');
      },
      onError: (error: any) => {
        toast.error(error?.response?.data?.message || 'Failed to convert quotation');
      },
    }
  );

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this quotation?')) {
      deleteQuotationMutation.mutate(id);
    }
  };

  const handleSend = (id: string) => {
    if (window.confirm('Are you sure you want to send this quotation?')) {
      sendQuotationMutation.mutate(id);
    }
  };

  const handleConvertToOrder = (id: string) => {
    if (window.confirm('Are you sure you want to convert this quotation to an order?')) {
      convertToOrderMutation.mutate(id);
    }
  };

  const handleConvert = (id: string) => {
    if (window.confirm('Are you sure you want to convert this quotation to an invoice?')) {
      convertToInvoiceMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      viewed: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      expired: 'bg-orange-100 text-orange-800',
      converted: 'bg-purple-100 text-purple-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
      </span>
    );
  };

  const columns = [
    {
      key: 'quotationNumber',
      label: 'Quotation #',
      render: (value: string) => (
        <span className="font-medium text-blue-600">{value}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (value: string, row: any) => (
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-gray-500">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'quotationDate',
      label: 'Date',
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'validUntil',
      label: 'Valid Until',
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedQuotation(row);
              setShowQuotationModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {row.status === 'draft' && (
            <>
              <button
                onClick={() => {
                  setSelectedQuotation(row);
                  setShowCreateModal(true);
                }}
                className="text-green-600 hover:text-green-800"
                title="Edit"
              >
                <PencilIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => handleSend(row._id)}
                className="text-blue-600 hover:text-blue-800"
                title="Send"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status === 'accepted' && (
            <>
              <button
                onClick={() => handleConvertToOrder(row._id)}
                className="text-green-600 hover:text-green-800"
                title="Convert to Order"
              >
                <ShoppingBagIcon className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setSelectedQuotation(row);
                  setShowConvertModal(true);
                }}
                className="text-purple-600 hover:text-purple-800"
                title="Convert to Invoice"
              >
                <ArrowPathIcon className="h-4 w-4" />
              </button>
            </>
          )}
          {row.status !== 'converted' && (
            <button
              onClick={() => handleDelete(row._id)}
              className="text-red-600 hover:text-red-800"
              title="Delete"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <Layout title="Quotations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-600">Manage customer quotations and estimates</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Quotation</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search quotations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'viewed', label: 'Viewed' },
                { value: 'accepted', label: 'Accepted' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'expired', label: 'Expired' },
                { value: 'converted', label: 'Converted' },
              ]}
            />
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white shadow rounded-lg">
          <DataTable
            data={quotationsData?.data?.data || []}
            columns={columns}
            loading={isLoading}
            pagination={{
              page: currentPage,
              limit: pageSize,
              total: quotationsData?.data?.pagination?.total || 0,
              pages: quotationsData?.data?.pagination?.pages || 1,
            }}
            onPageChange={setCurrentPage}
          />
        </div>

        {/* Quotation Details Modal */}
        <Modal
          isOpen={showQuotationModal}
          onClose={() => setShowQuotationModal(false)}
          title="Quotation Details"
          size="lg"
        >
          {selectedQuotation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quotation Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuotation.quotationNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuotation.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuotation.customerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quotation Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedQuotation.quotationDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedQuotation.validUntil)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedQuotation.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              {item.description && (
                                <div className="text-sm text-gray-500">{item.description}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedQuotation.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">-{formatCurrency(selectedQuotation.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tax:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedQuotation.totalTax)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-base font-medium">Total:</span>
                      <span className="text-base font-medium">{formatCurrency(selectedQuotation.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedQuotation.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{selectedQuotation.notes}</p>
                </div>
              )}

              {/* Terms */}
              {selectedQuotation.terms && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Terms</h3>
                  <p className="text-sm text-gray-700">{selectedQuotation.terms}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Convert to Invoice Confirmation Modal */}
        <Modal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          title="Convert to Invoice"
          size="md"
        >
          {selectedQuotation && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to convert quotation <strong>{selectedQuotation.quotationNumber}</strong> to an invoice?
              </p>
              <p className="text-sm text-gray-500">
                This action cannot be undone. The quotation will be marked as converted and a new invoice will be created.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConvertModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleConvert(selectedQuotation._id)}
                  disabled={convertToInvoiceMutation.isLoading}
                >
                  {convertToInvoiceMutation.isLoading ? 'Converting...' : 'Convert to Invoice'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default QuotationsPage;
