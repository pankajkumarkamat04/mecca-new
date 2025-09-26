'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { usersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import { User } from '@/types';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UserPlusIcon,
} from '@heroicons/react/24/outline';

const UsersPage: React.FC = () => {
  const { user: currentUser, hasRole } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  const queryClient = useQueryClient();

  // Fetch users
  const { data: usersData, isPending } = useQuery({
    queryKey: ['users', currentPage, pageSize, searchTerm],
    queryFn: () => usersAPI.getUsers({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
    })
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => usersAPI.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete user');
    }
  });

  const handleDeleteUser = (user: User) => {
    if (window.confirm(`Are you sure you want to delete ${user.firstName} ${user.lastName}?`)) {
      deleteUserMutation.mutate(user._id);
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsEditModalOpen(true);
  };

  const columns = [
    {
      key: 'firstName',
      label: 'Name',
      sortable: true,
      render: (value: string, row: User) => (
        <div className="flex items-center">
          {row.avatar ? (
            <img
              className="h-8 w-8 rounded-full mr-3"
              src={row.avatar}
              alt={`${row.firstName} ${row.lastName}`}
            />
          ) : (
            <div className="h-8 w-8 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {row.firstName.charAt(0)}{row.lastName.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">
              {row.firstName} {row.lastName}
            </div>
            <div className="text-sm text-gray-500">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'lastLogin',
      label: 'Last Login',
      sortable: true,
      render: (value: string) => value ? formatDate(value) : 'Never',
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => formatDate(value),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: User) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewUser(row)}
            className="text-blue-600 hover:text-blue-900"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditUser(row)}
            className="text-gray-600 hover:text-gray-900"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteUser(row)}
            className="text-red-600 hover:text-red-900"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  // Check if user has permission to access this page
  if (!hasRole('admin') && !hasRole('manager')) {
    return (
      <Layout title="Users">
        <div className="text-center py-12">
          <h3 className="text-lg font-medium text-gray-900">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Users">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Users</h1>
            <p className="text-gray-600">Manage system users and their permissions</p>
          </div>
          {(hasRole('admin') || hasRole('manager')) && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<UserPlusIcon className="h-4 w-4" />}
            >
              Add User
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Filter
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <DataTable
          columns={columns}
          data={usersData?.data?.data || []}
          loading={isPending}
          pagination={usersData?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage="No users found"
        />

        {/* Create User Modal */}
        {(hasRole('admin') || hasRole('manager')) && (
          <Modal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            title="Create New User"
            size="lg"
          >
            <UserCreateForm onSuccess={() => setIsCreateModalOpen(false)} />
          </Modal>
        )}

        {/* Edit User Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit User"
          size="lg"
        >
          <div className="space-y-4">
            <p className="text-gray-600">User edit form will be implemented here.</p>
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button>
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>

        {/* View User Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="User Details"
          size="lg"
        >
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.firstName} {selectedUser.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Role</label>
                  <p className="mt-1 text-sm text-gray-900 capitalize">
                    {selectedUser.role.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedUser.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default UsersPage;

// Create User Form Component
const UserCreateForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const { user: currentUser, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const createUserSchema = useMemo(() => z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    password: z.string().min(6, 'Min 6 characters'),
    role: z.enum(['admin','manager','employee','customer']).default('employee'),
    phone: z.string().optional().or(z.literal('')),
    isActive: z.boolean().default(true),
  }), []);

  const createUserMutation = useMutation({
    mutationFn: (data: any) => usersAPI.createUser(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  });

  // Role options based on current user's permissions
  const getRoleOptions = () => {
    if (hasRole('admin')) {
      return [
        { value: 'manager', label: 'Manager' },
        { value: 'employee', label: 'Employee' },
        { value: 'customer', label: 'Customer' },
      ];
    } else if (hasRole('manager')) {
      return [
        { value: 'employee', label: 'Employee' },
        { value: 'customer', label: 'Customer' },
      ];
    }
    return [];
  };

  const roleOptions = getRoleOptions();

  return (
    <Form
      schema={createUserSchema}
      defaultValues={{ firstName: '', lastName: '', email: '', password: '', role: (roleOptions[0]?.value as any) || 'employee', phone: '', isActive: true }}
      onSubmit={async (values) => {
        const payload = { ...values } as any;
        if (!payload.phone) delete payload.phone;
        await createUserMutation.mutateAsync(payload);
      }}
      loading={createUserMutation.isPending}
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
            <FormField label="Role" required error={(methods.formState.errors as any)?.role?.message as string}>
              <Select
                options={roleOptions}
                value={methods.watch('role')}
                onChange={(e) => methods.setValue('role', e.target.value as any)}
                fullWidth
              />
            </FormField>
          </div>
        </FormSection>

        <FormSection title="Status">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Active">
              <select
                className="input"
                value={methods.watch('isActive') ? 'true' : 'false'}
                onChange={(e) => methods.setValue('isActive', e.target.value === 'true')}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </FormField>
          </div>
        </FormSection>

        <FormActions
          onCancel={onSuccess}
          submitText={createUserMutation.isPending ? 'Creating...' : 'Create User'}
          loading={createUserMutation.isPending}
        />
      </div>
    )}</Form>
  );
};
