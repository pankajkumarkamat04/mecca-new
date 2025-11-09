'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { salesOutletsAPI } from '@/lib/api';
import { SalesOutlet } from '@/types';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  BuildingStorefrontIcon,
  PencilIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const SalesOutletsPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<SalesOutlet | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    outletCode: '',
    name: '',
    type: 'retail',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    contact: {
      phone: '',
      email: '',
      manager: ''
    }
  });

  const queryClient = useQueryClient();

  // Fetch outlets
  const { data: outletsData, isLoading } = useQuery({
    queryKey: ['sales-outlets', currentPage, searchTerm],
    queryFn: () => salesOutletsAPI.getSalesOutlets({
      page: currentPage,
      limit: 10,
      search: searchTerm
    })
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => salesOutletsAPI.createSalesOutlet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-outlets'] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Sales outlet created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create outlet');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      salesOutletsAPI.updateSalesOutlet(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-outlets'] });
      setIsEditModalOpen(false);
      setSelectedOutlet(null);
      resetForm();
      toast.success('Sales outlet updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update outlet');
    }
  });

  // Delete mutation (hard delete)
  const deleteMutation = useMutation({
    mutationFn: (id: string) => salesOutletsAPI.deleteSalesOutlet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales-outlets'] });
      queryClient.invalidateQueries({ queryKey: ['sales-outlets-active'] });
      toast.success('Sales outlet deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete outlet');
    }
  });

  const resetForm = () => {
    setFormData({
      outletCode: '',
      name: '',
      type: 'retail',
      address: { street: '', city: '', state: '', zipCode: '', country: '' },
      contact: { phone: '', email: '', manager: '' }
    });
  };

  const handleEdit = (outlet: SalesOutlet) => {
    setSelectedOutlet(outlet);
    setFormData({
      outletCode: outlet.outletCode,
      name: outlet.name,
      type: outlet.type,
      address: {
        street: outlet.address?.street || '',
        city: outlet.address?.city || '',
        state: outlet.address?.state || '',
        zipCode: outlet.address?.zipCode || '',
        country: outlet.address?.country || ''
      },
      contact: {
        phone: outlet.contact?.phone || '',
        email: outlet.contact?.email || '',
        manager: outlet.contact?.manager || ''
      }
    });
    setIsEditModalOpen(true);
  };

  const handleSubmit = () => {
    if (selectedOutlet) {
      updateMutation.mutate({ id: selectedOutlet._id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const columns = [
    {
      key: 'outletCode',
      label: 'Code',
      render: (row: SalesOutlet) => (
        <div className="font-medium text-gray-900">{row.outletCode}</div>
      )
    },
    {
      key: 'name',
      label: 'Outlet Name',
      render: (row: SalesOutlet) => (
        <div>
          <div className="font-medium text-gray-900">{row.name}</div>
          <div className="text-sm text-gray-500">{row.type}</div>
        </div>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (row: SalesOutlet) => (
        <div className="text-sm text-gray-600">
          {row.address?.city || 'N/A'}, {row.address?.state || ''}
        </div>
      )
    },
    {
      key: 'stats',
      label: 'Sales Stats',
      render: (row: SalesOutlet) => (
        <div className="text-sm">
          <div className="text-gray-900">{row.stats?.totalTransactions || 0} transactions</div>
          <div className="text-gray-500">${(row.stats?.totalSales || 0).toFixed(2)} total</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: SalesOutlet) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          row.isActive 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: SalesOutlet) => (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(row)}
            leftIcon={<PencilIcon className="h-4 w-4" />}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm('Are you sure you want to delete this outlet?')) {
                deleteMutation.mutate(row._id);
              }
            }}
            leftIcon={<TrashIcon className="h-4 w-4" />}
          >
            Delete
          </Button>
        </div>
      )
    }
  ];

  return (
    <Layout title="Sales Outlets">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sales Outlets</h1>
            <p className="text-gray-600">Manage your retail locations and sales points</p>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setIsCreateModalOpen(true);
            }}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            Create Outlet
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <Input
            placeholder="Search outlets by name, code, or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
          />
        </div>

        <DataTable
          columns={columns}
          data={outletsData?.data?.data || []}
          loading={isLoading}
          pagination={outletsData?.data?.pagination}
          onPageChange={setCurrentPage}
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={isCreateModalOpen || isEditModalOpen}
          onClose={() => {
            setIsCreateModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedOutlet(null);
            resetForm();
          }}
          title={selectedOutlet ? 'Edit Sales Outlet' : 'Create Sales Outlet'}
          size="xl"
        >
          <div className="space-y-6">
            {/* Basic Info */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Outlet Code"
                  value={formData.outletCode}
                  onChange={(e) => setFormData({ ...formData, outletCode: e.target.value.toUpperCase() })}
                  placeholder="e.g., OUT001"
                  required
                  fullWidth
                />
                <Input
                  label="Outlet Name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Main Street Store"
                  required
                  fullWidth
                />
                <Select
                  label="Outlet Type"
                  options={[
                    { value: 'retail', label: 'Retail Store' },
                    { value: 'warehouse', label: 'Warehouse' },
                    { value: 'online', label: 'Online' },
                    { value: 'mobile', label: 'Mobile' },
                    { value: 'kiosk', label: 'Kiosk' },
                    { value: 'branch', label: 'Branch' },
                  ]}
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  fullWidth
                />
              </div>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Input
                    label="Street Address"
                    value={formData.address.street}
                    onChange={(e) => setFormData({
                      ...formData,
                      address: { ...formData.address, street: e.target.value }
                    })}
                    fullWidth
                  />
                </div>
                <Input
                  label="City"
                  value={formData.address.city}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, city: e.target.value }
                  })}
                  fullWidth
                />
                <Input
                  label="State/Province"
                  value={formData.address.state}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, state: e.target.value }
                  })}
                  fullWidth
                />
                <Input
                  label="ZIP/Postal Code"
                  value={formData.address.zipCode}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, zipCode: e.target.value }
                  })}
                  fullWidth
                />
                <Input
                  label="Country"
                  value={formData.address.country}
                  onChange={(e) => setFormData({
                    ...formData,
                    address: { ...formData.address, country: e.target.value }
                  })}
                  fullWidth
                />
              </div>
            </div>

            {/* Contact */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Phone"
                  value={formData.contact.phone}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact, phone: e.target.value }
                  })}
                  fullWidth
                />
                <Input
                  label="Email"
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact, email: e.target.value }
                  })}
                  fullWidth
                />
                <Input
                  label="Manager Name"
                  value={formData.contact.manager}
                  onChange={(e) => setFormData({
                    ...formData,
                    contact: { ...formData.contact, manager: e.target.value }
                  })}
                  fullWidth
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditModalOpen(false);
                  setSelectedOutlet(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                loading={createMutation.isPending || updateMutation.isPending}
              >
                {selectedOutlet ? 'Update Outlet' : 'Create Outlet'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default SalesOutletsPage;

