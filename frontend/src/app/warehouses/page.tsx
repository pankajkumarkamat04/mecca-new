'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  description?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  capacity?: {
    totalCapacity?: number;
    currentOccupancy?: number;
    maxWeight?: number;
    currentWeight?: number;
  };
  locationCount?: number;
  capacityUtilization?: number;
  weightUtilization?: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

const WarehousesPage: React.FC = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehousesData, isLoading } = useQuery({
    queryKey: ['warehouses', { page: currentPage, limit: pageSize, search: searchTerm, isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' }],
    queryFn: () => warehouseAPI.getWarehouses({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active'
    }),
  });

  // Fetch warehouse stats
  const { data: statsData } = useQuery({
    queryKey: ['warehouse-stats'],
    queryFn: () => warehouseAPI.getWarehouseStats(),
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: (id: string) => warehouseAPI.deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
    },
  });

  const warehouses = warehousesData?.data || [];
  const pagination = warehousesData?.pagination;
  const stats = statsData?.data;

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (value: string, row: Warehouse) => (
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{value}</div>
            <div className="text-sm text-gray-500">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Location',
      render: (value: any, row: Warehouse) => (
        <div className="text-sm text-gray-900">
          {row.address?.city && row.address?.state 
            ? `${row.address.city}, ${row.address.state}`
            : 'No address set'
          }
        </div>
      ),
    },
    {
      key: 'capacity',
      header: 'Capacity',
      render: (value: any, row: Warehouse) => (
        <div className="text-sm">
          <div className="text-gray-900">
            {row.capacity?.currentOccupancy || 0} / {row.capacity?.totalCapacity || 0}
          </div>
          <div className="text-gray-500">
            {row.capacityUtilization}% utilized
          </div>
        </div>
      ),
    },
    {
      key: 'locationCount',
      header: 'Locations',
      render: (value: number) => (
        <div className="flex items-center text-sm text-gray-900">
          <MapPinIcon className="h-4 w-4 mr-1" />
          {value || 0}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value: any, row: Warehouse) => (
        <div className="flex items-center">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            row.isActive 
              ? 'bg-green-100 text-green-800' 
              : 'bg-red-100 text-red-800'
          }`}>
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
          {row.isDefault && (
            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Default
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (value: any, row: Warehouse) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedWarehouse(row);
              setShowViewModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedWarehouse(row);
              setShowEditModal(true);
            }}
            className="text-green-600 hover:text-green-800"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedWarehouse(row);
              setShowLocationModal(true);
            }}
            className="text-purple-600 hover:text-purple-800"
            title="Manage Locations"
          >
            <MapPinIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this warehouse?')) {
                deleteWarehouseMutation.mutate(row._id);
              }
            }}
            className="text-red-600 hover:text-red-800"
            title="Delete"
            disabled={row.isDefault}
          >
            <TrashIcon className="h-4 w-4" />
          </button>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouses</h1>
          <p className="text-gray-600">Manage your warehouse locations and inventory</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Warehouse
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Warehouses</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalWarehouses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">✓</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Active Warehouses</p>
                <p className="text-2xl font-bold text-gray-900">{stats.activeWarehouses}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">%</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Capacity Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{stats.capacityUtilization}%</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">W</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Weight Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{stats.weightUtilization}%</p>
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
              placeholder="Search warehouses..."
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
                { value: 'active', label: 'Active Only' },
                { value: 'inactive', label: 'Inactive Only' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={warehouses}
          columns={columns}
          isLoading={isLoading}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: pagination?.total || 0,
            pages: pagination?.pages || 0,
            onPageChange: setCurrentPage,
          }}
        />
      </div>

      {/* Create Warehouse Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Warehouse"
      >
        <CreateWarehouseForm
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
          }}
          onCancel={() => setShowCreateModal(false)}
        />
      </Modal>

      {/* View Warehouse Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Warehouse Details"
      >
        {selectedWarehouse && (
          <ViewWarehouseDetails warehouse={selectedWarehouse} />
        )}
      </Modal>

      {/* Edit Warehouse Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Warehouse"
      >
        {selectedWarehouse && (
          <EditWarehouseForm
            warehouse={selectedWarehouse}
            onSuccess={() => {
              setShowEditModal(false);
              queryClient.invalidateQueries({ queryKey: ['warehouses'] });
              queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
            }}
            onCancel={() => setShowEditModal(false)}
          />
        )}
      </Modal>

      {/* Manage Locations Modal */}
      <Modal
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        title="Manage Locations"
      >
        {selectedWarehouse && (
          <ManageLocationsForm
            warehouse={selectedWarehouse}
            onSuccess={() => {
              setShowLocationModal(false);
              queryClient.invalidateQueries({ queryKey: ['warehouses'] });
            }}
            onCancel={() => setShowLocationModal(false)}
          />
        )}
      </Modal>
    </div>
  );
};

// Create Warehouse Form Component
const CreateWarehouseForm: React.FC<{
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    capacity: {
      totalCapacity: '',
      maxWeight: '',
    },
    isActive: true,
    isDefault: false,
  });

  const createWarehouseMutation = useMutation({
    mutationFn: (data: any) => warehouseAPI.createWarehouse(data),
    onSuccess: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createWarehouseMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warehouse Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warehouse Code *
          </label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total Capacity
          </label>
          <Input
            type="number"
            value={formData.capacity.totalCapacity}
            onChange={(e) => setFormData({
              ...formData,
              capacity: { ...formData.capacity, totalCapacity: e.target.value }
            })}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max Weight (kg)
          </label>
          <Input
            type="number"
            value={formData.capacity.maxWeight}
            onChange={(e) => setFormData({
              ...formData,
              capacity: { ...formData.capacity, maxWeight: e.target.value }
            })}
          />
        </div>
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="mr-2"
          />
          Active
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="mr-2"
          />
          Default Warehouse
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={createWarehouseMutation.isPending}>
          {createWarehouseMutation.isPending ? 'Creating...' : 'Create Warehouse'}
        </Button>
      </div>
    </form>
  );
};

// View Warehouse Details Component
const ViewWarehouseDetails: React.FC<{ warehouse: Warehouse }> = ({ warehouse }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="text-sm text-gray-900">{warehouse.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Code</dt>
              <dd className="text-sm text-gray-900">{warehouse.code}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="text-sm">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  warehouse.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {warehouse.isActive ? 'Active' : 'Inactive'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Capacity</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Current Occupancy</dt>
              <dd className="text-sm text-gray-900">{warehouse.capacity?.currentOccupancy || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Capacity</dt>
              <dd className="text-sm text-gray-900">{warehouse.capacity?.totalCapacity || 0}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Utilization</dt>
              <dd className="text-sm text-gray-900">{warehouse.capacityUtilization}%</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};

// Edit Warehouse Form Component
const EditWarehouseForm: React.FC<{
  warehouse: Warehouse;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ warehouse, onSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    name: warehouse.name,
    code: warehouse.code,
    description: warehouse.description || '',
    address: warehouse.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    capacity: warehouse.capacity || {
      totalCapacity: '',
      maxWeight: '',
    },
    isActive: warehouse.isActive,
    isDefault: warehouse.isDefault,
  });

  const updateWarehouseMutation = useMutation({
    mutationFn: (data: any) => warehouseAPI.updateWarehouse(warehouse._id, data),
    onSuccess: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWarehouseMutation.mutate(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warehouse Name *
          </label>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warehouse Code *
          </label>
          <Input
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
            required
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isActive}
            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
            className="mr-2"
          />
          Active
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={formData.isDefault}
            onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
            className="mr-2"
          />
          Default Warehouse
        </label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={updateWarehouseMutation.isPending}>
          {updateWarehouseMutation.isPending ? 'Updating...' : 'Update Warehouse'}
        </Button>
      </div>
    </form>
  );
};

// Manage Locations Form Component
const ManageLocationsForm: React.FC<{
  warehouse: Warehouse;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ warehouse, onSuccess, onCancel }) => {
  return (
    <div className="space-y-4">
      <p className="text-gray-600">
        Location management for {warehouse.name} will be implemented here.
      </p>
      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Close
        </Button>
      </div>
    </div>
  );
};

export default WarehousesPage;
