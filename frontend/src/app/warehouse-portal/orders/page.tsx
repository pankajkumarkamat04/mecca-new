'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI, ordersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import {
  ClipboardDocumentListIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

interface Order {
  _id: string;
  orderNumber: string;
  customer: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  items: Array<{
    product: {
      _id: string;
      name: string;
      sku: string;
    };
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  orderStatus: string;
  totalAmount: number;
  warehouse?: {
    _id: string;
    name: string;
  };
  assignedAt?: string;
  assignedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

const WarehouseOrders: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Fetch orders assigned to warehouse
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['warehouse-orders', warehouseId, statusFilter, searchTerm],
    queryFn: () => warehouseAPI.getWarehouseOrders(warehouseId!, {
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchTerm,
      limit: 50,
    }),
    enabled: !!warehouseId,
  });

  // Update order status mutation
  const updateOrderStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      ordersAPI.updateOrder(orderId, { orderStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-orders', warehouseId] });
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    },
  });

  const orders = ordersData?.data?.data || [];

  const getStatusColor = (status: string | undefined) => {
    if (!status) return 'bg-gray-100 text-gray-800';
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'processing':
        return 'bg-blue-100 text-blue-800';
      case 'ready_for_pickup':
        return 'bg-green-100 text-green-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string | undefined) => {
    if (!status) return <ClockIcon className="h-4 w-4" />;
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'processing':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'ready_for_pickup':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'shipped':
        return <TruckIcon className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'cancelled':
        return <XCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order',
      render: (row: Order) => (
        <div>
          <div className="font-medium text-gray-900">{row.orderNumber}</div>
          <div className="text-sm text-gray-500">
            {new Date(row.createdAt).toLocaleDateString()}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row: Order) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.customer.firstName} {row.customer.lastName}
          </div>
          <div className="text-sm text-gray-500">{row.customer.email}</div>
        </div>
      ),
    },
    {
      key: 'items',
      label: 'Items',
      render: (row: Order) => (
        <div>
          <div className="font-medium text-gray-900">{row.items.length} items</div>
          <div className="text-sm text-gray-500">
            {row.items.reduce((sum, item) => sum + item.quantity, 0)} units
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row: Order) => (
        <div className="font-medium text-gray-900">
          ${row.totalAmount?.toLocaleString() || '0'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Order) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.orderStatus)}`}>
          {getStatusIcon(row.orderStatus)}
          <span className="ml-1">{row.orderStatus?.replace('_', ' ') || 'Unknown'}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Order) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowOrderModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {row.orderStatus === 'pending' && (
            <button
              onClick={() => updateOrderStatusMutation.mutate({
                orderId: row._id,
                status: 'processing'
              })}
              className="text-blue-600 hover:text-blue-800"
              title="Start Processing"
            >
              <ExclamationTriangleIcon className="h-4 w-4" />
            </button>
          )}
          {row.orderStatus === 'processing' && (
            <button
              onClick={() => updateOrderStatusMutation.mutate({
                orderId: row._id,
                status: 'ready_for_pickup'
              })}
              className="text-green-600 hover:text-green-800"
              title="Mark Ready for Pickup"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
          {row.orderStatus === 'ready_for_pickup' && (
            <button
              onClick={() => updateOrderStatusMutation.mutate({
                orderId: row._id,
                status: 'shipped'
              })}
              className="text-purple-600 hover:text-purple-800"
              title="Mark as Shipped"
            >
              <TruckIcon className="h-4 w-4" />
            </button>
          )}
          {row.orderStatus === 'shipped' && (
            <button
              onClick={() => updateOrderStatusMutation.mutate({
                orderId: row._id,
                status: 'delivered'
              })}
              className="text-green-600 hover:text-green-800"
              title="Mark as Delivered"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowStatusModal(true);
            }}
            className="text-orange-600 hover:text-orange-800"
            title="Update Status"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Orders</h1>
            <p className="text-gray-600">Manage orders assigned to this warehouse</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'processing', label: 'Processing' },
                  { value: 'ready_for_pickup', label: 'Ready for Pickup' },
                  { value: 'shipped', label: 'Shipped' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={orders}
            columns={columns}
            loading={isLoading}
          />
        </div>

        {/* Order Details Modal */}
        <Modal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          title={`Order Details - ${selectedOrder?.orderNumber}`}
          size="lg"
        >
          {selectedOrder && (
            <div className="space-y-6">
              {/* Order Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                      <dd className="text-sm text-gray-900">{selectedOrder.orderNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.orderStatus)}`}>
                          {getStatusIcon(selectedOrder.orderStatus)}
                          <span className="ml-1">{selectedOrder.orderStatus?.replace('_', ' ') || 'Unknown'}</span>
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
                      <dd className="text-sm text-gray-900">${selectedOrder.totalAmount?.toLocaleString() || '0'}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedOrder.createdAt).toLocaleString()}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedOrder.customer.firstName} {selectedOrder.customer.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="text-sm text-gray-900">{selectedOrder.customer.email}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Order Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Product
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          SKU
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedOrder.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.product?.name || 'Unknown Product'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.product?.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {item.quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.unitPrice?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            ${item.total?.toFixed(2) || '0.00'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Warehouse Assignment Info */}
              {selectedOrder.warehouse && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse Assignment</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Assigned Warehouse</dt>
                      <dd className="text-sm text-gray-900">{selectedOrder.warehouse.name}</dd>
                    </div>
                    {selectedOrder.assignedAt && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Assigned At</dt>
                        <dd className="text-sm text-gray-900">
                          {new Date(selectedOrder.assignedAt).toLocaleString()}
                        </dd>
                      </div>
                    )}
                    {selectedOrder.assignedBy && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Assigned By</dt>
                        <dd className="text-sm text-gray-900">
                          {selectedOrder.assignedBy.firstName} {selectedOrder.assignedBy.lastName}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title={`Update Order Status - ${selectedOrder?.orderNumber}`}
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Current Status</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedOrder.orderStatus)}`}>
                  {getStatusIcon(selectedOrder.orderStatus)}
                  <span className="ml-1">{selectedOrder.orderStatus?.replace('_', ' ') || 'Unknown'}</span>
                </span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Change Status To</label>
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      updateOrderStatusMutation.mutate({
                        orderId: selectedOrder._id,
                        status: e.target.value
                      });
                      setShowStatusModal(false);
                    }
                  }}
                  options={[
                    { value: '', label: 'Select New Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </WarehousePortalLayout>
  );
};

export default WarehouseOrders;
