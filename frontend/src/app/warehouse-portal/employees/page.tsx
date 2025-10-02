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
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedPosition, setSelectedPosition] = useState('warehouse_employee');

  const queryClient = useQueryClient();

  // Fetch warehouse employees
  const { data: employeesData, isLoading } = useQuery({
    queryKey: ['warehouse-employees', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseEmployees(warehouseId!),
    enabled: !!warehouseId,
  });

  // Fetch available users
  const { data: usersData } = useQuery({
    queryKey: ['available-users'],
    queryFn: () => warehouseAPI.getAvailableUsers(),
    enabled: !!warehouseId,
  });

  // Add employee mutation
  const addEmployeeMutation = useMutation({
    mutationFn: ({ userId, position }: { userId: string; position: string }) =>
      warehouseAPI.addEmployee(warehouseId!, { userId, position }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-employees', warehouseId] });
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
      toast.success('Employee removed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove employee');
    },
  });

  // Create user mutation (for warehouse portal)
  const createUserMutation = useMutation({
    mutationFn: (userData: any) => {
      // Automatically assign to current warehouse
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
      toast.success('User created and assigned to warehouse successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    },
  });

  const employees = employeesData?.data?.data?.employees || [];
  const manager = employeesData?.data?.data?.manager;
  const availableUsers = usersData?.data?.data || [];

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
        <button
          onClick={() => handleRemoveEmployee(row._id)}
          className="text-red-600 hover:text-red-800"
          title="Remove Employee"
        >
          <UserMinusIcon className="h-4 w-4" />
        </button>
      ),
    },
  ];

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

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Employees</h1>
            <p className="text-gray-600">Manage employees assigned to this warehouse</p>
          </div>
          <div className="flex space-x-3">
            <Button
              onClick={() => setShowCreateUserModal(true)}
              variant="outline"
              className="flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Create User
            </Button>
            <Button
              onClick={() => setShowAddEmployeeModal(true)}
              className="flex items-center"
            >
              <UserPlusIcon className="h-5 w-5 mr-2" />
              Add Employee
            </Button>
          </div>
        </div>

        {/* Manager Section */}
        {manager && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Warehouse Manager</h3>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
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

        {/* Employees Table */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Employees</h3>
          </div>
          <DataTable
            data={employees}
            columns={columns}
            loading={isLoading}
            pagination={undefined}
          />
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
                    .filter((user: User) => 
                      !user.warehouse?.assignedWarehouse &&
                      (user.role === 'employee' || 
                       user.role === 'warehouse_employee')
                    )
                    .map((user: User) => ({
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

        {/* Create User Modal */}
        <Modal
          isOpen={showCreateUserModal}
          onClose={() => setShowCreateUserModal(false)}
          title="Create New User"
          size="lg"
        >
          <CreateUserForm 
            onSuccess={() => setShowCreateUserModal(false)}
            warehouseId={warehouseId!}
            mutation={createUserMutation}
          />
        </Modal>
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
      onSubmit={async (values) => {
        const payload = { ...values } as any;
        if (!payload.phone) delete payload.phone;
        await mutation.mutateAsync(payload);
      }}
      loading={mutation.isPending}
    >{(methods) => (
      <div className="space-y-6">
        <FormSection title="User Details">
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
            <div className="md:col-span-2">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> This user will be automatically assigned to the current warehouse as a warehouse employee.
                </p>
              </div>
            </div>
          </div>
        </FormSection>

        <FormActions
          onCancel={onSuccess}
          submitText={mutation.isPending ? 'Creating...' : 'Create User'}
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
