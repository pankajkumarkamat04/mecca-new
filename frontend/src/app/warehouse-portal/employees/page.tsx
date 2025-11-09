'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI, usersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import { z } from 'zod';
import {
  UserGroupIcon,
  UserPlusIcon,
  UserMinusIcon,
  BuildingOfficeIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

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

const WarehouseEmployeesInner: React.FC<{ warehouseId: string | null }> = ({ warehouseId }) => {
  const { user: currentUser } = useAuth();
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const queryClient = useQueryClient();

  // Check if current user is warehouse manager or admin
  const canManageEmployees = currentUser?.role === 'warehouse_manager' || currentUser?.role === 'admin';

  // Fetch warehouse employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['warehouse-employees', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseEmployees(warehouseId!),
    enabled: !!warehouseId,
  });

  // Remove employee mutation
  const removeEmployeeMutation = useMutation({
    mutationFn: (employeeId: string) =>
      warehouseAPI.removeEmployee(warehouseId!, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-employees', warehouseId] });
      toast.success('Employee removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove employee');
    },
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
      queryClient.invalidateQueries({ queryKey: ['available-users'] });
      setShowCreateUserModal(false);
      toast.success('Warehouse employee created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create employee');
    },
  });

  const employees = employeesData?.data?.data?.employees || [];
  const manager = employeesData?.data?.data?.manager;

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'warehouse_manager':
        return 'bg-purple-100 text-purple-800';
      case 'warehouse_employee':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Employee',
      render: (row: Employee) => (
        <div>
          <div className="font-medium text-gray-900">
            {row.user.firstName} {row.user.lastName}
          </div>
          <div className="text-sm text-gray-500">{row.user.email}</div>
        </div>
      ),
    },
    {
      key: 'position',
      label: 'Position',
      render: (row: Employee) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPositionColor(row.position)}`}>
          {row.position.replace('warehouse_', '').replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'assignedAt',
      label: 'Assigned',
      render: (row: Employee) => (
        <div>
          <div className="text-sm text-gray-900">
            {new Date(row.assignedAt).toLocaleDateString()}
          </div>
          <div className="text-xs text-gray-500">
            by {row.assignedBy.firstName} {row.assignedBy.lastName}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Employee) => (
        // Only warehouse managers and admins can remove employees
        canManageEmployees ? (
          <button
            onClick={() => handleRemoveEmployee(row._id)}
            className="text-red-600 hover:text-red-800"
            title="Remove Employee"
          >
            <UserMinusIcon className="h-4 w-4" />
          </button>
        ) : (
          <span className="text-gray-400">
            <UserMinusIcon className="h-4 w-4" />
          </span>
        )
      ),
    },
  ];

  const handleRemoveEmployee = (employeeId: string) => {
    if (confirm('Are you sure you want to remove this employee?')) {
      removeEmployeeMutation.mutate(employeeId);
    }
  };

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Warehouse Employees</h1>
            <p className="text-sm text-gray-600 sm:text-base">Manage employees assigned to this warehouse</p>
          </div>
          {/* Only show create button for warehouse managers and admins */}
          {canManageEmployees && (
            <Button
              onClick={() => setShowCreateUserModal(true)}
              className="flex w-full items-center justify-center gap-2 sm:w-auto"
            >
              <UserPlusIcon className="h-5 w-5" />
              Create Warehouse Employee
            </Button>
          )}
        </div>

        {/* Manager Section */}
        {manager && (
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">
              <ShieldCheckIcon className="mr-2 inline h-5 w-5 text-purple-600" />
              Warehouse Manager
            </h3>
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {manager.firstName} {manager.lastName}
                  </div>
                  <div className="text-sm text-gray-500">
                    {manager.email} • {manager.phone}
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  Manager
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Permission Notice */}
        {!canManageEmployees && (
          <div className="space-y-3 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex">
              <ShieldCheckIcon className="mr-2 mt-0.5 h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="text-sm font-medium text-yellow-800">
                  Limited Access
                </h3>
                <p className="mt-1 text-sm text-yellow-700">
                  Only warehouse managers and admins can create new employees or remove existing ones.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Employees Table */}
        <div className="rounded-lg bg-white shadow">
          <div className="border-b border-gray-200 px-4 py-4 sm:px-6">
            <h3 className="text-lg font-medium text-gray-900">Employees</h3>
          </div>
          <DataTable
            data={employees}
            columns={columns}
            loading={isLoading}
            pagination={undefined}
          />
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
      </div>
    </WarehousePortalLayout>
  );
};

// Create User Form Component for Warehouse Portal
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
        <div className="rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 text-lg font-medium text-blue-900">
            Create Warehouse Employee
          </h3>
          <p className="text-sm text-blue-800">
            This will create a new user account with <strong>warehouse_employee</strong> role 
            and automatically assign them to the current warehouse.
          </p>
        </div>

        <FormSection title="Employee Details">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

        <div className="rounded-lg bg-gray-50 p-4">
          <h4 className="mb-2 text-sm font-medium text-gray-900">Assignment Details</h4>
          <div className="space-y-1 text-sm text-gray-600">
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

export default function WarehouseEmployees() {
  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <WarehouseEmployeesWithParams />
    </Suspense>
  );
}

const WarehouseEmployeesWithParams: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  
  return <WarehouseEmployeesInner warehouseId={warehouseId} />;
};