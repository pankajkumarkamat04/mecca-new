'use client';

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
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
  BuildingOfficeIcon,
  ArrowPathIcon,
  UserPlusIcon,
  UserGroupIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  description?: string;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  employees?: Array<{
    _id: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    position: string;
    assignedAt: string;
    assignedBy: {
      _id: string;
      firstName: string;
      lastName: string;
    };
  }>;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  contact?: {
    phone?: string;
    email?: string;
    manager?: {
      name?: string;
      phone?: string;
      email?: string;
    };
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
  const [showAssignManagerModal, setShowAssignManagerModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedManagerId, setSelectedManagerId] = useState('');

  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehousesData, isLoading, error: warehousesError } = useQuery({
    queryKey: ['warehouses', { page: currentPage, limit: pageSize, search: searchTerm, isActive: statusFilter === 'all' ? undefined : statusFilter === 'active' }],
    queryFn: () => warehouseAPI.getWarehouses({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      isActive: statusFilter === 'all' ? undefined : statusFilter === 'active'
    }),
  });

  // Fetch warehouse stats
  const { data: statsData, error: statsError } = useQuery({
    queryKey: ['warehouse-stats'],
    queryFn: () => warehouseAPI.getWarehouseStats(),
  });


  // Fetch available users
  const { data: usersData } = useQuery({
    queryKey: ['available-users'],
    queryFn: () => warehouseAPI.getAvailableUsers(),
  });

  useEffect(() => {
    if (usersData?.data?.data) {
      setAvailableUsers(usersData.data.data);
    } else if (usersData?.data) {
      // Fallback for any different shapes
      setAvailableUsers(Array.isArray(usersData.data) ? usersData.data : []);
    }
  }, [usersData]);

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: (id: string) => warehouseAPI.deleteWarehouse(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      toast.success('Warehouse deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete warehouse');
    },
  });

  // Create warehouse mutation
  const createWarehouseMutation = useMutation({
    mutationFn: (data: any) => warehouseAPI.createWarehouse(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      setShowCreateModal(false);
      toast.success('Warehouse created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create warehouse');
    },
  });

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => warehouseAPI.updateWarehouse(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-stats'] });
      setShowEditModal(false);
      setSelectedWarehouse(null);
      toast.success('Warehouse updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update warehouse');
    },
  });

  // Assign manager mutation
  const assignManagerMutation = useMutation({
    mutationFn: ({ warehouseId, managerId }: { warehouseId: string; managerId: string }) =>
      warehouseAPI.assignManager(warehouseId, managerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      setShowAssignManagerModal(false);
      setSelectedManagerId('');
      toast.success('Manager assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign manager');
    },
  });

  const warehouses = warehousesData?.data?.data || [];
  const pagination = warehousesData?.data?.pagination || {};
  const stats = statsData?.data?.data;

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (row: Warehouse) => (
        <div className="flex items-center">
          <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.code}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'manager',
      label: 'Manager',
      render: (row: Warehouse) => (
        <div className="text-sm">
          {row.manager ? (
            <div>
              <div className="font-medium text-gray-900">
                {row.manager.firstName} {row.manager.lastName}
              </div>
              <div className="text-gray-500">{row.manager.email}</div>
            </div>
          ) : (
            <span className="text-gray-400 italic">No manager assigned</span>
          )}
        </div>
      ),
    },
    {
      key: 'employees',
      label: 'Employees',
      render: (row: Warehouse) => (
        <div className="text-sm">
          <div className="font-medium text-gray-900">
            {(row.employees?.filter(emp => emp.user).length || 0)} employees
          </div>
          <div className="text-gray-500">
            {row.capacityUtilization}% capacity utilized
          </div>
        </div>
      ),
    },
    {
      key: 'capacity',
      label: 'Capacity',
      render: (row: Warehouse) => (
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
      key: 'status',
      label: 'Status',
      render: (row: Warehouse) => (
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
      label: 'Actions',
      render: (row: Warehouse) => (
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
            className="text-amber-600 hover:text-amber-800"
            title="Edit Warehouse"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              window.location.href = `/warehouse-portal?warehouse=${row._id}`;
            }}
            className="text-purple-600 hover:text-purple-800"
            title="Open Portal"
          >
            <BuildingOfficeIcon className="h-4 w-4" />
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

  const handleAssignManager = () => {
    if (!selectedWarehouse || !selectedManagerId) return;
    assignManagerMutation.mutate({
      warehouseId: selectedWarehouse._id,
      managerId: selectedManagerId,
    });
  };

  return (
    <Layout title="Warehouses">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Warehouses</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalWarehouses || 0}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats?.activeWarehouses || 0}</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats?.capacityUtilization || 0}%</p>
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
              <p className="text-2xl font-bold text-gray-900">{stats?.weightUtilization || 0}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold">📦</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Products</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.totalProducts || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold">✓</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Products in Warehouses</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.productsInWarehouses || 0}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
              <span className="text-red-600 font-bold">⚠</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Products Without Warehouse</p>
              <p className="text-2xl font-bold text-gray-900">{stats?.productsWithoutWarehouse || 0}</p>
            </div>
          </div>
        </div>
      </div>

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

      {/* Create Warehouse Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Warehouse"
        size="xl"
      >
        <CreateWarehouseForm
          mutation={createWarehouseMutation}
          onCancel={() => setShowCreateModal(false)}
          availableUsers={availableUsers}
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
        size="xl"
      >
        {selectedWarehouse && (
          <EditWarehouseForm
            warehouse={selectedWarehouse}
            mutation={updateWarehouseMutation}
            onCancel={() => setShowEditModal(false)}
            availableUsers={availableUsers}
          />
        )}
      </Modal>

      {/* Assign Manager Modal */}
      <Modal
        isOpen={showAssignManagerModal}
        onClose={() => setShowAssignManagerModal(false)}
        title="Assign Manager"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Manager
            </label>
            <Select
              value={selectedManagerId}
              onChange={(e) => setSelectedManagerId(e.target.value)}
              options={[
                { value: '', label: 'Select a manager...' },
                ...(
                  Array.isArray(availableUsers)
                    ? availableUsers
                        .filter(user => 
                          user && (user.role === 'warehouse_manager' || user.role === 'manager' || user.role === 'admin')
                        )
                        .map(user => ({
                          value: user._id,
                          label: `${user.firstName} ${user.lastName} (${user.email})`
                        }))
                    : []
                )
              ]}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowAssignManagerModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAssignManager}
              disabled={assignManagerMutation.isPending || !selectedManagerId}
            >
              {assignManagerMutation.isPending ? 'Assigning...' : 'Assign Manager'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Employees Modal */}
      <Modal
        isOpen={showEmployeesModal}
        onClose={() => setShowEmployeesModal(false)}
        title={`Employees - ${selectedWarehouse?.name}`}
      >
        {selectedWarehouse && (
          <div className="space-y-4">
            {/* Manager Section */}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Manager</h3>
              {selectedWarehouse.manager ? (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">
                        {selectedWarehouse.manager.firstName} {selectedWarehouse.manager.lastName}
                      </div>
                      <div className="text-sm text-gray-500">
                        {selectedWarehouse.manager.email} • {selectedWarehouse.manager.phone}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic">No manager assigned</div>
              )}
            </div>

            {/* Employees Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Employees</h3>
              {selectedWarehouse.employees && selectedWarehouse.employees.length > 0 ? (
                <div className="space-y-2">
                  {selectedWarehouse.employees.map((employee) => (
                    <div key={employee._id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-gray-900">
                            {employee.user.firstName} {employee.user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {employee.user.email} • {employee.user.phone}
                          </div>
                          <div className="text-xs text-gray-400">
                            Position: {employee.position.replace('warehouse_', '').replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-400 italic">No employees assigned</div>
              )}
            </div>
          </div>
        )}
      </Modal>

      </div>
    </Layout>
  );
};

// Create Warehouse Form Component
const CreateWarehouseForm: React.FC<{
  mutation: any;
  onCancel: () => void;
  availableUsers: any[];
}> = ({ mutation, onCancel, availableUsers }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    manager: '', // Add manager selection
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    contact: {
      phone: '',
      email: '',
    },
    capacity: {
      totalCapacity: 0,
      maxWeight: 0,
    },
    isActive: true,
    isDefault: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First create the warehouse
      const warehouseData = { ...formData };
      const result = await mutation.mutateAsync(warehouseData);
      
      // If manager is selected, assign them
      if (formData.manager) {
        await warehouseAPI.assignManager(result.data._id, formData.manager);
      }
    } catch (error) {
      // Error handling is done by the mutation
    }
  };

  return (
    <div className="space-y-4">
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

      {/* Address Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street
            </label>
            <Input
              value={formData.address.street}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <Input
              value={formData.address.city}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, city: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <Input
              value={formData.address.state}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, state: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip Code
            </label>
            <Input
              value={formData.address.zipCode}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, zipCode: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <Input
              value={formData.address.country}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, country: e.target.value }
              })}
            />
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              value={formData.contact?.phone || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { ...formData.contact, phone: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.contact?.email || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { ...formData.contact, email: e.target.value }
              })}
            />
          </div>
        </div>
      </div>

      {/* Manager Selection */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse Manager</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Manager *
          </label>
           <Select
             value={formData.manager}
             onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
             options={[
               { value: '', label: 'Select a warehouse manager...' },
               ...(
                 Array.isArray(availableUsers)
                   ? availableUsers
                       .filter(user => user && user.role === 'warehouse_manager')
                       .map(user => ({
                         value: user._id,
                         label: `${user.firstName} ${user.lastName} (${user.email})`
                       }))
                   : []
               )
             ]}
             required
           />
          <p className="mt-1 text-sm text-gray-500">
            Only users with warehouse manager role can be selected as managers.
          </p>
        </div>
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
              capacity: { ...formData.capacity, totalCapacity: Number(e.target.value) }
            })}
            required
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
              capacity: { ...formData.capacity, maxWeight: Number(e.target.value) }
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
        <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Warehouse'}
        </Button>
      </div>
    </div>
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
  mutation: any;
  onCancel: () => void;
  availableUsers: any[];
}> = ({ warehouse, mutation, onCancel, availableUsers }) => {
  const [formData, setFormData] = useState({
    name: warehouse.name,
    code: warehouse.code,
    description: warehouse.description || '',
    manager: warehouse.manager?._id || '', // Initialize with current manager ID
    address: warehouse.address || {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    contact: warehouse.contact || {
      phone: '',
      email: '',
      manager: {
        name: '',
        phone: '',
        email: ''
      }
    },
    capacity: warehouse.capacity || {
      totalCapacity: 0,
      maxWeight: 0,
    },
    isActive: warehouse.isActive,
    isDefault: warehouse.isDefault,
  });

  const managerOptions = [
    { value: '', label: 'Select a manager...' },
    ...(
      Array.isArray(availableUsers)
        ? availableUsers
            .filter(user => 
              user && (user.role === 'warehouse_manager' || user.role === 'manager' || user.role === 'admin')
            )
            .map(user => ({
              value: user._id,
              label: `${user.firstName} ${user.lastName} (${user.email})`
            }))
        : []
    )
  ];

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  const employeeOptions = [
    { value: '', label: 'Select employee to add...' },
    ...(
      Array.isArray(availableUsers)
        ? availableUsers
            .filter(user => user && !['admin', 'manager', 'warehouse_manager'].includes(user.role))
            .map(user => ({ value: user._id, label: `${user.firstName} ${user.lastName} (${user.email})` }))
        : []
    )
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // First update the warehouse basic info
      const { manager, ...updateData } = formData; // Destructure to exclude manager
      await mutation.mutateAsync({ id: warehouse._id, data: updateData });
      
      // Then handle manager assignment if changed
      const newManagerId = formData.manager;
      const currentManagerId = warehouse.manager?._id;
      if (newManagerId && newManagerId !== currentManagerId) {
        await warehouseAPI.assignManager(warehouse._id, newManagerId);
        toast.success('Manager updated successfully');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update warehouse');
    }
  };

  const handleAddEmployee = async () => {
    if (!selectedEmployeeId) return;
    try {
      await warehouseAPI.addEmployee(warehouse._id, { userId: selectedEmployeeId, position: 'warehouse_employee' });
      toast.success('Employee added to warehouse');
      setSelectedEmployeeId('');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to add employee');
    }
  };

  return (
    <div className="space-y-4">
      {/* Manager and Employees Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Staff</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Change Manager</label>
             <Select
               value={formData.manager}
               onChange={(e) => setFormData({ ...formData, manager: e.target.value })}
               options={managerOptions}
             />
            <p className="mt-1 text-xs text-gray-500">Select a new manager for this warehouse.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Add Employees</label>
            <div className="flex gap-2 items-center">
              <Select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                options={employeeOptions}
              />
              <Button type="button" onClick={handleAddEmployee} disabled={!selectedEmployeeId}>
                Add Employee
              </Button>
            </div>
            <p className="mt-1 text-xs text-gray-500">Select a user to add as warehouse employee.</p>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Current Employees ({(warehouse.employees || []).length})</h4>
              <div className="space-y-2">
                {(warehouse.employees || []).map((emp) => (
                  <div key={emp._id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="text-sm text-gray-800">
                      {emp.user?.firstName} {emp.user?.lastName} — {emp.position.replace('warehouse_', '').replace('_', ' ')}
                    </div>
                    <button
                      type="button"
                      className="text-red-600 hover:text-red-800 text-sm"
                      onClick={async () => {
                        try {
                          await warehouseAPI.removeEmployee(warehouse._id, emp._id);
                          toast.success('Employee removed');
                        } catch (err: any) {
                          toast.error(err?.response?.data?.message || 'Failed to remove employee');
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
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

      {/* Address Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Address Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street
            </label>
            <Input
              value={formData.address.street}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, street: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City
            </label>
            <Input
              value={formData.address.city}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, city: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State
            </label>
            <Input
              value={formData.address.state}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, state: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zip Code
            </label>
            <Input
              value={formData.address.zipCode}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, zipCode: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <Input
              value={formData.address.country}
              onChange={(e) => setFormData({
                ...formData,
                address: { ...formData.address, country: e.target.value }
              })}
            />
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <Input
              value={formData.contact?.phone || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { ...formData.contact, phone: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input
              type="email"
              value={formData.contact?.email || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { ...formData.contact, email: e.target.value }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager Name
            </label>
            <Input
              value={formData.contact?.manager?.name || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { 
                  ...formData.contact, 
                  manager: { ...formData.contact?.manager, name: e.target.value }
                }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager Phone
            </label>
            <Input
              value={formData.contact?.manager?.phone || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { 
                  ...formData.contact, 
                  manager: { ...formData.contact?.manager, phone: e.target.value }
                }
              })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Manager Email
            </label>
            <Input
              type="email"
              value={formData.contact?.manager?.email || ''}
              onChange={(e) => setFormData({
                ...formData,
                contact: { 
                  ...formData.contact, 
                  manager: { ...formData.contact?.manager, email: e.target.value }
                }
              })}
            />
          </div>
        </div>
      </div>

      {/* Capacity Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Capacity Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Capacity *
            </label>
            <Input
              type="number"
              value={formData.capacity.totalCapacity}
              onChange={(e) => setFormData({
                ...formData,
                capacity: { ...formData.capacity, totalCapacity: Number(e.target.value) }
              })}
              required
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
                capacity: { ...formData.capacity, maxWeight: Number(e.target.value) }
              })}
            />
          </div>
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
        <Button type="button" onClick={handleSubmit} disabled={mutation.isPending}>
          {mutation.isPending ? 'Updating...' : 'Update Warehouse'}
        </Button>
      </div>
    </div>
  );
};


export default WarehousesPage;
