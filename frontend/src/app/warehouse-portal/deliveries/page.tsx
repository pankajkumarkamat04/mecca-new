'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI, deliveriesAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import {
  TruckIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  UserIcon,
} from '@heroicons/react/24/outline';

interface Delivery {
  _id: string;
  deliveryNumber: string;
  order: {
    _id: string;
    orderNumber: string;
    customer: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  warehouse: {
    _id: string;
    name: string;
  };
  status: string;
  deliveryDate: string;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  driver?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  trackingNumber?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const WarehouseDeliveries: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();

  // Fetch deliveries for warehouse
  const { data: deliveriesData, isLoading } = useQuery({
    queryKey: ['warehouse-deliveries', warehouseId, statusFilter, searchTerm],
    queryFn: () => deliveriesAPI.getDeliveries({
      warehouse: warehouseId,
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: searchTerm,
      limit: 50,
    }),
    enabled: !!warehouseId,
  });

  // Update delivery status mutation
  const updateDeliveryStatusMutation = useMutation({
    mutationFn: ({ deliveryId, status }: { deliveryId: string; status: string }) =>
      deliveriesAPI.updateDelivery(deliveryId, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-deliveries', warehouseId] });
      toast.success('Delivery status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update delivery status');
    },
  });

  const deliveries = deliveriesData?.data?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'assigned':
        return 'bg-blue-100 text-blue-800';
      case 'in_transit':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'assigned':
        return <TruckIcon className="h-4 w-4" />;
      case 'in_transit':
        return <TruckIcon className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'failed':
        return <ClockIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const columns = [
    {
      key: 'deliveryNumber',
      label: 'Delivery',
      render: (row: Delivery) => (
        <div>
          <div className="font-medium text-gray-900">{row.trackingNumber}</div>
          <div className="text-sm text-gray-500">
            Order: {row.order.orderNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (row: Delivery) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.order.customer.firstName} {row.order.customer.lastName}
          </div>
          <div className="text-sm text-gray-500">{row.order.customer.email}</div>
        </div>
      ),
    },
    {
      key: 'deliveryAddress',
      label: 'Delivery Address',
      render: (row: Delivery) => (
        <div>
          <div className="text-sm text-gray-900">
            {row.deliveryAddress.street}
          </div>
          <div className="text-sm text-gray-500">
            {row.deliveryAddress.city}, {row.deliveryAddress.state} {row.deliveryAddress.zipCode}
          </div>
        </div>
      ),
    },
    {
      key: 'deliveryDate',
      label: 'Delivery Date',
      render: (row: Delivery) => (
        <div className="text-sm text-gray-900">
          {new Date(row.deliveryDate).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: Delivery) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
          {getStatusIcon(row.status)}
          <span className="ml-1">{row.status.replace('_', ' ')}</span>
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Delivery) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedDelivery(row);
              setShowDeliveryModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {row.status === 'assigned' && (
            <button
              onClick={() => updateDeliveryStatusMutation.mutate({
                deliveryId: row._id,
                status: 'in_transit'
              })}
              className="text-green-600 hover:text-green-800"
              title="Mark In Transit"
            >
              <TruckIcon className="h-4 w-4" />
            </button>
          )}
          {row.status === 'in_transit' && (
            <button
              onClick={() => updateDeliveryStatusMutation.mutate({
                deliveryId: row._id,
                status: 'delivered'
              })}
              className="text-green-600 hover:text-green-800"
              title="Mark Delivered"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
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
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Deliveries</h1>
            <p className="text-gray-600">Manage deliveries from this warehouse</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TruckIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Deliveries</p>
                <p className="text-2xl font-bold text-gray-900">{deliveries.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter((d: Delivery) => d.status === 'pending').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <TruckIcon className="h-5 w-5 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Transit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter((d: Delivery) => d.status === 'in_transit').length}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Delivered</p>
                <p className="text-2xl font-bold text-gray-900">
                  {deliveries.filter((d: Delivery) => d.status === 'delivered').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search deliveries..."
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
                  { value: 'assigned', label: 'Assigned' },
                  { value: 'in_transit', label: 'In Transit' },
                  { value: 'delivered', label: 'Delivered' },
                  { value: 'failed', label: 'Failed' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={deliveries}
            columns={columns}
            loading={isLoading}
            pagination={undefined}
          />
        </div>

        {/* Delivery Details Modal */}
        <Modal
          isOpen={showDeliveryModal}
          onClose={() => setShowDeliveryModal(false)}
          title={`Delivery Details - ${selectedDelivery?.deliveryNumber}`}
          size="lg"
        >
          {selectedDelivery && (
            <div className="space-y-6">
              {/* Delivery Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Delivery Number</dt>
                      <dd className="text-sm text-gray-900">{selectedDelivery.deliveryNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedDelivery.status)}`}>
                          {getStatusIcon(selectedDelivery.status)}
                          <span className="ml-1">{selectedDelivery.status.replace('_', ' ')}</span>
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Delivery Date</dt>
                      <dd className="text-sm text-gray-900">
                        {new Date(selectedDelivery.deliveryDate).toLocaleDateString()}
                      </dd>
                    </div>
                    {selectedDelivery.trackingNumber && (
                      <div>
                        <dt className="text-sm font-medium text-gray-500">Tracking Number</dt>
                        <dd className="text-sm text-gray-900">{selectedDelivery.trackingNumber}</dd>
                      </div>
                    )}
                  </dl>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Order Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Order Number</dt>
                      <dd className="text-sm text-gray-900">{selectedDelivery.order.orderNumber}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Customer</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedDelivery.order.customer.firstName} {selectedDelivery.order.customer.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Customer Email</dt>
                      <dd className="text-sm text-gray-900">{selectedDelivery.order.customer.email}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              {/* Delivery Address */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Delivery Address</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-900">{selectedDelivery.deliveryAddress.street}</div>
                      <div className="text-sm text-gray-500">
                        {selectedDelivery.deliveryAddress.city}, {selectedDelivery.deliveryAddress.state} {selectedDelivery.deliveryAddress.zipCode}
                      </div>
                      <div className="text-sm text-gray-500">{selectedDelivery.deliveryAddress.country}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Driver Information */}
              {selectedDelivery.driver && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Driver Information</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm text-gray-900">
                          {selectedDelivery.driver.firstName} {selectedDelivery.driver.lastName}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedDelivery.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notes</h3>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900">{selectedDelivery.notes}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>
      </div>
    </WarehousePortalLayout>
  );
};

export default WarehouseDeliveries;
