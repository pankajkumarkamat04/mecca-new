'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { customersAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Customer } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  UsersIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

const CustomersPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');

  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customersData, isPending } = useQuery({
    queryKey: ['customers', currentPage, pageSize, searchTerm, filterType],
    queryFn: () => customersAPI.getCustomers({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      type: filterType === 'all' ? undefined : filterType,
    })
  });


  // Delete customer mutation
  const deleteCustomerMutation = useMutation({
    mutationFn: (customerId: string) => customersAPI.deleteCustomer(customerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete customer');
    }
  });

  const handleDeleteCustomer = (customer: Customer) => {
    if (window.confirm(`Are you sure you want to delete ${customer.firstName} ${customer.lastName}?`)) {
      deleteCustomerMutation.mutate(customer._id);
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsViewModalOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsEditModalOpen(true);
  };



  const columns = [
    {
      key: 'firstName',
      label: 'Customer',
      sortable: true,
      render: (row: Customer) => (
          <div className="flex items-center">
            <div className="h-10 w-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">
                {row.firstName?.charAt(0) || ''}{row.lastName?.charAt(0) || ''}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {row.firstName || ''} {row.lastName || ''}
              </div>
              <div className="text-sm text-gray-500">{row.email || 'No email'}</div>
            </div>
          </div>
        ),
    },
    {
      key: 'customerCode',
      label: 'Customer Code',
      sortable: true,
      render: (row: Customer) => (
        <span className="text-sm font-mono text-gray-900">{row.customerCode}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (row: Customer) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {row.type}
        </span>
      ),
    },
    {
      key: 'totalPurchases',
      label: 'Total Spent',
      sortable: true,
      render: (row: Customer) => (
        <span className="text-sm text-gray-900">{formatCurrency(row.totalPurchases?.amount || 0)}</span>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (row: Customer) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Customer) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewCustomer(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Customer"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditCustomer(row)}
            className="text-gray-600 hover:text-gray-900"
            title="Edit Customer"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteCustomer(row)}
            className="text-red-600 hover:text-red-900"
            title="Delete Customer"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'individual', label: 'Individual' },
    { value: 'business', label: 'Business' },
  ];

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => customersAPI.createCustomer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      setIsCreateModalOpen(false);
      toast.success('Customer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create customer');
    }
  });

  const customerSchema = useMemo(() => z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().or(z.literal('')),
    type: z.enum(['individual', 'business']),
    isActive: z.boolean().default(true),
  }), []);

  return (
    <Layout title="Customers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-600">Manage customer relationships and accounts</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<UsersIcon className="h-4 w-4" />}
          >
            Add Customer
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search customers by name, email, or customer code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={typeOptions}
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                fullWidth
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Top Customers
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <DataTable
          columns={columns}
          data={Array.isArray(customersData?.data?.data) ? customersData.data.data : []}
          loading={isPending}
          pagination={customersData?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage="No customers found"
        />

        {/* Create Customer Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add New Customer"
          size="lg"
        >
          <Form
            schema={customerSchema}
            defaultValues={{ firstName: '', lastName: '', email: '', phone: '', type: 'individual', isActive: true }}
            loading={createCustomerMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Customer Details">
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
                  <FormField label="Type" required error={methods.formState.errors.type?.message as string}>
                    <Select
                      options={[{ value: 'individual', label: 'Individual' }, { value: 'business', label: 'Business' }]}
                      value={methods.watch('type')}
                      onChange={(e) => methods.setValue('type', e.target.value as 'individual' | 'business')}
                      fullWidth
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormActions
                onCancel={() => setIsCreateModalOpen(false)}
                onSubmit={async () => {
                  const isValid = await methods.trigger();
                  if (isValid) {
                    const values = methods.getValues();
                    const payload = { ...values } as any;
                    if (!payload.phone) delete payload.phone;
                    await createCustomerMutation.mutateAsync(payload);
                  } else {
                    toast.error('Please fill in all required fields');
                  }
                }}
                submitText={createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                loading={createCustomerMutation.isPending}
              />
            </div>
          )}</Form>
        </Modal>

        {/* Edit Customer Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Customer"
          size="lg"
        >
          <CustomerEditForm 
            customer={selectedCustomer}
            onSuccess={() => setIsEditModalOpen(false)}
          />
        </Modal>

        {/* View Customer Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Customer Details"
          size="lg"
        >
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-sm text-gray-900">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Code</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedCustomer.customerCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{selectedCustomer.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-sm text-gray-900">{selectedCustomer.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <p className="text-sm text-gray-900 capitalize">{selectedCustomer.type}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-sm text-gray-900">
                    {selectedCustomer.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Spent</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedCustomer.totalPurchases)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedCustomer.createdAt)}</p>
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

// Edit Customer Form Component
const CustomerEditForm: React.FC<{ 
  customer: Customer | null; 
  onSuccess: () => void; 
}> = ({ customer, onSuccess }) => {
  const queryClient = useQueryClient();

  const editCustomerSchema = useMemo(() => z.object({
    firstName: z.string().min(2, 'First name is required'),
    lastName: z.string().min(2, 'Last name is required'),
    email: z.string().email('Valid email is required'),
    phone: z.string().optional().or(z.literal('')),
    type: z.enum(['individual', 'business']).default('individual'),
    isActive: z.boolean().default(true),
  }), []);

  const updateCustomerMutation = useMutation({
    mutationFn: (data: any) => customersAPI.updateCustomer(customer!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Customer updated successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update customer');
    },
  });

  if (!customer) return null;

  return (
    <Form
      schema={editCustomerSchema}
      defaultValues={{ 
        firstName: customer.firstName || '', 
        lastName: customer.lastName || '', 
        email: customer.email || '', 
        phone: customer.phone || '', 
        type: customer.type || 'individual',
        isActive: customer.isActive ?? true
      }}
      loading={updateCustomerMutation.isPending}
    >{(methods) => (
      <div className="space-y-6">
        <FormSection title="Customer Details">
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
            <FormField label="Type" required error={methods.formState.errors.type?.message as string}>
              <Select
                options={[
                  { value: 'individual', label: 'Individual' }, 
                  { value: 'business', label: 'Business' }
                ]}
                value={methods.watch('type')}
                onChange={(e) => methods.setValue('type', e.target.value as 'individual' | 'business')}
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
          onSubmit={async () => {
            const isValid = await methods.trigger();
            if (isValid) {
              const values = methods.getValues();
              const payload = { ...values } as any;
              if (!payload.phone) delete payload.phone;
              await updateCustomerMutation.mutateAsync(payload);
            } else {
              toast.error('Please fill in all required fields');
            }
          }}
          submitText={updateCustomerMutation.isPending ? 'Updating...' : 'Update Customer'}
          loading={updateCustomerMutation.isPending}
        />
      </div>
    )}</Form>
  );
};


export default CustomersPage;
