'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI, usersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { z } from 'zod';
import {
  ChartBarIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BuildingOfficeIcon,
  UserPlusIcon,
  UserGroupIcon,
  UserMinusIcon,
  ShieldCheckIcon,
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

const WarehouseDashboardInner: React.FC<{ warehouseId: string | null }> = ({ warehouseId }) => {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  // Check if current user is warehouse manager or admin
  const canManageEmployees = currentUser?.role === 'warehouse_manager' || currentUser?.role === 'admin';

  // Employee management state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showEmployeesModal, setShowEmployeesModal] = useState(false);

  // Fetch dashboard data
  const { data: dashboardResponse, isLoading } = useQuery({
    queryKey: ['warehouse-dashboard', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseDashboard(warehouseId!),
    enabled: !!warehouseId,
  });

  // Fetch employees
  const { data: employeesResponse } = useQuery({
    queryKey: ['warehouse-employees', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseEmployees(warehouseId!),
    enabled: !!warehouseId,
  });

  // Create user mutation (warehouse_employee role)
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => {
      // Automatically assign to current warehouse as warehouse_employee
      const payload = {
        ...userData,
        role: 'warehouse_employee',
        warehouse: warehouseId
      };
      return usersAPI.createUser(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-employees', warehouseId] });
      queryClient.invalidateQueries({ queryKey: ['warehouse-dashboard', warehouseId] });
      setShowCreateUserModal(false);
      toast.success('Warehouse employee created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create employee');
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
            {/* Only show create button for warehouse managers and admins */}
            {canManageEmployees && (
              <Button
                onClick={() => setShowCreateUserModal(true)}
                className="flex items-center"
              >
                <UserPlusIcon className="h-5 w-5 mr-2" />
                Create Warehouse Employee
              </Button>
            )}
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

        {/* Permission Notice */}
        {!canManageEmployees && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <ShieldCheckIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Limited Access
                </h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Only warehouse managers and admins can create new employees or remove existing ones.
                </p>
              </div>
            </div>
          </div>
        )}

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

      {/* Create User Modal - Only for warehouse managers and admins */}
      {canManageEmployees && (
        <Modal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          title="Create Warehouse Employee"
          size="lg"
        >
          <CreateUserForm 
            onSuccess={() => setShowCreateUserModal(false)}
            warehouseId={warehouseId!}
            mutation={createUserMutation}
          />
        </Modal>
      )}

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
                    {/* Only warehouse managers and admins can remove employees */}
                    {canManageEmployees ? (
                      <button
                        onClick={() => handleRemoveEmployee(employee._id)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove Employee"
                      >
                        <UserMinusIcon className="h-4 w-4" />
                      </button>
                    ) : (
                      <span className="text-gray-400">
                        <UserMinusIcon className="h-4 w-4" />
                      </span>
                    )}
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

export default function WarehouseDashboard() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <WarehouseDashboardWithParams />
    </Suspense>
  );
}

// Create User Form Component for Warehouse Portal Dashboard
const CreateUserForm: React.FC<{ 
  onSuccess: () => void; 
  warehouseId: string; 
  mutation: any;
}> = ({ onSuccess, warehouseId, mutation }) => {
  const createUserSchema = z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Min 6 characters'),
    phone: z.string().optional().or(z.literal('')),
  });

  return (
    <Form
      schema={createUserSchema}
      defaultValues={{ 
        firstName: '', 
        lastName: '', 
        email: '', 
        password: '', 
        phone: '' 
      }}
      loading={mutation.isPending}
    >{(methods) => (
      <div className="space-y-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            Create Warehouse Employee
          </h3>
          <p className="text-sm text-blue-800">
            This will create a new user account with <strong>warehouse_employee</strong> role 
            and automatically assign them to the current warehouse.
          </p>
        </div>

        <FormSection title="Employee Details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="First Name" required error={methods.formState.errors.firstName?.message as string}>
              <Input {...methods.register('firstName')} fullWidth />
            </FormField>
            <FormField label="Last Name" required error={methods.formState.errors.lastName?.message as string}>
              <Input {...methods.register('lastName')} fullWidth />
            </FormField>
            <FormField label="Email" required error={methods.formState.errors.email?.message as string}>
              <Input type="email" {...methods.register('email')} fullWidth />
            </FormField>
            <FormField label="Phone" error={methods.formState.errors.phone?.message as string}>
              <Input {...methods.register('phone')} fullWidth />
            </FormField>
            <FormField label="Password" required error={methods.formState.errors.password?.message as string}>
              <Input type="password" {...methods.register('password')} fullWidth />
            </FormField>
          </div>
        </FormSection>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Assignment Details</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <p>• <strong>Role:</strong> warehouse_employee</p>
            <p>• <strong>Assigned to:</strong> Current warehouse</p>
            <p>• <strong>Permissions:</strong> Can view and edit inventory</p>
          </div>
        </div>

        <FormActions
          onCancel={onSuccess}
          onSubmit={async () => {
            const isValid = await methods.trigger();
            if (isValid) {
              const values = methods.getValues();
              const payload = { ...values } as any;
              if (!payload.phone) delete payload.phone;
              await mutation.mutateAsync(payload);
            } else {
              toast.error('Please fill in all required fields');
            }
          }}
          submitText={mutation.isPending ? 'Creating Employee...' : 'Create Employee'}
          loading={mutation.isPending}
        />
      </div>
    )}</Form>
  );
};

const WarehouseDashboardWithParams: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  
  return <WarehouseDashboardInner warehouseId={warehouseId} />;
};
