'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BuildingOfficeIcon,
  UserPlusIcon,
  UserGroupIcon,
  UserMinusIcon,
} from '@heroicons/react/24/outline';

interface DashboardData {
  warehouse: {
    id: string;
    name: string;
    code: string;
    capacityUtilization: number;
    weightUtilization: number;
  };
  statistics: {
    totalProducts: number;
    lowStockProducts: number;
    totalStockValue: number;
    activeEmployees: number;
    totalLocations: number;
  };
  recentMovements: Array<{
    _id: string;
    movementType: string;
    quantity: number;
    product: {
      name: string;
    };
    createdBy: {
      firstName: string;
      lastName: string;
    };
    createdAt: string;
  }>;
}

interface Employee {
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
}

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  warehouse?: {
    assignedWarehouse?: string;
    warehousePosition?: string;
  };
}

const WarehouseDashboard: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const queryClient = useQueryClient();

  // Employee management state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('warehouse_employee');

  // Fetch dashboard data
  const { data: dashboardResponse, isLoading } = useQuery({
    queryKey: ['warehouse-dashboard', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseDashboard(warehouseId!),
    enabled: !!warehouseId,
  });

  // Fetch available users
  const { data: usersData } = useQuery({
    queryKey: ['available-users'],
    queryFn: () => warehouseAPI.getAvailableUsers(),
    enabled: !!warehouseId,
  });

  // Fetch employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['warehouse-employees', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseEmployees(warehouseId!),
    enabled: !!warehouseId,
  });

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: ({ userId, position }: { userId: string; position: string }) =>
      warehouseAPI.addEmployee(warehouseId!, { userId, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-employees', warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-dashboard', warehouseId] });
      setShowAddEmployeeModal(false);
      setSelectedUserId('');
      setSelectedPosition('warehouse_employee');
      toast.success('Employee added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add employee');
    },
  });

  // Remove employee mutation
  const removeEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) =>
      warehouseAPI.removeEmployee(warehouseId!, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-employees', warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-dashboard', warehouseId] });
      toast.success('Employee removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove employee');
    },
  });

  const dashboardData: DashboardData | null = dashboardResponse?.data?.data || null;

  // Update employees state
  useEffect(() => {
    if (employeesResponse?.data?.data?.employees) {
      setEmployees(employeesResponse.data.data.employees);
    }
  }, [employeesResponse]);

  // Update available users state
  useEffect(() => {
    if (usersData?.data) {
      setAvailableUsers(usersData.data);
    }
  }, [usersData]);

  const handleAddEmployee = () => {
    if (!selectedUserId) return;
    addEmployeeMutation.mutate({
      userId: selectedUserId,
      position: selectedPosition,
    });
  };

  const handleRemoveEmployee = (employeeId: string) => {
    if (confirm('Are you sure you want to remove this employee?')) {
      removeEmployeeMutation.mutate(employeeId);
    }
  };

  if (isLoading) {
    return (
      <WarehousePortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </WarehousePortalLayout>
    );
  }

  if (!dashboardData) {
    return (
      <WarehousePortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Available</h3>
            <p className="text-gray-500">Unable to load dashboard data.</p>
          </div>
        </div>
      </WarehousePortalLayout>
    );
  }

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {dashboardData?.warehouse.name} Dashboard
            </h1>
            <p className="text-gray-600">Manage your warehouse operations and employees</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowAddEmployeeModal(true)}
              className="flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Employee
            </Button>
            <Button
              onClick={() => setShowEmployeesModal(true)}
              variant="secondary"
              className="flex items-center"
            >
              <UserGroupIcon className="h-5 w-5 mr-2" />
              View Employees
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.statistics.totalProducts}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.statistics.lowStockProducts}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Employees</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.statistics.activeEmployees}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 font-bold">%</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Capacity Used</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.warehouse.capacityUtilization}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Stock Value</p>
                <p className="text-2xl font-bold text-gray-900">
                  ${dashboardData.statistics.totalStockValue?.toLocaleString()}
                </p>
              </div>
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <span className="text-green-600 font-bold">$</span>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Locations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.statistics.totalLocations}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <BuildingOfficeIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
          </div>
          <div className="p-6">
            {dashboardData.recentMovements && dashboardData.recentMovements.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentMovements.map((movement) => (
                  <div key={movement._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                        movement.movementType === 'in' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {movement.movementType === 'in' ? (
                          <ArrowUpIcon className="h-4 w-4 text-green-600" />
                        ) : (
                          <ArrowDownIcon className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{movement.product.name}</div>
                        <div className="text-sm text-gray-500">
                          {movement.movementType} • {movement.quantity} units
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-500">
                        {movement.createdBy.firstName} {movement.createdBy.lastName}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(movement.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <ChartBarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recent movements</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      <Modal
        isOpen={showAddEmployeeModal}
        onClose={() => setShowAddEmployeeModal(false)}
        title="Add Employee"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Employee
            </label>
            <Select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              options={[
                { value: '', label: 'Select an employee...' },
                ...availableUsers
                  .filter(user => 
                    !user.warehouse?.assignedWarehouse &&
                    (user.role === 'employee' || 
                     user.role === 'warehouse_employee')
                  )
                  .map(user => ({
                    value: user._id,
                    label: `${user.firstName} ${user.lastName} (${user.email})`
                  }))
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <Select
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
                options={[
                  { value: 'warehouse_employee', label: 'Warehouse Employee' },
                ]}
            />
          </div>
          <div className="flex justify-end space-x-3 pt-4">
            <Button 
              type="button" 
              variant="secondary" 
              onClick={() => setShowAddEmployeeModal(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddEmployee}
              disabled={addEmployeeMutation.isPending || !selectedUserId}
            >
              {addEmployeeMutation.isPending ? 'Adding...' : 'Add Employee'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Employees Modal */}
      <Modal
        isOpen={showEmployeesModal}
        onClose={() => setShowEmployeesModal(false)}
        title="Warehouse Employees"
      >
        <div className="space-y-4">
          {employees.length > 0 ? (
            <div className="space-y-2">
              {employees.map((employee) => (
                <div key={employee._id} className="bg-gray-50 p-4 rounded-lg">
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
                      <div className="text-xs text-gray-400">
                        Assigned: {new Date(employee.assignedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveEmployee(employee._id)}
                      className="text-red-600 hover:text-red-800"
                      title="Remove Employee"
                    >
                      <UserMinusIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <UserGroupIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No employees assigned</p>
            </div>
          )}
        </div>
      </Modal>
    </WarehousePortalLayout>
  );
};

export default WarehouseDashboard;
