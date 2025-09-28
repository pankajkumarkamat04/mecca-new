'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrderAPI } from '@/lib/api';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShoppingCartIcon,
  PaperAirplaneIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface PurchaseOrder {
  _id: string;
  orderNumber: string;
  supplier: {
    _id: string;
    name: string;
    email?: string;
    phone?: string;
  };
  supplierName: string;
  orderDate: string;
  expectedDeliveryDate?: string;
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'overdue';
  totalAmount: number;
  completionPercentage: number;
  isOverdue: boolean;
  daysOverdue: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
}

const PurchaseOrdersPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryClient = useQueryClient();

  // Fetch purchase orders
  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['purchase-orders', { page: currentPage, limit: pageSize, search: searchTerm, status: statusFilter === 'all' ? undefined : statusFilter }],
    queryFn: () => purchaseOrderAPI.getPurchaseOrders({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: statusFilter === 'all' ? undefined : statusFilter
    }),
  });

  // Fetch purchase order stats
  const { data: statsData } = useQuery({
    queryKey: ['purchase-order-stats'],
    queryFn: () => purchaseOrderAPI.getPurchaseOrderStats(),
  });

  // Delete purchase order mutation
  const deleteOrderMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderAPI.deletePurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-order-stats'] });
      toast.success('Purchase order deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete purchase order');
    },
  });

  // Send purchase order mutation
  const sendOrderMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderAPI.sendPurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order sent successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send purchase order');
    },
  });

  // Confirm purchase order mutation
  const confirmOrderMutation = useMutation({
    mutationFn: (id: string) => purchaseOrderAPI.confirmPurchaseOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Purchase order confirmed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to confirm purchase order');
    },
  });

  const orders = ordersData?.data?.data || ordersData?.data || [];
  const pagination = ordersData?.data?.pagination || ordersData?.data?.pagination || {};
  const stats = statsData?.data;

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      sent: 'bg-blue-100 text-blue-800',
      confirmed: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      received: 'bg-green-100 text-green-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      normal: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const columns = [
    {
      key: 'orderNumber',
      label: 'Order Number',
      render: (value: string, row: PurchaseOrder) => (
        <div className="flex items-center">
          <ShoppingCartIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.supplierName}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'orderDate',
      label: 'Order Date',
      render: (value: string) => (
        <div className="text-sm text-gray-900">
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'expectedDeliveryDate',
      label: 'Expected Delivery',
      render: (value: string, row: PurchaseOrder) => (
        <div className="text-sm">
          <div className={`${row.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {value ? new Date(value).toLocaleDateString() : 'Not set'}
          </div>
          {row.isOverdue && (
            <div className="text-xs text-red-500">
              {row.daysOverdue} days overdue
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string, row: PurchaseOrder) => (
        <div className="flex flex-col space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(value)}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(row.priority)}`}>
            {row.priority.charAt(0).toUpperCase() + row.priority.slice(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total Amount',
      render: (value: number) => (
        <div className="text-sm font-medium text-gray-900">
          ${value.toLocaleString()}
        </div>
      ),
    },
    {
      key: 'completionPercentage',
      label: 'Progress',
      render: (value: number) => (
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
            <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="text-sm text-gray-600">{value}%</span>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: PurchaseOrder) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedOrder(row);
              setShowViewModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {row.status === 'draft' && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                setShowEditModal(true);
              }}
              className="text-green-600 hover:text-green-800"
              title="Edit"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {row.status === 'draft' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to send this purchase order to the supplier?')) {
                  sendOrderMutation.mutate(row._id);
                }
              }}
              className="text-blue-600 hover:text-blue-800"
              title="Send to Supplier"
            >
              <PaperAirplaneIcon className="h-4 w-4" />
            </button>
          )}
          {row.status === 'sent' && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to confirm this purchase order?')) {
                  confirmOrderMutation.mutate(row._id);
                }
              }}
              className="text-green-600 hover:text-green-800"
              title="Confirm Order"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
          {['confirmed', 'partial'].includes(row.status) && (
            <button
              onClick={() => {
                setSelectedOrder(row);
                setShowReceiveModal(true);
              }}
              className="text-purple-600 hover:text-purple-800"
              title="Receive Items"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
          {!['completed', 'cancelled'].includes(row.status) && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete this purchase order?')) {
                  deleteOrderMutation.mutate(row._id);
                }
              }}
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

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  return (
    <Layout title="Purchase Orders">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage your supplier purchase orders</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <ShoppingCartIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">!</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingValue}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedOrders}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">!</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overdue Orders</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueOrders}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search purchase orders..."
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
                { value: 'draft', label: 'Draft' },
                { value: 'sent', label: 'Sent' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'partial', label: 'Partial' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={orders}
          columns={columns}
          loading={isLoading}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: pagination?.total || 0,
            pages: pagination?.pages || 0,
          }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Create Purchase Order Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Purchase Order"
      >
        <CreatePurchaseOrderForm
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            queryClient.invalidateQueries({ queryKey: ['purchase-order-stats'] });
            toast.success('Purchase order created successfully');
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* View Purchase Order Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Purchase Order Details"
      >
        {selectedOrder && (
          <ViewPurchaseOrderDetails order={selectedOrder} />
        )}
      </Modal>

      {/* Edit Purchase Order Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Purchase Order"
      >
        {selectedOrder && (
          <EditPurchaseOrderForm
            order={selectedOrder}
            onSuccess={() => {
              setShowEditModal(false);
              queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
              toast.success('Purchase order updated successfully');
            }}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </Modal>

      {/* Receive Items Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Items"
      >
        {selectedOrder && (
          <ReceiveItemsForm
            order={selectedOrder}
            onSuccess={() => {
              setShowReceiveModal(false);
              queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
            }}
            onCancel={() => setShowReceiveModal(false)}
          />
        )}
      </Modal>
      </div>
    </Layout>
  );
};

// Create Purchase Order Form Component
const CreatePurchaseOrderForm: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    supplier: '',
    warehouse: '',
    expectedDeliveryDate: '',
    priority: 'normal',
    paymentTerms: 'net_30',
    shippingMethod: 'standard',
    notes: '',
    items: [{ product: '', quantity: '', unitCost: '' }],
  });

  const createOrderMutation = useMutation({
    mutationFn: (data: any) => purchaseOrderAPI.createPurchaseOrder(data),
    onSuccess: onSuccess,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create purchase order');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createOrderMutation.mutate(formData);
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: '', unitCost: '' }]
    });
  };

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Supplier *
          </label>
          <Input
            value={formData.supplier}
            onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
            placeholder="Select supplier..."
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Delivery Date
          </label>
          <Input
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <Select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Payment Terms
          </label>
          <Select
            value={formData.paymentTerms}
            onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
            options={[
              { value: 'net_15', label: 'Net 15' },
              { value: 'net_30', label: 'Net 30' },
              { value: 'net_45', label: 'Net 45' },
              { value: 'net_60', label: 'Net 60' },
              { value: 'due_on_receipt', label: 'Due on Receipt' },
              { value: 'prepaid', label: 'Prepaid' },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Shipping Method
          </label>
          <Select
            value={formData.shippingMethod}
            onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
            options={[
              { value: 'standard', label: 'Standard' },
              { value: 'express', label: 'Express' },
              { value: 'overnight', label: 'Overnight' },
              { value: 'pickup', label: 'Pickup' },
            ]}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createOrderMutation.isPending}>
          {createOrderMutation.isPending ? 'Creating...' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
};

// View Purchase Order Details Component
const ViewPurchaseOrderDetails: React.FC<{ order: PurchaseOrder }> = ({ order }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Order Information</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Order Number</dt>
              <dd className="text-sm text-gray-900">{order.orderNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Supplier</dt>
              <dd className="text-sm text-gray-900">{order.supplierName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Order Date</dt>
              <dd className="text-sm text-gray-900">{new Date(order.orderDate).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm text-gray-900">{order.status}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Financial</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="text-sm text-gray-900">${order.totalAmount.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
              <dd className="text-sm text-gray-900">{order.paymentStatus}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Completion</dt>
              <dd className="text-sm text-gray-900">{order.completionPercentage}%</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Items and Price Summary */}
      {(order as any).items && (order as any).items.length > 0 && (
        <>
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(order as any).items.map((item: any, index: number) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.name || item.product?.name || 'Unknown Item'}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${item.unitCost || item.unitPrice || 0}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${((item.unitCost || item.unitPrice || 0) * item.quantity).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Price Summary */}
          <div className="border-t pt-4">
            {(() => {
              const priceItems = (order as any).items?.map((item: any) => ({
                name: item.name || item.product?.name || 'Unknown Item',
                quantity: item.quantity || 1,
                unitPrice: item.unitCost || item.unitPrice || 0,
                discount: 0, // Purchase orders typically don't have discounts
                taxRate: 0 // Purchase orders typically don't have taxes
              })) || [];
              
              const calculation = calculatePrice(priceItems, [], [], {
                cost: (order as any).shippingCost || 0
              });
              
              return (
                <PriceSummary 
                  calculation={calculation} 
                  showBreakdown={true}
                  showItems={false}
                  title="Purchase Order Summary"
                />
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
};

// Edit Purchase Order Form Component
const EditPurchaseOrderForm: React.FC<{
  order: PurchaseOrder;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ order, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    expectedDeliveryDate: order.expectedDeliveryDate || '',
    priority: order.priority,
    notes: '',
  });

  const updateOrderMutation = useMutation({
    mutationFn: (data: any) => purchaseOrderAPI.updatePurchaseOrder(order._id, data),
    onSuccess: onSuccess,
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update purchase order');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateOrderMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Expected Delivery Date
          </label>
          <Input
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <Select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as 'low' | 'normal' | 'high' | 'urgent' })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateOrderMutation.isPending}>
          {updateOrderMutation.isPending ? 'Updating...' : 'Update Order'}
        </Button>
      </div>
    </form>
  );
};

// Receive Items Form Component
const ReceiveItemsForm: React.FC<{
  order: PurchaseOrder;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ order, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const [receivedItems, setReceivedItems] = useState<Record<string, number>>({});

  const receiveItemsMutation = useMutation({
    mutationFn: (data: any) => {
      // This would call a purchase order receiving API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast.success('Items received successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to receive items');
    },
  });

  const handleQuantityChange = (itemId: string, quantity: number) => {
    setReceivedItems(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const handleReceiveItems = () => {
    const itemsToReceive = (order as any).items.map((item: any) => ({
      itemId: item.product._id,
      orderedQuantity: item.quantity,
      receivedQuantity: receivedItems[item.product._id] || 0
    }));

    receiveItemsMutation.mutate({
      orderId: order._id,
      items: itemsToReceive
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium text-blue-900 mb-2">Receiving Items for {order.orderNumber}</h3>
        <p className="text-sm text-blue-800">
          Supplier: {order.supplier.name} | Order Date: {new Date(order.orderDate).toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-4">
        <h4 className="font-medium text-gray-900">Items to Receive</h4>
        {(order as any).items.map((item: any) => (
          <div key={item.product._id} className="border rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h5 className="font-medium text-gray-900">{item.product.name}</h5>
                <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                <p className="text-sm text-gray-600">
                  Ordered: {item.quantity} {item.product.unit}
                </p>
              </div>
              <div className="ml-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Received Quantity
                </label>
                <Input
                  type="number"
                  min="0"
                  max={item.quantity}
                  value={receivedItems[item.product._id] || 0}
                  onChange={(e) => handleQuantityChange(item.product._id, parseInt(e.target.value) || 0)}
                  className="w-24"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Max: {item.quantity}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleReceiveItems}
          disabled={receiveItemsMutation.isPending}
        >
          {receiveItemsMutation.isPending ? 'Receiving...' : 'Receive Items'}
        </Button>
      </div>
    </div>
  );
};

export default PurchaseOrdersPage;
