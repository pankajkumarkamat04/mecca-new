'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { suppliersAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Supplier } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');

  const queryClient = useQueryClient();

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
      render: (value: string, row: any) => (
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
      render: (_: string, row: any) => (
        <span className="text-sm font-mono text-gray-900">{row.code || row.supplierCode}</span>
      ),
    },
    {
      key: 'contactPerson',
      label: 'Contact Person',
      sortable: true,
      render: (_: any, row: any) => {
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
      render: (value: number) => (
        <div className="flex items-center">
          <div className="flex">{getRatingStars(value)}</div>
          <span className="ml-2 text-sm text-gray-600">({value}/5)</span>
        </div>
      ),
    },
    {
      key: 'totalPurchases',
      label: 'Total Purchases',
      sortable: true,
      render: (_: any, row: any) => (
        <span className="text-sm text-gray-900">{formatCurrency(row.totalPurchases?.amount ?? row.totalPurchases ?? 0)}</span>
      ),
    },
    {
      key: 'creditLimit',
      label: 'Credit Limit',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm text-gray-900">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'lastPurchase',
      label: 'Last Purchase',
      sortable: true,
      render: (_: any, row: any) => (
        <div className="text-sm text-gray-900">
          {row.lastPurchase ? formatDate(row.lastPurchase) : 'Never'}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (_: any, row: any) => {
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
      render: (_: any, row: Supplier) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewSupplier(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Supplier"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditSupplier(row)}
            className="text-gray-600 hover:text-gray-900"
            title="Edit Supplier"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteSupplier(row)}
            className="text-red-600 hover:text-red-900"
            title="Delete Supplier"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
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
    contactPerson: z.string().optional().or(z.literal('')),
    email: z.string().email(),
    phone: z.string().optional().or(z.literal('')),
    supplierCode: z.string().min(1),
    paymentTerms: z.string().min(1),
    creditLimit: z.coerce.number().min(0),
    isActive: z.boolean().default(true),
  }), []);

  return (
    <Layout title="Suppliers">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
            <p className="text-gray-600">Manage supplier relationships and purchase orders</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<TruckIcon className="h-4 w-4" />}
          >
            Add Supplier
          </Button>
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
          data={suppliersData?.data?.data || []}
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
              name: '', contactPerson: '', email: '', phone: '', supplierCode: '', paymentTerms: 'Net 30', creditLimit: 0, isActive: true,
            }}
            onSubmit={async (values) => {
              const payload = { ...values } as any;
              if (!payload.contactPerson) delete payload.contactPerson;
              if (!payload.phone) delete payload.phone;
              await createSupplierMutation.mutateAsync(payload);
            }}
            loading={createSupplierMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Supplier Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Supplier Name" required error={methods.formState.errors.name?.message as string}>
                    <Input {...methods.register('name')} fullWidth />
                  </FormField>
                  <FormField label="Contact Person" error={methods.formState.errors.contactPerson?.message as string}>
                    <Input {...methods.register('contactPerson')} fullWidth />
                  </FormField>
                  <FormField label="Email" required error={methods.formState.errors.email?.message as string}>
                    <Input type="email" {...methods.register('email')} fullWidth />
                  </FormField>
                  <FormField label="Phone" error={methods.formState.errors.phone?.message as string}>
                    <Input {...methods.register('phone')} fullWidth />
                  </FormField>
                  <FormField label="Supplier Code" required error={methods.formState.errors.supplierCode?.message as string}>
                    <Input {...methods.register('supplierCode')} fullWidth />
                  </FormField>
                  <FormField label="Payment Terms" required error={methods.formState.errors.paymentTerms?.message as string}>
                    <Input {...methods.register('paymentTerms')} placeholder="e.g., Net 30" fullWidth />
                  </FormField>
                  <FormField label="Credit Limit" required error={methods.formState.errors.creditLimit?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('creditLimit')} fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormActions
                onCancel={() => setIsCreateModalOpen(false)}
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
                contactPerson: (selectedSupplier as any).contactPerson && typeof (selectedSupplier as any).contactPerson === 'object'
                  ? [
                      (selectedSupplier as any).contactPerson.firstName,
                      (selectedSupplier as any).contactPerson.lastName,
                    ].filter(Boolean).join(' ')
                  : (selectedSupplier as any).contactPerson || '',
                email: (selectedSupplier as any).contactPerson?.email || (selectedSupplier as any).email || '',
                phone: (selectedSupplier as any).contactPerson?.phone || (selectedSupplier as any).phone || '',
                supplierCode: (selectedSupplier as any).supplierCode || (selectedSupplier as any).code || '',
                paymentTerms: String((selectedSupplier as any).paymentTerms ?? ''),
                creditLimit: (selectedSupplier as any).creditLimit ?? 0,
                isActive: typeof (selectedSupplier as any).isActive === 'boolean' ? (selectedSupplier as any).isActive : (selectedSupplier as any).status === 'active',
              }}
              onSubmit={async (values) => {
                const [cpFirst, ...cpRest] = (values.contactPerson || '').trim().split(' ');
                const cpLast = cpRest.join(' ').trim();
                const payload: any = {
                  name: values.name,
                  creditLimit: values.creditLimit,
                  isActive: values.isActive,
                };
                // Map code
                if (values.supplierCode) {
                  payload.code = values.supplierCode;
                }
                // Map contact person structure if available
                if (values.contactPerson || values.email || values.phone) {
                  payload.contactPerson = {
                    ...(cpFirst ? { firstName: cpFirst } : {}),
                    ...(cpLast ? { lastName: cpLast } : {}),
                    ...(values.email ? { email: values.email } : {}),
                    ...(values.phone ? { phone: values.phone } : {}),
                  };
                }
                // Map payment terms (try number)
                if (values.paymentTerms !== undefined && values.paymentTerms !== null && String(values.paymentTerms).length > 0) {
                  const ptNum = Number(values.paymentTerms);
                  payload.paymentTerms = Number.isFinite(ptNum) ? ptNum : values.paymentTerms;
                }

                await updateSupplierMutation.mutateAsync({ id: (selectedSupplier as any)._id, data: payload });
              }}
              loading={updateSupplierMutation.isPending}
            >{(methods) => (
              <div className="space-y-6">
                <FormSection title="Supplier Details">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Supplier Name" required error={methods.formState.errors.name?.message as string}>
                      <Input {...methods.register('name')} fullWidth />
                    </FormField>
                    <FormField label="Contact Person" error={methods.formState.errors.contactPerson?.message as string}>
                      <Input {...methods.register('contactPerson')} placeholder="e.g., John Doe" fullWidth />
                    </FormField>
                    <FormField label="Email" required error={methods.formState.errors.email?.message as string}>
                      <Input type="email" {...methods.register('email')} fullWidth />
                    </FormField>
                    <FormField label="Phone" error={methods.formState.errors.phone?.message as string}>
                      <Input {...methods.register('phone')} fullWidth />
                    </FormField>
                    <FormField label="Supplier Code" required error={methods.formState.errors.supplierCode?.message as string}>
                      <Input {...methods.register('supplierCode')} fullWidth />
                    </FormField>
                    <FormField label="Payment Terms" required error={methods.formState.errors.paymentTerms?.message as string}>
                      <Input {...methods.register('paymentTerms')} placeholder="e.g., Net 30 or 30" fullWidth />
                    </FormField>
                    <FormField label="Credit Limit" required error={methods.formState.errors.creditLimit?.message as string}>
                      <Input type="number" step="0.01" {...methods.register('creditLimit')} fullWidth />
                    </FormField>
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
                  onCancel={() => setIsEditModalOpen(false)}
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
                  <p className="text-sm text-gray-900">{selectedSupplier.contactPerson || 'Not specified'}</p>
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
    </Layout>
  );
};

export default SuppliersPage;
