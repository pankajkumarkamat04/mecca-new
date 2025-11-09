'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Quotation } from '@/types';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  ShoppingCartIcon,
  PrinterIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { quotationsAPI } from '@/lib/api';
import CreateQuotationForm from '@/components/quotations/CreateQuotationForm';
import InventoryCheckModal from '@/components/quotations/InventoryCheckModal';
import PickingListModal from '@/components/quotations/PickingListModal';
import QuotationReceipt from '@/components/ui/QuotationReceipt';
import { downloadReceipt, printReceipt } from '@/lib/receiptUtils';

const QuotationsPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [showPickingListModal, setShowPickingListModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch quotations
  const { data: quotationsData, isLoading, error } = useQuery({
    queryKey: ['quotations', searchTerm, statusFilter],
    queryFn: () => quotationsAPI.getQuotations({
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
    }),
  });

  // Fetch quotation statistics
  const { data: statsData } = useQuery({
    queryKey: ['quotationStats'],
    queryFn: quotationsAPI.getQuotationStats,
  });

  // Check inventory mutation
  const checkInventoryMutation = useMutation({
    mutationFn: (items: any[]) => quotationsAPI.checkInventoryAvailability({ items }),
    onSuccess: (data: any) => {
      if (selectedQuotation) {
        setSelectedQuotation({ ...selectedQuotation, inventoryCheck: data.data });
        setShowInventoryModal(true);
        toast.success('Inventory check completed');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check inventory');
    },
  });

  // Generate picking list mutation
  const generatePickingListMutation = useMutation({
    mutationFn: (quotationId: string) => quotationsAPI.generatePickingList(quotationId),
    onSuccess: (data: any) => {
      if (selectedQuotation) {
        setSelectedQuotation({ ...selectedQuotation, pickingList: data.data });
        setShowPickingListModal(true);
        toast.success('Picking list generated successfully');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to generate picking list');
    },
  });

  // Update quotation status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      quotationsAPI.updateQuotation(id, { status }),
    onSuccess: () => {
      toast.success('Quotation status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['quotationStats'] });
    },
    onError: (error: any) => {
      console.error('Error updating quotation status:', error);
      toast.error(error.response?.data?.message || 'Failed to update quotation status');
    },
  });

  // Convert to order feature removed

  const quotations = quotationsData?.data?.data || [];
  const stats = statsData?.data?.data || {};

  const handleViewDetails = (quotation: any) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  const handleEditQuotation = (quotation: any) => {
    setSelectedQuotation(quotation);
    setShowEditModal(true);
  };

  const handleCheckInventory = (quotation: any) => {
    setSelectedQuotation(quotation);
    const items = quotation.items.map((item: any) => ({
      product: item.product._id || item.product,
      quantity: item.quantity
    }));
    checkInventoryMutation.mutate(items);
  };

  const handleGeneratePickingList = (quotation: any) => {
    setSelectedQuotation(quotation);
    generatePickingListMutation.mutate(quotation._id);
  };

  const handleUpdateStatus = (quotation: any, newStatus: string) => {
    if (window.confirm(`Are you sure you want to change the status to "${newStatus}"?`)) {
      updateStatusMutation.mutate({ id: quotation._id, status: newStatus });
    }
  };

  // const handleConvertToOrder = () => {};

  const handleShowReceipt = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowReceiptModal(true);
  };

  const handlePrintReceipt = async () => {
    if (!selectedQuotation) return;
    try {
      const elementId = 'full-invoice';
      await printReceipt(elementId);
    } catch (error) {
      console.error('Error printing receipt:', error);
      toast.error('Failed to print receipt');
    }
  };

  const handleDownloadReceipt = async () => {
    if (!selectedQuotation) return;
    try {
      const elementId = 'full-invoice';
      await downloadReceipt(elementId, 'full');
    } catch (error) {
      console.error('Error downloading receipt:', error);
      toast.error('Failed to download receipt');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'gray', icon: ClockIcon },
      sent: { color: 'blue', icon: DocumentTextIcon },
      viewed: { color: 'yellow', icon: EyeIcon },
      accepted: { color: 'green', icon: CheckCircleIcon },
      rejected: { color: 'red', icon: XCircleIcon },
      expired: { color: 'gray', icon: XCircleIcon },
      converted: { color: 'blue', icon: ShoppingCartIcon },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge color={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const columns = [
    {
      key: 'quotationNumber',
      header: 'Quotation #',
      render: (quotation: any) => (
        <div className="font-medium text-gray-900">{quotation.quotationNumber}</div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (quotation: any) => (
        <div>
          <div className="font-medium text-gray-900">{quotation.customerName}</div>
          <div className="text-sm text-gray-500">{quotation.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      render: (quotation: any) => (
        <div className="font-medium text-gray-900">
          {(() => {
            const amount = (quotation?.totalAmount ?? quotation?.total ?? ((quotation?.subtotal ?? 0) + (quotation?.totalTax ?? 0)));
            return `$${Number(amount || 0).toFixed(2)}`;
          })()}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (quotation: any) => getStatusBadge(quotation.status),
    },
    {
      key: 'quotationDate',
      header: 'Date',
      render: (quotation: any) => (
        <div className="text-sm text-gray-500">
          {new Date(quotation.quotationDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'validUntil',
      header: 'Valid Until',
      render: (quotation: any) => (
        <div className="text-sm text-gray-500">
          {new Date(quotation.validUntil).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (quotation: any) => (
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(quotation)}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditQuotation(quotation)}
            title="Edit Quotation"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          {quotation.status === 'accepted' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCheckInventory(quotation)}
              title="Check Inventory"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
            </Button>
          )}
          {quotation.status === 'accepted' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleGeneratePickingList(quotation)}
              title="Generate Picking List"
            >
              <DocumentTextIcon className="h-4 w-4" />
            </Button>
          )}
          
          {/* Status Update Buttons */}
          {quotation.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateStatus(quotation, 'sent')}
              title="Send Quotation"
              className="text-blue-600 hover:text-blue-700"
            >
              <DocumentTextIcon className="h-4 w-4" />
            </Button>
          )}
          {quotation.status === 'sent' && (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(quotation, 'accepted')}
                title="Accept Quotation"
                className="text-green-600 hover:text-green-700"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleUpdateStatus(quotation, 'rejected')}
                title="Reject Quotation"
                className="text-red-600 hover:text-red-700"
              >
                <XCircleIcon className="h-4 w-4" />
              </Button>
            </>
          )}
          {quotation.status === 'accepted' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleUpdateStatus(quotation, 'converted')}
              title="Mark as Converted"
              className="text-purple-600 hover:text-purple-700"
            >
              <ShoppingCartIcon className="h-4 w-4" />
            </Button>
          )}
          
          {/* Print Quotation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShowReceipt(quotation)}
            title="Print Quotation"
          >
            <PrinterIcon className="h-4 w-4" />
          </Button>

          {/* Download Quotation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleShowReceipt(quotation)}
            title="Download Quotation"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <Layout title="Quotations">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading quotations</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Quotations">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-600">Manage customer quotations and check inventory availability</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Quotation
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">Total Quotations</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">Pending</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.byStatus?.pending || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">Approved</div>
              <div className="text-2xl font-bold text-green-600">{stats.byStatus?.approved || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">Total Value</div>
              <div className="text-2xl font-bold text-blue-600">${stats.totalValue?.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex flex-col gap-4 md:flex-row md:flex-wrap">
            <div className="flex-1 min-w-0 w-full">
              <Input
                placeholder="Search quotations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="expired">Expired</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>

        {/* Quotations Table */}
        <div className="bg-white rounded-lg border">
          <Table
            data={quotations}
            columns={columns}
            loading={isLoading}
            emptyMessage="No quotations found"
          />
        </div>

        {/* Create Quotation Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Quotation"
          size="lg"
        >
          <CreateQuotationForm
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['quotations'] });
              queryClient.invalidateQueries({ queryKey: ['quotationStats'] });
              setShowCreateModal(false);
            }}
          />
        </Modal>

        {/* Edit Quotation Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Quotation"
          size="lg"
        >
          <CreateQuotationForm
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['quotations'] });
              queryClient.invalidateQueries({ queryKey: ['quotationStats'] });
              setShowEditModal(false);
            }}
            initialData={selectedQuotation}
          />
        </Modal>

        {/* Quotation Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Quotation Details"
          size="lg"
        >
          {selectedQuotation && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quotation Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuotation.quotationNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {(() => {
                      const amount = (selectedQuotation as any).totalAmount ?? (selectedQuotation as any).total ?? ((selectedQuotation as any).subtotal ?? 0) + ((selectedQuotation as any).totalTax ?? 0);
                      return `$${Number(amount || 0).toFixed(2)}`;
                    })()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedQuotation.validUntil).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <div className="mt-1">
                  <p className="text-sm text-gray-900">{selectedQuotation.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedQuotation.customerEmail}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedQuotation.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">${item.unitPrice?.toFixed(2) || '0.00'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">${item.total?.toFixed(2) || '0.00'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                {selectedQuotation.status === 'accepted' && (
                  <Button
                    onClick={() => {
                      setShowDetailsModal(false);
                      handleCheckInventory(selectedQuotation);
                    }}
                  >
                    Check Inventory
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>

        {/* Inventory Check Modal */}
        <Modal
          isOpen={showInventoryModal}
          onClose={() => setShowInventoryModal(false)}
          title="Inventory Availability Check"
          size="lg"
        >
          <InventoryCheckModal
            quotation={selectedQuotation}
            onClose={() => setShowInventoryModal(false)}
          />
        </Modal>

        {/* Picking List Modal */}
        <Modal
          isOpen={showPickingListModal}
          onClose={() => setShowPickingListModal(false)}
          title="Picking List"
          size="lg"
        >
          <PickingListModal
            quotation={selectedQuotation}
            onClose={() => setShowPickingListModal(false)}
          />
        </Modal>

        {/* Receipt Modal */}
        <Modal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          title={`Quotation - ${selectedQuotation?.quotationNumber}`}
          size="lg"
        >
          {selectedQuotation && (
            <div className="space-y-4">
              <QuotationReceipt
                quotation={selectedQuotation}
                onPrint={handlePrintReceipt}
                onDownload={handleDownloadReceipt}
              />
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default QuotationsPage;