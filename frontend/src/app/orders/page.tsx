'use client';

import React, { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { Order, OrderPayment } from '@/types';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, customersAPI, productsAPI, usersAPI, warehouseAPI } from '@/lib/api';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import DataTable from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { 
  ShoppingBagIcon, 
  PlusIcon, 
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  TruckIcon,
  ClockIcon,
  UserIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import CreateOrderForm from '@/components/orders/CreateOrderForm';
import toast from 'react-hot-toast';

const OrdersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all');
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [showConvertModal, setShowConvertModal] = useState(false);

  // Fetch orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders', currentPage, pageSize, searchTerm, statusFilter, paymentStatusFilter, fulfillmentStatusFilter],
    queryFn: () => ordersAPI.getOrders({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
      fulfillmentStatus: fulfillmentStatusFilter !== 'all' ? fulfillmentStatusFilter : undefined,
    })
  });

  // Fetch customers for create modal
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-order'],
    queryFn: () => customersAPI.getCustomers({ page: 1, limit: 100 })
  });

  // Fetch products for create modal
  const { data: productsData } = useQuery({
    queryKey: ['products-for-order'],
    queryFn: () => productsAPI.getProducts({ page: 1, limit: 100 })
  });

  // Fetch users for assignment
  const { data: usersData } = useQuery({
    queryKey: ['users-for-assignment'],
    queryFn: () => usersAPI.getUsers({ page: 1, limit: 100 })
  });

  // Fetch warehouses for assign modal
  const { data: warehousesData, isLoading: warehousesLoading, error: warehousesError } = useQuery({
    queryKey: ['warehouses-for-assignment'],
    queryFn: () => warehouseAPI.getWarehouses({ page: 1, limit: 100 })
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData: Partial<Order>) => ordersAPI.createOrder(orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowCreateModal(false);
      toast.success('Order created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create order');
    }
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Order> }) => ordersAPI.updateOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowOrderModal(false);
      toast.success('Order updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update order');
    }
  });

  // Delete order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: ({ id, deleteInvoice }: { id: string; deleteInvoice: boolean }) => ordersAPI.deleteOrder(id, deleteInvoice),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Order deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete order');
    }
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) => 
      ordersAPI.updateOrderStatus(id, status, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowStatusModal(false);
      toast.success('Order status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update status');
    }
  });


  // Assign order mutation
  const assignOrderMutation = useMutation({
    mutationFn: ({ id, assignedTo, warehouse }: { id: string; assignedTo?: string; warehouse?: string }) => 
      ordersAPI.assignOrder(id, assignedTo, warehouse),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowAssignModal(false);
      setSelectedWarehouseId('');
      toast.success('Order assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to assign order');
    }
  });

  // Convert to invoice mutation
  const convertToInvoiceMutation = useMutation({
    mutationFn: (id: string) => ordersAPI.convertToInvoice(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowConvertModal(false);
      toast.success('Order converted to invoice successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to convert order');
    }
  });

  const handleDelete = (id: string, hasInvoice: boolean = false) => {
    if (hasInvoice) {
      const deleteInvoice = window.confirm(
        'This order has an associated invoice. Do you want to delete the invoice as well?\n\n' +
        'Click OK to delete both order and invoice, or Cancel to delete only the order.'
      );
      deleteOrderMutation.mutate({ id, deleteInvoice });
    } else {
      if (window.confirm('Are you sure you want to delete this order?')) {
        deleteOrderMutation.mutate({ id, deleteInvoice: false });
      }
    }
  };

  const handleStatusUpdate = (status: string, notes?: string) => {
    if (selectedOrder) {
      updateStatusMutation.mutate({ id: selectedOrder._id, status, notes });
    }
  };


  const handleAssign = () => {
    if (selectedOrder && selectedWarehouseId) {
      assignOrderMutation.mutate({ id: selectedOrder._id, warehouse: selectedWarehouseId });
    }
  };

  const handleConvert = (id: string) => {
    if (window.confirm('Are you sure you want to convert this order to an invoice?')) {
      convertToInvoiceMutation.mutate(id);
    }
  };

  const getStatusBadge = (status: string, type: 'order' | 'payment' | 'fulfillment' = 'order') => {
    const statusColors = {
      order: {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        processing: 'bg-purple-100 text-purple-800',
        shipped: 'bg-indigo-100 text-indigo-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800',
        returned: 'bg-orange-100 text-orange-800',
      },
      payment: {
        pending: 'bg-yellow-100 text-yellow-800',
        partial: 'bg-blue-100 text-blue-800',
        paid: 'bg-green-100 text-green-800',
        refunded: 'bg-purple-100 text-purple-800',
        cancelled: 'bg-red-100 text-red-800',
      },
      fulfillment: {
        unfulfilled: 'bg-gray-100 text-gray-800',
        partial: 'bg-yellow-100 text-yellow-800',
        fulfilled: 'bg-green-100 text-green-800',
        shipped: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
      }
    };

    const colors = statusColors[type] || statusColors.order;
    const colorClass = colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colorClass}`}>
        {(status || 'unknown').charAt(0).toUpperCase() + (status || 'unknown').slice(1).replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };

    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${priorityColors[priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-800'}`}>
        {(priority || 'unknown').charAt(0).toUpperCase() + (priority || 'unknown').slice(1)}
      </span>
    );
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order #',
      render: (row: any) => (
        <span className="font-medium text-blue-600">{row.orderNumber}</span>
      ),
    },
    {
      key: 'customerName',
      label: 'Customer',
      render: (row: any) => (
        <div>
          <div className="font-medium">{row.customerName}</div>
          <div className="text-sm text-gray-500">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'orderDate',
      label: 'Order Date',
      render: (row: any) => (
        <span className="text-sm text-gray-900">{formatDate(row.orderDate)}</span>
      ),
    },
    {
      key: 'expectedDeliveryDate',
      label: 'Expected Delivery',
      render: (row: any) => {
        if (!row.expectedDeliveryDate) return <span className="text-sm text-gray-400">Not set</span>;
        const isOverdue = row.expectedDeliveryDate && new Date(row.expectedDeliveryDate) < new Date() && !['delivered', 'cancelled'].includes(row.orderStatus);
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
            {formatDate(row.expectedDeliveryDate)}
            {isOverdue && <ExclamationTriangleIcon className="inline h-4 w-4 ml-1" />}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (row: any) => (
        <span className="font-medium">{formatCurrency(row.totalAmount)}</span>
      ),
    },
    {
      key: 'orderStatus',
      label: 'Status',
      render: (row: any) => getStatusBadge(row.orderStatus, 'order'),
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (row: any) => getStatusBadge(row.paymentStatus, 'payment'),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (row: any) => getPriorityBadge(row.priority),
    },
    {
      key: 'invoice',
      label: 'Invoice',
      render: (row: any) => (
        row.invoice ? (
          <span className="font-medium text-green-600">{row.invoice.invoiceNumber}</span>
        ) : (
          <span className="text-gray-400">Not created</span>
        )
      ),
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row: any) => (
        row.warehouse ? (
          <span className="font-medium text-blue-600">{row.warehouse.name}</span>
        ) : (
          <span className="text-gray-400">Not assigned</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowOrderModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {['pending', 'confirmed'].includes(row.orderStatus) && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                setShowCreateModal(true);
              }}
              className="text-green-600 hover:text-green-800"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowStatusModal(true);
            }}
            className="text-orange-600 hover:text-orange-800"
            title="Update Order Status"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowAssignModal(true);
            }}
            className="text-indigo-600 hover:text-indigo-800"
            title="Assign to Warehouse"
          >
            <UserIcon className="h-4 w-4" />
          </button>
          {['pending', 'confirmed'].includes(row.orderStatus) && (
            <button
              onClick={() => handleDelete(row._id, !!row.invoice)}
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
    <Layout title="Orders">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage customer orders and fulfillment</p>
          </div>
          <Button
            onClick={() => {
              setSelectedOrder(null);
              setShowCreateModal(true);
            }}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="h-5 w-5" />
            <span>New Order</span>
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'pending', label: 'Pending' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'processing', label: 'Processing' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'returned', label: 'Returned' },
              ]}
            />
            <Select
              value={paymentStatusFilter}
              onChange={(e) => setPaymentStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Payment' },
                { value: 'pending', label: 'Pending Payment' },
                { value: 'partial', label: 'Partial Payment' },
                { value: 'paid', label: 'Paid' },
                { value: 'refunded', label: 'Refunded' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
            <Select
              value={fulfillmentStatusFilter}
              onChange={(e) => setFulfillmentStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Fulfillment' },
                { value: 'unfulfilled', label: 'Unfulfilled' },
                { value: 'partial', label: 'Partial' },
                { value: 'fulfilled', label: 'Fulfilled' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
              ]}
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white shadow rounded-lg">
          {(() => {
            const pagination = ordersData?.data?.pagination || {};
            return (
              <DataTable
             data={Array.isArray(ordersData?.data?.data) ? ordersData.data.data : []}
            columns={columns}
            loading={isLoading}
             pagination={{
               page: currentPage,
               limit: pageSize,
               total: pagination?.total || 0,
               pages: pagination?.pages || 1,
             }}
            onPageChange={setCurrentPage}
          />
            );
          })()}
        </div>

        {/* Order Details Modal */}
        <Modal
          isOpen={showOrderModal}
          onClose={() => setShowOrderModal(false)}
          title="Order Details"
          size="lg"
        >
          {selectedOrder && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.orderStatus, 'order')}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.customerName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.customerEmail}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.orderDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedOrder.expectedDeliveryDate ? formatDate(selectedOrder.expectedDeliveryDate) : 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.paymentStatus, 'payment')}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fulfillment Status</label>
                  <div className="mt-1">{getStatusBadge(selectedOrder.fulfillmentStatus, 'fulfillment')}</div>
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
                      {selectedOrder.items?.map((item: any, index: number) => (
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

              {/* Price Summary */}
              <div className="border-t pt-4">
                {(() => {
                  const priceItems = selectedOrder.items?.map((item: any) => ({
                    name: item.name,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    discount: item.discount || 0,
                    taxRate: item.taxRate || 0
                  })) || [];
                  
                  const calculation = calculatePrice(priceItems, [], [], {
                    cost: selectedOrder.shippingCost || 0
                  });
                  
                  return (
                    <PriceSummary 
                      calculation={calculation} 
                      showBreakdown={true}
                      showItems={false}
                      title="Order Summary"
                    />
                  );
                })()}
              </div>

              {/* Notes */}
              {selectedOrder.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-700">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Internal Notes */}
              {selectedOrder.internalNotes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Internal Notes</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{selectedOrder.internalNotes}</p>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title="Update Order Status"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Order Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Order:</span>
                    <span className="ml-2 font-medium">{selectedOrder.orderNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Current Status:</span>
                    <span className="ml-2">{getStatusBadge(selectedOrder.orderStatus, 'order')}</span>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Change Status To</label>
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleStatusUpdate(e.target.value);
                    }
                  }}
                  options={[
                    { value: '', label: 'Select New Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'ready_for_pickup', label: 'Ready for Pickup' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'returned', label: 'Returned' },
                  ]}
                />
              </div>
              
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Changing the order status will update the order workflow and may trigger notifications.
                </p>
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


        {/* Assign Order Modal */}
        <Modal
          isOpen={showAssignModal}
          onClose={() => setShowAssignModal(false)}
          title="Assign Order to Warehouse"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To Warehouse</label>
                {warehousesError && (
                  <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                    Error loading warehouses: {warehousesError.message}
                  </div>
                )}
                <Select
                  value={selectedWarehouseId}
                  onChange={(e) => setSelectedWarehouseId(e.target.value)}
                  disabled={warehousesLoading}
                  options={[
                    { value: '', label: warehousesLoading ? 'Loading warehouses...' : 'Select Warehouse' },
                    ...(Array.isArray(warehousesData?.data?.data) ? warehousesData.data.data.map((warehouse: any) => ({
                      value: warehouse?._id || '',
                      label: `${warehouse?.name || 'Unknown'} (${warehouse?.code || 'N/A'})`
                    })) : [])
                  ]}
                />
                {!warehousesLoading && !warehousesError && Array.isArray(warehousesData?.data?.data) && warehousesData?.data?.data?.length === 0 && (
                  <div className="mt-2 text-sm text-gray-500">
                    No warehouses available. Please create warehouses first.
                  </div>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAssignModal(false);
                    setSelectedWarehouseId('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAssign}
                  disabled={!selectedWarehouseId || assignOrderMutation.isPending}
                >
                  {assignOrderMutation.isPending ? 'Assigning...' : 'Assign to Warehouse'}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create/Edit Order Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedOrder(null);
          }}
          title={selectedOrder ? 'Edit Order' : 'Create New Order'}
          size="xl"
        >
          <CreateOrderForm
            onClose={() => {
              setShowCreateModal(false);
              setSelectedOrder(null);
            }}
            onSuccess={(orderData) => {
              if (selectedOrder) {
                updateOrderMutation.mutate({ id: selectedOrder._id, data: orderData });
              } else {
                createOrderMutation.mutate(orderData);
              }
            }}
            initialData={selectedOrder}
          />
        </Modal>

        {/* Convert to Invoice Confirmation Modal */}
        <Modal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          title="Convert to Invoice"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <p className="text-gray-700">
                Are you sure you want to convert order <strong>{selectedOrder.orderNumber}</strong> to an invoice?
              </p>
              <p className="text-sm text-gray-500">
                This will create a new invoice with the same items and amounts as the order.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowConvertModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleConvert(selectedOrder._id)}
                  disabled={convertToInvoiceMutation.isPending}
                >
                  {convertToInvoiceMutation.isPending ? 'Converting...' : 'Convert to Invoice'}
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default OrdersPage;
