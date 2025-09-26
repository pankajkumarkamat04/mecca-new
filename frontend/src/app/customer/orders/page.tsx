'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ShoppingBagIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  TruckIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { ordersAPI } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const CustomerOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch customer orders
  const { data: ordersData, isLoading, error } = useQuery({
    queryKey: ['customerOrders', user?._id],
    queryFn: () => ordersAPI.getOrders({
      customer: user?._id
    }),
    enabled: !!user?._id,
  });

  const orders = ordersData?.data || [];

  const handleViewDetails = (order: any) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'gray', icon: ClockIcon },
      pending: { color: 'yellow', icon: ClockIcon },
      confirmed: { color: 'blue', icon: CheckCircleIcon },
      processing: { color: 'purple', icon: ClockIcon },
      shipped: { color: 'indigo', icon: TruckIcon },
      delivered: { color: 'green', icon: CheckCircleIcon },
      cancelled: { color: 'red', icon: XCircleIcon },
      returned: { color: 'orange', icon: ExclamationTriangleIcon },
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

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'yellow' },
      partial: { color: 'orange' },
      paid: { color: 'green' },
      failed: { color: 'red' },
      refunded: { color: 'blue' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge color={config.color as any}>{status}</Badge>;
  };

  if (error) {
    return (
      <Layout title="My Orders">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading orders</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Orders">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Orders</h1>
          <p className="text-gray-600">Track your orders and delivery status</p>
        </div>

        {/* Orders List */}
        <div className="bg-white rounded-lg border">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : orders.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {orders.map((order: any) => (
                <div key={order._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Order #{order.orderNumber}
                        </h3>
                        {getStatusBadge(order.status)}
                        {getPaymentStatusBadge(order.paymentStatus)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Total Amount: {formatCurrency(order.total)}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Order Date: {formatDate(order.orderDate)}</span>
                        <span>Expected Delivery: {formatDate(order.expectedDeliveryDate)}</span>
                        <span>Items: {order.items?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {order.status === 'delivered' && (
                        <Button size="sm" variant="outline">
                          Track Delivery
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBagIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No orders found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any orders yet.
              </p>
            </div>
          )}
        </div>

        {/* Order Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
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
                  <div className="mt-1">{getStatusBadge(selectedOrder.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Status</label>
                  <div className="mt-1">{getPaymentStatusBadge(selectedOrder.paymentStatus)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Order Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.orderDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Delivery</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedOrder.expectedDeliveryDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Payment Method</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.paymentMethod || 'N/A'}</p>
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
                      {selectedOrder.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subtotal</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedOrder.subtotal)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tax ({selectedOrder.taxRate}%)</label>
                  <p className="mt-1 text-sm text-gray-900">{formatCurrency(selectedOrder.taxAmount)}</p>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="mt-1 text-lg font-bold text-gray-900">{formatCurrency(selectedOrder.total)}</p>
                </div>
              </div>

              {selectedOrder.shippingAddress && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Shipping Address</label>
                  <div className="mt-1 text-sm text-gray-900">
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>{selectedOrder.shippingAddress.city}, {selectedOrder.shippingAddress.state} {selectedOrder.shippingAddress.zipCode}</p>
                    <p>{selectedOrder.shippingAddress.country}</p>
                  </div>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedOrder.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                {selectedOrder.status === 'delivered' && (
                  <Button>
                    Track Delivery
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerOrdersPage;
