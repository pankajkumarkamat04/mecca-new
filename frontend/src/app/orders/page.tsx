'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersAPI, customersAPI, productsAPI, usersAPI } from '@/lib/api';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';
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
  ExclamationTriangleIcon
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
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
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

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: (orderData: any) => ordersAPI.createOrder(orderData),
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
    mutationFn: ({ id, data }: { id: string; data: any }) => ordersAPI.updateOrder(id, data),
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
    mutationFn: (id: string) => ordersAPI.deleteOrder(id),
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

  // Update payment mutation
  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, paymentData }: { id: string; paymentData: any }) => 
      ordersAPI.updatePaymentStatus(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowPaymentModal(false);
      toast.success('Payment status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update payment');
    }
  });

  // Assign order mutation
  const assignOrderMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) => 
      ordersAPI.assignOrder(id, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      setShowAssignModal(false);
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

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      deleteOrderMutation.mutate(id);
    }
  };

  const handleStatusUpdate = (status: string, notes?: string) => {
    if (selectedOrder) {
      updateStatusMutation.mutate({ id: selectedOrder._id, status, notes });
    }
  };

  const handlePaymentUpdate = (paymentData: any) => {
    if (selectedOrder) {
      updatePaymentMutation.mutate({ id: selectedOrder._id, paymentData });
    }
  };

  const handleAssign = (assignedTo: string) => {
    if (selectedOrder) {
      assignOrderMutation.mutate({ id: selectedOrder._id, assignedTo });
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
        {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
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
        {priority.charAt(0).toUpperCase() + priority.slice(1)}
      </span>
    );
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order #',
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
      key: 'orderDate',
      label: 'Order Date',
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'expectedDeliveryDate',
      label: 'Expected Delivery',
      render: (value: string, row: any) => {
        if (!value) return <span className="text-sm text-gray-400">Not set</span>;
        const isOverdue = row.expectedDeliveryDate && new Date(value) < new Date() && !['delivered', 'cancelled'].includes(row.orderStatus);
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
            {formatDate(value)}
            {isOverdue && <ExclamationTriangleIcon className="inline h-4 w-4 ml-1" />}
          </span>
        );
      },
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (value: number) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'orderStatus',
      label: 'Status',
      render: (value: string) => getStatusBadge(value, 'order'),
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      render: (value: string) => getStatusBadge(value, 'payment'),
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value: string) => getPriorityBadge(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: any) => (
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
            <>
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
              <button
                onClick={() => {
                  setSelectedOrder(row);
                  setShowStatusModal(true);
                }}
                className="text-purple-600 hover:text-purple-800"
                title="Update Status"
              >
                <CheckCircleIcon className="h-4 w-4" />
              </button>
            </>
          )}
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowPaymentModal(true);
            }}
            className="text-yellow-600 hover:text-yellow-800"
            title="Update Payment"
          >
            <ClockIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowAssignModal(true);
            }}
            className="text-indigo-600 hover:text-indigo-800"
            title="Assign"
          >
            <UserIcon className="h-4 w-4" />
          </button>
          {!row.invoice && ['confirmed', 'processing'].includes(row.orderStatus) && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                setShowConvertModal(true);
              }}
              className="text-purple-600 hover:text-purple-800"
              title="Convert to Invoice"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          {['pending', 'confirmed'].includes(row.orderStatus) && (
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
    <Layout title="Orders">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600">Manage customer orders and fulfillment</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
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
          <DataTable
            data={ordersData?.data?.data || []}
            columns={columns}
            loading={isLoading}
            pagination={{
              page: currentPage,
              limit: pageSize,
              total: ordersData?.data?.pagination?.total || 0,
              pages: ordersData?.data?.pagination?.pages || 1,
            }}
            onPageChange={setCurrentPage}
          />
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

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Subtotal:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Discount:</span>
                      <span className="text-sm font-medium">-{formatCurrency(selectedOrder.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Tax:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.totalTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Shipping:</span>
                      <span className="text-sm font-medium">{formatCurrency(selectedOrder.shippingCost)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-base font-medium">Total:</span>
                      <span className="text-base font-medium">{formatCurrency(selectedOrder.totalAmount)}</span>
                    </div>
                  </div>
                </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">New Status</label>
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleStatusUpdate(e.target.value);
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Status' },
                    { value: 'confirmed', label: 'Confirmed' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'shipped', label: 'Shipped' },
                    { value: 'delivered', label: 'Delivered' },
                    { value: 'cancelled', label: 'Cancelled' },
                    { value: 'returned', label: 'Returned' },
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

        {/* Payment Update Modal */}
        <Modal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          title="Update Payment Status"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handlePaymentUpdate({ paymentStatus: e.target.value });
                    }
                  }}
                  options={[
                    { value: '', label: 'Select Status' },
                    { value: 'pending', label: 'Pending' },
                    { value: 'partial', label: 'Partial' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'refunded', label: 'Refunded' },
                    { value: 'cancelled', label: 'Cancelled' },
                  ]}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentModal(false)}
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
          title="Assign Order"
          size="md"
        >
          {selectedOrder && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                <Select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAssign(e.target.value);
                    }
                  }}
                  options={[
                    { value: '', label: 'Select User' },
                    ...(usersData?.data?.data?.map((user: any) => ({
                      value: user._id,
                      label: `${user.firstName} ${user.lastName}`
                    })) || [])
                  ]}
                />
              </div>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAssignModal(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create/Edit Order Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title={selectedOrder ? 'Edit Order' : 'Create New Order'}
          size="xl"
        >
          <CreateOrderForm
            onClose={() => setShowCreateModal(false)}
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
