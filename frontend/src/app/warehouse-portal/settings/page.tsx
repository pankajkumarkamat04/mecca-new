'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import toast from 'react-hot-toast';
import {
  CogIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface WarehouseSettings {
  name: string;
  code: string;
  description: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  contact: {
    phone: string;
    email: string;
  };
  capacity: {
    totalCapacity: number;
    maxWeight: number;
  };
  settings: {
    autoAllocateLocation: boolean;
    requireLocationScan: boolean;
    allowNegativeStock: boolean;
    lowStockThreshold: number;
    reorderPoint: number;
  };
  operatingHours: {
    monday: { open: string; close: string; isOpen: boolean };
    tuesday: { open: string; close: string; isOpen: boolean };
    wednesday: { open: string; close: string; isOpen: boolean };
    thursday: { open: string; close: string; isOpen: boolean };
    friday: { open: string; close: string; isOpen: boolean };
    saturday: { open: string; close: string; isOpen: boolean };
    sunday: { open: string; close: string; isOpen: boolean };
  };
}

const WarehouseSettings: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const [formData, setFormData] = useState<WarehouseSettings>({
    name: '',
    code: '',
    description: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: '',
    },
    contact: {
      phone: '',
      email: '',
    },
    capacity: {
      totalCapacity: 0,
      maxWeight: 0,
    },
    settings: {
      autoAllocateLocation: true,
      requireLocationScan: false,
      allowNegativeStock: false,
      lowStockThreshold: 10,
      reorderPoint: 5,
    },
    operatingHours: {
      monday: { open: '09:00', close: '17:00', isOpen: true },
      tuesday: { open: '09:00', close: '17:00', isOpen: true },
      wednesday: { open: '09:00', close: '17:00', isOpen: true },
      thursday: { open: '09:00', close: '17:00', isOpen: true },
      friday: { open: '09:00', close: '17:00', isOpen: true },
      saturday: { open: '09:00', close: '17:00', isOpen: false },
      sunday: { open: '09:00', close: '17:00', isOpen: false },
    },
  });

  const queryClient = useQueryClient();

  // Fetch warehouse details
  const { data: warehouseData, isLoading } = useQuery({
    queryKey: ['warehouse-details', warehouseId],
    queryFn: () => warehouseAPI.getWarehouseById(warehouseId!),
    enabled: !!warehouseId,
  });

  useEffect(() => {
    if (warehouseData?.data) {
      const warehouse = warehouseData.data;
      setFormData({
        name: warehouse.name || '',
        code: warehouse.code || '',
        description: warehouse.description || '',
        address: warehouse.address || {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: '',
        },
        contact: warehouse.contact || {
          phone: '',
          email: '',
        },
        capacity: warehouse.capacity || {
          totalCapacity: 0,
          maxWeight: 0,
        },
        settings: warehouse.settings || {
          autoAllocateLocation: true,
          requireLocationScan: false,
          allowNegativeStock: false,
          lowStockThreshold: 10,
          reorderPoint: 5,
        },
        operatingHours: warehouse.operatingHours || {
          monday: { open: '09:00', close: '17:00', isOpen: true },
          tuesday: { open: '09:00', close: '17:00', isOpen: true },
          wednesday: { open: '09:00', close: '17:00', isOpen: true },
          thursday: { open: '09:00', close: '17:00', isOpen: true },
          friday: { open: '09:00', close: '17:00', isOpen: true },
          saturday: { open: '09:00', close: '17:00', isOpen: false },
          sunday: { open: '09:00', close: '17:00', isOpen: false },
        },
      });
    }
  }, [warehouseData]);

  // Update warehouse mutation
  const updateWarehouseMutation = useMutation({
    mutationFn: (data: Partial<WarehouseSettings>) =>
      warehouseAPI.updateWarehouse(warehouseId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-details', warehouseId] });
      toast.success('Warehouse settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update warehouse settings');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWarehouseMutation.mutate(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNestedInputChange = (parent: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...(prev[parent as keyof WarehouseSettings] as object || {}),
        [field]: value
      }
    }));
  };

  const days = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' },
  ];

  if (isLoading) {
    return (
      <WarehousePortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </WarehousePortalLayout>
    );
  }

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Warehouse Settings</h1>
          <p className="text-sm text-gray-600 sm:text-base">Configure warehouse settings and preferences</p>
        </div>

        <div className="space-y-8">
          {/* Basic Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Warehouse Code *
                </label>
                <Input
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Address Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Street Address
                </label>
                <Input
                  value={formData.address.street}
                  onChange={(e) => handleNestedInputChange('address', 'street', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  City
                </label>
                <Input
                  value={formData.address.city}
                  onChange={(e) => handleNestedInputChange('address', 'city', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  State
                </label>
                <Input
                  value={formData.address.state}
                  onChange={(e) => handleNestedInputChange('address', 'state', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Zip Code
                </label>
                <Input
                  value={formData.address.zipCode}
                  onChange={(e) => handleNestedInputChange('address', 'zipCode', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Country
                </label>
                <Input
                  value={formData.address.country}
                  onChange={(e) => handleNestedInputChange('address', 'country', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Contact Information</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <Input
                  value={formData.contact.phone}
                  onChange={(e) => handleNestedInputChange('contact', 'phone', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <Input
                  type="email"
                  value={formData.contact.email}
                  onChange={(e) => handleNestedInputChange('contact', 'email', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Capacity Settings */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Capacity Settings</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Total Capacity
                </label>
                <Input
                  type="number"
                  value={formData.capacity.totalCapacity}
                  onChange={(e) => handleNestedInputChange('capacity', 'totalCapacity', Number(e.target.value))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Weight (kg)
                </label>
                <Input
                  type="number"
                  value={formData.capacity.maxWeight}
                  onChange={(e) => handleNestedInputChange('capacity', 'maxWeight', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Warehouse Settings */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Warehouse Settings</h3>
            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="autoAllocateLocation"
                  checked={formData.settings.autoAllocateLocation}
                  onChange={(e) => handleNestedInputChange('settings', 'autoAllocateLocation', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="autoAllocateLocation" className="text-sm text-gray-700">
                  Auto allocate location for new products
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="requireLocationScan"
                  checked={formData.settings.requireLocationScan}
                  onChange={(e) => handleNestedInputChange('settings', 'requireLocationScan', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="requireLocationScan" className="text-sm text-gray-700">
                  Require location scan for inventory operations
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowNegativeStock"
                  checked={formData.settings.allowNegativeStock}
                  onChange={(e) => handleNestedInputChange('settings', 'allowNegativeStock', e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="allowNegativeStock" className="text-sm text-gray-700">
                  Allow negative stock levels
                </label>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <Input
                    type="number"
                    value={formData.settings.lowStockThreshold}
                    onChange={(e) => handleNestedInputChange('settings', 'lowStockThreshold', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reorder Point
                  </label>
                  <Input
                    type="number"
                    value={formData.settings.reorderPoint}
                    onChange={(e) => handleNestedInputChange('settings', 'reorderPoint', Number(e.target.value))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Operating Hours */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-4 text-lg font-medium text-gray-900">Operating Hours</h3>
            <div className="space-y-4">
              {days.map((day) => (
                <div key={day.key} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="w-32">
                    <label className="text-sm font-medium text-gray-700">{day.label}</label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.operatingHours[day.key as keyof typeof formData.operatingHours].isOpen}
                      onChange={(e) => {
                        const newHours = { ...formData.operatingHours };
                        newHours[day.key as keyof typeof newHours] = {
                          ...newHours[day.key as keyof typeof newHours],
                          isOpen: e.target.checked
                        };
                        handleInputChange('operatingHours', newHours);
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Open</span>
                  </div>
                  {formData.operatingHours[day.key as keyof typeof formData.operatingHours].isOpen && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <Input
                        type="time"
                        value={formData.operatingHours[day.key as keyof typeof formData.operatingHours].open}
                        onChange={(e) => {
                          const newHours = { ...formData.operatingHours };
                          newHours[day.key as keyof typeof newHours] = {
                            ...newHours[day.key as keyof typeof newHours],
                            open: e.target.value
                          };
                          handleInputChange('operatingHours', newHours);
                        }}
                        className="w-full sm:w-32"
                      />
                      <span className="text-sm text-gray-500">to</span>
                      <Input
                        type="time"
                        value={formData.operatingHours[day.key as keyof typeof formData.operatingHours].close}
                        onChange={(e) => {
                          const newHours = { ...formData.operatingHours };
                          newHours[day.key as keyof typeof newHours] = {
                            ...newHours[day.key as keyof typeof newHours],
                            close: e.target.value
                          };
                          handleInputChange('operatingHours', newHours);
                        }}
                        className="w-full sm:w-32"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col items-stretch pt-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={updateWarehouseMutation.isPending}
              className="w-full sm:w-auto"
            >
              {updateWarehouseMutation.isPending ? 'Updating...' : 'Update Settings'}
            </Button>
          </div>
        </div>
      </div>
    </WarehousePortalLayout>
  );
};

export default WarehouseSettings;
