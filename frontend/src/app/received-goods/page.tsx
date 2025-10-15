'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import { receivedGoodsAPI, suppliersAPI, warehouseAPI, productsAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TruckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { ReceivedGoods, ReceivedGoodsItem } from '@/types';

const ReceivedGoodsPage: React.FC = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedReceivedGoods, setSelectedReceivedGoods] = useState<ReceivedGoods | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    supplier: '',
    warehouse: '',
    search: '',
    page: 1,
    limit: 20
  });

  // Check permissions
  const canCreate = hasRole('admin') || hasRole('manager') || hasRole('warehouse_manager');
  const canEdit = hasRole('admin') || hasRole('manager') || hasRole('warehouse_manager');
  const canReceive = hasRole('admin') || hasRole('manager') || hasRole('warehouse_manager') || hasRole('warehouse_employee');
  const canAddToInventory = hasRole('admin') || hasRole('manager') || hasRole('warehouse_manager');

  // Queries
  const { data: receivedGoodsData, isLoading } = useQuery({
    queryKey: ['received-goods', filters],
    queryFn: () => receivedGoodsAPI.getReceivedGoods(filters),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersAPI.getSuppliers(),
  });

  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getWarehouses(),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsAPI.getProducts({ limit: 1000 }),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: receivedGoodsAPI.createReceivedGoods,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-goods'] });
      setIsCreateModalOpen(false);
      toast.success('Received goods created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create received goods');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => receivedGoodsAPI.updateReceivedGoods(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-goods'] });
      setIsEditModalOpen(false);
      toast.success('Received goods updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update received goods');
    }
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => receivedGoodsAPI.receiveItems(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-goods'] });
      setIsReceiveModalOpen(false);
      toast.success('Items received successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to receive items');
    }
  });

  const addToInventoryMutation = useMutation({
    mutationFn: (id: string) => receivedGoodsAPI.addToInventory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-goods'] });
      toast.success('Items added to inventory successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add items to inventory');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: receivedGoodsAPI.deleteReceivedGoods,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['received-goods'] });
      toast.success('Received goods deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete received goods');
    }
  });

  // Handlers
  const handleView = (receivedGoods: ReceivedGoods) => {
    setSelectedReceivedGoods(receivedGoods);
    setIsViewModalOpen(true);
  };

  const handleEdit = (receivedGoods: ReceivedGoods) => {
    setSelectedReceivedGoods(receivedGoods);
    setIsEditModalOpen(true);
  };

  const handleReceive = (receivedGoods: ReceivedGoods) => {
    setSelectedReceivedGoods(receivedGoods);
    setIsReceiveModalOpen(true);
  };

  const handleAddToInventory = (id: string) => {
    if (window.confirm('Are you sure you want to add these items to inventory?')) {
      addToInventoryMutation.mutate(id);
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this received goods record?')) {
      deleteMutation.mutate(id);
    }
  };

  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      received: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      partially_received: { color: 'bg-blue-100 text-blue-800', icon: ExclamationTriangleIcon },
      cancelled: { color: 'bg-red-100 text-red-800', icon: XCircleIcon }
    };

    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const receivedGoods = receivedGoodsData?.data?.data || [];
  const pagination = receivedGoodsData?.data?.pagination;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Received Goods</h1>
            <p className="text-gray-600">Manage incoming products and inventory updates</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
            >
              <PlusIcon className="h-5 w-5" />
              <span>Create Received Goods</span>
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="partially_received">Partially Received</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
              <select
                value={filters.supplier}
                onChange={(e) => setFilters(prev => ({ ...prev, supplier: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="">All Suppliers</option>
                {suppliersData?.data?.map((supplier: any) => (
                  <option key={supplier._id} value={supplier._id}>
                    {supplier.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
              <select
                value={filters.warehouse}
                onChange={(e) => setFilters(prev => ({ ...prev, warehouse: e.target.value, page: 1 }))}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
              >
                <option value="">All Warehouses</option>
                {warehousesData?.data?.map((warehouse: any) => (
                  <option key={warehouse._id} value={warehouse._id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by number, invoice..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Received Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Supplier
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Warehouse
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expected Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : receivedGoods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                      No received goods found
                    </td>
                  </tr>
                ) : (
                  receivedGoods.map((item: ReceivedGoods) => (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.receivedNumber}</div>
                        <div className="text-sm text-gray-500">{formatDate(item.receivedDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.supplier?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{item.warehouse?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(item.expectedDate)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(item.totalValue)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleView(item)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          
                          {canEdit && (
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Edit"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canReceive && item.status !== 'received' && (
                            <button
                              onClick={() => handleReceive(item)}
                              className="text-green-600 hover:text-green-900"
                              title="Receive Items"
                            >
                              <TruckIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canAddToInventory && item.status === 'received' && !item.verifiedBy && (
                            <button
                              onClick={() => handleAddToInventory(item._id)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Add to Inventory"
                            >
                              <CheckCircleIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {canEdit && !item.verifiedBy && (
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={!pagination.hasPrev}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={!pagination.hasNext}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Showing <span className="font-medium">{((pagination.page - 1) * pagination.limit) + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.totalCount)}</span> of{' '}
                    <span className="font-medium">{pagination.totalCount}</span> results
                  </p>
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                      disabled={!pagination.hasPrev}
                      className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                      disabled={!pagination.hasNext}
                      className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals will be implemented in separate components */}
      {/* Create Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Create Received Goods</h2>
            <p className="text-gray-600 mb-4">Create received goods form will be implemented here</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {isViewModalOpen && selectedReceivedGoods && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold mb-4">Received Goods Details</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Received Number</label>
                  <p className="text-sm text-gray-900">{selectedReceivedGoods.receivedNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <StatusBadge status={selectedReceivedGoods.status} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <p className="text-sm text-gray-900">{selectedReceivedGoods.supplier?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Warehouse</label>
                  <p className="text-sm text-gray-900">{selectedReceivedGoods.warehouse?.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Date</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedReceivedGoods.expectedDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Value</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedReceivedGoods.totalValue)}</p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Received</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReceivedGoods.items.map((item: ReceivedGoodsItem) => (
                        <tr key={item._id}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.product?.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.expectedQuantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.receivedQuantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.totalValue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="flex justify-end mt-6">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ReceivedGoodsPage;
