'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { suppliersAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Supplier } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import TextArea from '@/components/ui/TextArea';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  TruckIcon,
  StarIcon,
  CalendarIcon,
} from '@heroicons/react/24/outline';

const SuppliersPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');

  const queryClient = useQueryClient();
  
  // Permission checks
  const canCreate = hasPermission('suppliers', 'create');
  const canUpdate = hasPermission('suppliers', 'update');
  const canDelete = hasPermission('suppliers', 'delete');

  // Fetch suppliers
  const { data: suppliersData, isPending } = useQuery({
    queryKey: ['suppliers', currentPage, pageSize, searchTerm, filterStatus],
    queryFn: () => suppliersAPI.getSuppliers({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      isActive: filterStatus === 'all' ? undefined : filterStatus === 'active',
    })
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: (supplierId: string) => suppliersAPI.deleteSupplier(supplierId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('Supplier deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete supplier');
    }
  });

  // Update supplier mutation
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => suppliersAPI.updateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsEditModalOpen(false);
      setSelectedSupplier(null);
      toast.success('Supplier updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update supplier');
    }
  });

  const handleDeleteSupplier = (supplier: Supplier) => {
    if (window.confirm(`Are you sure you want to delete ${supplier.name}?`)) {
      deleteSupplierMutation.mutate(supplier._id);
    }
  };

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsViewModalOpen(true);
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsEditModalOpen(true);
  };

  const getRatingStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${
          i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
        }`}
      />
    ));
  };

  const columns = [
    {
      key: 'name',
      label: 'Supplier',
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center">
          <div className="h-10 w-10 bg-gray-300 rounded-full mr-3 flex items-center justify-center">
            <TruckIcon className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <div className="text-sm font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">{row.contactPerson?.email || '-'}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'code',
      label: 'Code',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm font-mono text-gray-900">{row.code || row.supplierCode}</span>
      ),
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      sortable: true,
      render: (row: any) => {
        const cp = row.contactPerson || {};
        const name = [cp.firstName, cp.lastName].filter(Boolean).join(' ').trim();
        const details = cp.email || cp.phone || '';
        return (
          <div className="text-sm text-gray-900">
            {name || 'Not specified'}{details ? ` — ${details}` : ''}
          </div>
        );
      },
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (row: any) => (
        <div className="flex items-center">
          <div className="flex">{getRatingStars(row.rating)}</div>
          <span className="ml-2 text-sm text-gray-600">({row.rating}/5)</span>
        </div>
      ),
    },
    {
      key: 'totalPurchases',
      label: 'Total Purchases',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">{formatCurrency(row.totalPurchases?.amount ?? row.totalPurchases ?? 0)}</span>
      ),
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      sortable: true,
      render: (row: any) => (
        <span className="text-sm text-gray-900">{formatCurrency(row.creditLimit)}</span>
      ),
    },
    {
      key: 'lastPurchase',
      label: 'Last Purchase',
      sortable: true,
      render: (row: any) => (
        <div className="text-sm text-gray-900">
          {row.lastPurchase ? formatDate(row.lastPurchase) : 'Never'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => {
        const isActive = typeof row.isActive === 'boolean' ? row.isActive : row.status === 'active';
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isActive ? 'Active' : 'Inactive'}
          </span>
        );
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Supplier) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewSupplier(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Supplier"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {canUpdate && (
            <button
              onClick={() => handleEditSupplier(row)}
              className="text-gray-600 hover:text-gray-900"
              title="Edit Supplier"
            >
              <PencilIcon className="h-4 w-4" />
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => handleDeleteSupplier(row)}
              className="text-red-600 hover:text-red-900"
              title="Delete Supplier"
            >
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Create supplier mutation
  const createSupplierMutation = useMutation({
    mutationFn: (data: any) => suppliersAPI.createSupplier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      setIsCreateModalOpen(false);
      toast.success('Supplier created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create supplier');
    },
  });

  const supplierSchema = useMemo(() => z.object({
    name: z.string().min(2),
    businessInfo: z.object({
      companyName: z.string().min(2, 'Company name is required'),
      taxId: z.string().optional(),
      website: z.string().url().optional().or(z.literal('')),
    }),
    contactPerson: z.object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email().optional().or(z.literal('')),
      phone: z.string().optional().or(z.literal('')),
    }),
    address: z.object({
      street: z.string().min(1, 'Street address is required'),
      city: z.string().min(1, 'City is required'),
      state: z.string().min(1, 'State is required'),
      zipCode: z.string().min(1, 'ZIP code is required'),
      country: z.string().min(1, 'Country is required'),
    }),
    paymentTerms: z.coerce.number().min(0, 'Payment terms must be a non-negative number'),
    creditLimit: z.coerce.number().min(0),
    currency: z.string().length(3).optional(),
    status: z.enum(['active', 'inactive', 'suspended']).optional(),
    rating: z.number().min(1).max(5).optional(),
    notes: z.string().optional(),
    isActive: z.boolean().default(true),
  }), []);

  return (
    <ConditionalLayout title="Suppliers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-600">Manage supplier relationships and purchase orders</p>
          </div>
          {canCreate && (
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<TruckIcon className="h-4 w-4" />}
            >
              Add Supplier
            </Button>
          )}
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search suppliers by name, email, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                fullWidth
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Top Suppliers
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Suppliers Table */}
        <DataTable
          columns={columns}
          data={Array.isArray(suppliersData?.data?.data) ? suppliersData.data.data : []}
          loading={isPending}
          pagination={suppliersData?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage="No suppliers found"
        />

        {/* Create Supplier Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add New Supplier"
          size="lg"
        >
          <Form
            schema={supplierSchema}
            defaultValues={{
              name: '',
              businessInfo: {
                companyName: '',
                taxId: '',
                website: '',
              },
              contactPerson: {
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
              },
              address: {
                street: '',
                city: '',
                state: '',
                zipCode: '',
                country: '',
              },
              paymentTerms: 30,
              creditLimit: 0,
              currency: 'USD',
              status: 'active',
              rating: 5,
              notes: '',
              isActive: true,
            }}
            loading={createSupplierMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Supplier Name" required error={methods.formState.errors.name?.message as string}>
                    <Input {...methods.register('name')} fullWidth />
                  </FormField>
                  <FormField label="Company Name" required error={methods.formState.errors.businessInfo?.companyName?.message as string}>
                    <Input {...methods.register('businessInfo.companyName')} fullWidth />
                  </FormField>
                  <FormField label="Tax ID" error={methods.formState.errors.businessInfo?.taxId?.message as string}>
                    <Input {...methods.register('businessInfo.taxId')} fullWidth />
                  </FormField>
                  <FormField label="Website" error={methods.formState.errors.businessInfo?.website?.message as string}>
                    <Input {...methods.register('businessInfo.website')} fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Contact Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="First Name" error={methods.formState.errors.contactPerson?.firstName?.message as string}>
                    <Input {...methods.register('contactPerson.firstName')} fullWidth />
                  </FormField>
                  <FormField label="Last Name" error={methods.formState.errors.contactPerson?.lastName?.message as string}>
                    <Input {...methods.register('contactPerson.lastName')} fullWidth />
                  </FormField>
                  <FormField label="Email" error={methods.formState.errors.contactPerson?.email?.message as string}>
                    <Input type="email" {...methods.register('contactPerson.email')} fullWidth />
                  </FormField>
                  <FormField label="Phone" error={methods.formState.errors.contactPerson?.phone?.message as string}>
                    <Input {...methods.register('contactPerson.phone')} fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Address">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Street Address" required error={methods.formState.errors.address?.street?.message as string}>
                    <Input {...methods.register('address.street')} fullWidth />
                  </FormField>
                  <FormField label="City" required error={methods.formState.errors.address?.city?.message as string}>
                    <Input {...methods.register('address.city')} fullWidth />
                  </FormField>
                  <FormField label="State" required error={methods.formState.errors.address?.state?.message as string}>
                    <Input {...methods.register('address.state')} fullWidth />
                  </FormField>
                  <FormField label="ZIP Code" required error={methods.formState.errors.address?.zipCode?.message as string}>
                    <Input {...methods.register('address.zipCode')} fullWidth />
                  </FormField>
                  <FormField label="Country" required error={methods.formState.errors.address?.country?.message as string}>
                    <Input {...methods.register('address.country')} fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Business Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Payment Terms (Days)" error={methods.formState.errors.paymentTerms?.message as string}>
                    <Input type="number" {...methods.register('paymentTerms')} fullWidth />
                  </FormField>
                  <FormField label="Credit Limit" error={methods.formState.errors.creditLimit?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('creditLimit')} fullWidth />
                  </FormField>
                  <FormField label="Currency" error={methods.formState.errors.currency?.message as string}>
                    <Input {...methods.register('currency')} fullWidth />
                  </FormField>
                  <FormField label="Status" error={methods.formState.errors.status?.message as string}>
                    <select {...methods.register('status')} className="input">
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </FormField>
                  <FormField label="Rating" error={methods.formState.errors.rating?.message as string}>
                    <Input type="number" min="1" max="5" {...methods.register('rating')} fullWidth />
                  </FormField>
                  <FormField label="Active" error={methods.formState.errors.isActive?.message as string}>
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
                <FormField label="Notes" error={methods.formState.errors.notes?.message as string}>
                  <TextArea {...methods.register('notes')} rows={3} />
                </FormField>
              </FormSection>

              <FormActions
                onCancel={() => setIsCreateModalOpen(false)}
                onSubmit={async () => {
                  const isValid = await methods.trigger();
                  if (isValid) {
                    const values = methods.getValues();
                    await createSupplierMutation.mutateAsync(values);
                  } else {
                    toast.error('Please fill in all required fields');
                  }
                }}
                submitText={createSupplierMutation.isPending ? 'Creating...' : 'Create Supplier'}
                loading={createSupplierMutation.isPending}
              />
            </div>
          )}</Form>
        </Modal>

        {/* Edit Supplier Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Supplier"
          size="lg"
        >
          {selectedSupplier && (
            <Form
              schema={supplierSchema}
              defaultValues={{
                name: (selectedSupplier as any).name || '',
                businessInfo: {
                  companyName: (selectedSupplier as any).businessInfo?.companyName || '',
                  taxId: (selectedSupplier as any).businessInfo?.taxId || '',
                  website: (selectedSupplier as any).businessInfo?.website || '',
                },
                contactPerson: {
                  firstName: (selectedSupplier as any).contactPerson?.firstName || '',
                  lastName: (selectedSupplier as any).contactPerson?.lastName || '',
                  email: (selectedSupplier as any).contactPerson?.email || '',
                  phone: (selectedSupplier as any).contactPerson?.phone || '',
                },
                address: {
                  street: (selectedSupplier as any).address?.street || '',
                  city: (selectedSupplier as any).address?.city || '',
                  state: (selectedSupplier as any).address?.state || '',
                  zipCode: (selectedSupplier as any).address?.zipCode || '',
                  country: (selectedSupplier as any).address?.country || '',
                },
                paymentTerms: (selectedSupplier as any).paymentTerms ?? 30,
                creditLimit: (selectedSupplier as any).creditLimit ?? 0,
                currency: (selectedSupplier as any).currency || 'USD',
                status: (selectedSupplier as any).status || 'active',
                rating: (selectedSupplier as any).rating || 5,
                notes: (selectedSupplier as any).notes || '',
                isActive: typeof (selectedSupplier as any).isActive === 'boolean' ? (selectedSupplier as any).isActive : (selectedSupplier as any).status === 'active',
              }}
              loading={updateSupplierMutation.isPending}
            >{(methods) => (
              <div className="space-y-6">
                <FormSection title="Basic Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Supplier Name" required error={methods.formState.errors.name?.message as string}>
                      <Input {...methods.register('name')} fullWidth />
                    </FormField>
                    <FormField label="Company Name" required error={methods.formState.errors.businessInfo?.companyName?.message as string}>
                      <Input {...methods.register('businessInfo.companyName')} fullWidth />
                    </FormField>
                    <FormField label="Tax ID" error={methods.formState.errors.businessInfo?.taxId?.message as string}>
                      <Input {...methods.register('businessInfo.taxId')} fullWidth />
                    </FormField>
                    <FormField label="Website" error={methods.formState.errors.businessInfo?.website?.message as string}>
                      <Input {...methods.register('businessInfo.website')} fullWidth />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Contact Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="First Name" error={methods.formState.errors.contactPerson?.firstName?.message as string}>
                      <Input {...methods.register('contactPerson.firstName')} fullWidth />
                    </FormField>
                    <FormField label="Last Name" error={methods.formState.errors.contactPerson?.lastName?.message as string}>
                      <Input {...methods.register('contactPerson.lastName')} fullWidth />
                    </FormField>
                    <FormField label="Email" error={methods.formState.errors.contactPerson?.email?.message as string}>
                      <Input type="email" {...methods.register('contactPerson.email')} fullWidth />
                    </FormField>
                    <FormField label="Phone" error={methods.formState.errors.contactPerson?.phone?.message as string}>
                      <Input {...methods.register('contactPerson.phone')} fullWidth />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Address">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Street Address" required error={methods.formState.errors.address?.street?.message as string}>
                      <Input {...methods.register('address.street')} fullWidth />
                    </FormField>
                    <FormField label="City" required error={methods.formState.errors.address?.city?.message as string}>
                      <Input {...methods.register('address.city')} fullWidth />
                    </FormField>
                    <FormField label="State" required error={methods.formState.errors.address?.state?.message as string}>
                      <Input {...methods.register('address.state')} fullWidth />
                    </FormField>
                    <FormField label="ZIP Code" required error={methods.formState.errors.address?.zipCode?.message as string}>
                      <Input {...methods.register('address.zipCode')} fullWidth />
                    </FormField>
                    <FormField label="Country" required error={methods.formState.errors.address?.country?.message as string}>
                      <Input {...methods.register('address.country')} fullWidth />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Business Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Payment Terms (Days)" required error={methods.formState.errors.paymentTerms?.message as string}>
                      <Input type="number" {...methods.register('paymentTerms')} fullWidth />
                    </FormField>
                    <FormField label="Credit Limit" error={methods.formState.errors.creditLimit?.message as string}>
                      <Input type="number" step="0.01" {...methods.register('creditLimit')} fullWidth />
                    </FormField>
                    <FormField label="Currency" error={methods.formState.errors.currency?.message as string}>
                      <Input {...methods.register('currency')} fullWidth />
                    </FormField>
                    <FormField label="Status" error={methods.formState.errors.status?.message as string}>
                      <select {...methods.register('status')} className="input">
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                      </select>
                    </FormField>
                    <FormField label="Rating" error={methods.formState.errors.rating?.message as string}>
                      <Input type="number" min="1" max="5" {...methods.register('rating')} fullWidth />
                    </FormField>
                    <FormField label="Active" error={methods.formState.errors.isActive?.message as string}>
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
                  <FormField label="Notes" error={methods.formState.errors.notes?.message as string}>
                    <TextArea {...methods.register('notes')} rows={3} />
                  </FormField>
                </FormSection>

                <FormActions
                  onCancel={() => setIsEditModalOpen(false)}
                  onSubmit={async () => {
                    const isValid = await methods.trigger();
                    if (isValid) {
                      const values = methods.getValues();
                      await updateSupplierMutation.mutateAsync({ id: (selectedSupplier as any)._id, data: values });
                    } else {
                      toast.error('Please fill in all required fields');
                    }
                  }}
                  submitText={updateSupplierMutation.isPending ? 'Saving...' : 'Save Changes'}
                  loading={updateSupplierMutation.isPending}
                />
              </div>
            )}</Form>
          )}
        </Modal>

        {/* View Supplier Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Supplier Details"
          size="lg"
        >
          {selectedSupplier && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <p className="text-sm text-gray-900">{selectedSupplier.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Code</label>
                  <p className="text-sm text-gray-900 font-mono">{selectedSupplier.supplierCode}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                  <p className="text-sm text-gray-900">
                    {selectedSupplier.contactPerson && typeof selectedSupplier.contactPerson === 'object'
                      ? `${(selectedSupplier.contactPerson as any).firstName || ''} ${(selectedSupplier.contactPerson as any).lastName || ''}`.trim() || 'Not specified'
                      : selectedSupplier.contactPerson || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-sm text-gray-900">{selectedSupplier.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-sm text-gray-900">{selectedSupplier.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rating</label>
                  <div className="flex items-center">
                    <div className="flex">{getRatingStars(selectedSupplier.rating)}</div>
                    <span className="ml-2 text-sm text-gray-600">({selectedSupplier.rating}/5)</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                  <p className="text-sm text-gray-900">{selectedSupplier.paymentTerms}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Credit Limit</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedSupplier.creditLimit)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Purchases</label>
                  <p className="text-sm text-gray-900">{formatCurrency(selectedSupplier.totalPurchases)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Purchase</label>
                  <p className="text-sm text-gray-900">
                    {selectedSupplier.lastPurchaseDate ? formatDate(selectedSupplier.lastPurchaseDate) : 'Never'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-sm text-gray-900">
                    {selectedSupplier.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                  <p className="text-sm text-gray-900">{formatDate(selectedSupplier.createdAt)}</p>
                </div>
              </div>

              {selectedSupplier.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <div className="text-sm text-gray-900">
                    {selectedSupplier.address.street && <p>{selectedSupplier.address.street}</p>}
                    {selectedSupplier.address.city && <p>{selectedSupplier.address.city}</p>}
                    {selectedSupplier.address.state && <p>{selectedSupplier.address.state}</p>}
                    {selectedSupplier.address.zipCode && <p>{selectedSupplier.address.zipCode}</p>}
                    {selectedSupplier.address.country && <p>{selectedSupplier.address.country}</p>}
                  </div>
                </div>
              )}

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
    </ConditionalLayout>
  );
};

export default SuppliersPage;
