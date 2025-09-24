'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
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
  WalletIcon,
  StarIcon,
} from '@heroicons/react/24/outline';

const CustomersPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterType, setFilterType] = useState('all');

  const queryClient = useQueryClient();

  // Fetch customers
  const { data: customersData, isLoading } = useQuery(
    ['customers', currentPage, pageSize, searchTerm, filterType],
    () => customersAPI.getCustomers({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      type: filterType === 'all' ? undefined : filterType,
    }),
    {
      keepPreviousData: true,
    }
  );

  // Delete customer mutation
  const deleteCustomerMutation = useMutation(
    (customerId: string) => customersAPI.deleteCustomer(customerId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customers']);
        toast.success('Customer deleted successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to delete customer');
      },
    }
  );

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

  const handleWalletTransaction = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsWalletModalOpen(true);
  };

  const getLoyaltyTier = (points: number) => {
    if (points >= 1000) return { tier: 'Gold', color: 'bg-yellow-100 text-yellow-800' };
    if (points >= 500) return { tier: 'Silver', color: 'bg-gray-100 text-gray-800' };
    return { tier: 'Bronze', color: 'bg-orange-100 text-orange-800' };
  };

  const columns = [
    {
      key: 'firstName',
      label: 'Customer',
      sortable: true,
      render: (value: string, row: Customer) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
            <span className="text-sm font-medium text-gray-700">
              {row.firstName.charAt(0)}{row.lastName.charAt(0)}
            </span>
          </div>
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
      key: 'customerCode',
      label: 'Customer Code',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-gray-900">{value}</span>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value: string) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
          {value}
        </span>
      ),
    },
    {
      key: 'wallet.balance',
      label: 'Wallet Balance',
      sortable: true,
      render: (value: number, row: Customer) => (
        <div className="text-sm text-gray-900">
          {formatCurrency(row.wallet.balance, row.wallet.currency)}
        </div>
      ),
    },
    {
      key: 'loyalty.points',
      label: 'Loyalty',
      sortable: true,
      render: (value: number, row: Customer) => {
        const loyalty = getLoyaltyTier(row.loyalty.points);
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">{row.loyalty.points} pts</div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${loyalty.color}`}>
              <StarIcon className="h-3 w-3 mr-1" />
              {loyalty.tier}
            </span>
          </div>
        );
      },
    },
    {
      key: 'totalPurchases',
      label: 'Total Spent',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm text-gray-900">{formatCurrency(value)}</span>
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
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: Customer) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewCustomer(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Customer"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleWalletTransaction(row)}
            className="text-green-600 hover:text-green-900"
            title="Wallet Transaction"
          >
            <WalletIcon className="h-4 w-4" />
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
  const createCustomerMutation = useMutation(
    (data: any) => customersAPI.createCustomer(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['customers']);
        setIsCreateModalOpen(false);
        toast.success('Customer created successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to create customer');
      },
    }
  );

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
            <p className="text-gray-600">Manage customer relationships and loyalty programs</p>
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
          data={customersData?.data?.data || []}
          loading={isLoading}
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
            onSubmit={async (values) => {
              const payload = { ...values } as any;
              if (!payload.phone) delete payload.phone;
              await createCustomerMutation.mutateAsync(payload);
            }}
            loading={createCustomerMutation.isLoading}
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
                submitText={createCustomerMutation.isLoading ? 'Creating...' : 'Create Customer'}
                loading={createCustomerMutation.isLoading}
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
          <div className="space-y-4">
            <p className="text-gray-600">Customer edit form will be implemented here.</p>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Balance</label>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(selectedCustomer.wallet.balance, selectedCustomer.wallet.currency)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loyalty Points</label>
                  <p className="text-sm text-gray-900">{selectedCustomer.loyalty.points} points</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Spent</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedCustomer.totalPurchases)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Member Since</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedCustomer.loyalty.joinDate)}</p>
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

        {/* Wallet Transaction Modal */}
        <Modal
          isOpen={isWalletModalOpen}
          onClose={() => setIsWalletModalOpen(false)}
          title="Wallet Transaction"
          size="md"
        >
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900">Current Balance</h3>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(selectedCustomer.wallet.balance, selectedCustomer.wallet.currency)}
                </p>
              </div>
              <p className="text-gray-600">Wallet transaction form will be implemented here.</p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsWalletModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button>
                  Process Transaction
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomersPage;
