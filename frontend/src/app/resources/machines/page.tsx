'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Machine } from '@/types';
import { machinesAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WrenchScrewdriverIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const MachinesPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [available, setAvailable] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch machines
  const { data: machinesData, isLoading } = useQuery({
    queryKey: ['machines', currentPage, pageSize, search, category, status, available],
    queryFn: () => machinesAPI.getMachines({
      page: currentPage,
      limit: pageSize,
      search,
      category,
      status,
      available
    }),
  });

  // Fetch machine stats
  const { data: statsData } = useQuery({
    queryKey: ['machine-stats'],
    queryFn: () => machinesAPI.getMachineStats(),
  });

  const machines = machinesData?.data?.data?.machines || [];
  const pagination = machinesData?.data?.data?.pagination || {};
  const stats = statsData?.data?.data || {};

  // Create machine mutation
  const createMachineMutation = useMutation({
    mutationFn: (data: any) => machinesAPI.createMachine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machine-stats'] });
      setIsCreateOpen(false);
      toast.success('Machine created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create machine');
    },
  });

  // Update machine mutation
  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => machinesAPI.updateMachine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machine-stats'] });
      setIsEditOpen(false);
      setSelectedMachine(null);
      toast.success('Machine updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update machine');
    },
  });

  // Delete machine mutation
  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => machinesAPI.deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      queryClient.invalidateQueries({ queryKey: ['machine-stats'] });
      toast.success('Machine deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete machine');
    },
  });

  // Book machine mutation
  const bookMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => machinesAPI.bookMachine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine booked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to book machine');
    },
  });

  // Release machine mutation
  const releaseMachineMutation = useMutation({
    mutationFn: (id: string) => machinesAPI.releaseMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine released successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to release machine');
    },
  });

  // Add maintenance record mutation
  const addMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => machinesAPI.addMaintenanceRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsMaintenanceOpen(false);
      setSelectedMachine(null);
      toast.success('Maintenance record added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add maintenance record');
    },
  });

  const handleCreateMachine = (data: any) => {
    createMachineMutation.mutate(data);
  };

  const handleUpdateMachine = (data: any) => {
    if (selectedMachine) {
      updateMachineMutation.mutate({ id: selectedMachine._id, data });
    }
  };

  const handleDeleteMachine = (machine: any) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      deleteMachineMutation.mutate(machine._id);
    }
  };

  const handleBookMachine = (machine: any) => {
    const until = prompt('Enter booking end date (YYYY-MM-DD):');
    if (until) {
      bookMachineMutation.mutate({
        id: machine._id,
        data: { jobId: 'temp-job-id', until }
      });
    }
  };

  const handleReleaseMachine = (machine: any) => {
    if (window.confirm('Are you sure you want to release this machine?')) {
      releaseMachineMutation.mutate(machine._id);
    }
  };

  const handleAddMaintenance = (data: any) => {
    if (selectedMachine) {
      addMaintenanceMutation.mutate({ id: selectedMachine._id, data });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'operational': return 'green';
      case 'maintenance': return 'orange';
      case 'broken': return 'red';
      case 'retired': return 'gray';
      default: return 'gray';
    }
  };

  const getAvailabilityColor = (isAvailable: boolean) => {
    return isAvailable ? 'green' : 'red';
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      className: 'font-medium text-gray-900'
    },
    {
      key: 'model',
      label: 'Model',
      className: 'text-gray-900'
    },
    {
      key: 'category',
      label: 'Category',
      render: (machine: any) => (
        <Badge color="blue">
          {machine.category.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (machine: any) => (
        <Badge color={getStatusColor(machine.status)}>
          {machine.status.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'availability',
      label: 'Availability',
      render: (machine: any) => (
        <Badge color={getAvailabilityColor(machine.availability.isAvailable)}>
          {machine.availability.isAvailable ? 'Available' : 'Booked'}
        </Badge>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (machine: any) => (
        <span className="text-sm text-gray-900">
          {machine.location?.building || 'N/A'}
        </span>
      )
    },
    {
      key: 'nextMaintenance',
      label: 'Next Maintenance',
      render: (machine: any) => {
        const nextMaintenance = machine.maintenance?.nextMaintenance;
        if (!nextMaintenance) return <span className="text-gray-500">Not scheduled</span>;
        
        const isOverdue = new Date(nextMaintenance) < new Date();
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
            {formatDate(nextMaintenance)}
            {isOverdue && <ExclamationTriangleIcon className="inline w-4 h-4 ml-1" />}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (machine: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMachine(machine);
              setIsEditOpen(true);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedMachine(machine);
              setIsMaintenanceOpen(true);
            }}
          >
            <WrenchScrewdriverIcon className="h-4 w-4" />
          </Button>
          {machine.availability.isAvailable ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBookMachine(machine)}
            >
              <CalendarIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReleaseMachine(machine)}
            >
              <ClockIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteMachine(machine)}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  if (!hasPermission('machines', 'read')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view machines.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Machine Management</h1>
            <p className="text-gray-600">Manage workshop machines and equipment</p>
          </div>
          {hasPermission('machines', 'create') && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Machine
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Machines</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Operational</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus?.operational || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Maintenance</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus?.maintenance || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue Maintenance</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueMaintenance || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search machines..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
          options={[
            { value: '', label: 'All Categories' },
            { value: 'diagnostic', label: 'Diagnostic' },
            { value: 'repair', label: 'Repair' },
            { value: 'lifting', label: 'Lifting' },
            { value: 'welding', label: 'Welding' },
            { value: 'machining', label: 'Machining' },
            { value: 'testing', label: 'Testing' },
            { value: 'other', label: 'Other' }
          ]}
        />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: '', label: 'All Status' },
            { value: 'operational', label: 'Operational' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'broken', label: 'Broken' },
            { value: 'retired', label: 'Retired' }
          ]}
        />
            <Select
              value={available}
              onChange={(e) => setAvailable(e.target.value)}
          options={[
            { value: '', label: 'All Availability' },
            { value: 'true', label: 'Available' },
            { value: 'false', label: 'Booked' }
          ]}
        />
          </div>
        </div>

        {/* Machines Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={machines}
            columns={columns}
            loading={isLoading}
            pagination={{
              page: pagination.page || 1,
              limit: pagination.limit || 10,
              total: pagination.total || 0,
              pages: pagination.pages || 1
            }}
          />
        </div>
      </div>

      {/* Create Machine Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Machine"
      >
        <CreateMachineForm
          onSubmit={handleCreateMachine}
          onCancel={() => setIsCreateOpen(false)}
          loading={createMachineMutation.isPending}
        />
      </Modal>

      {/* Edit Machine Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedMachine(null);
        }}
        title="Edit Machine"
      >
        {selectedMachine && (
          <EditMachineForm
            machine={selectedMachine}
            onSubmit={handleUpdateMachine}
            onCancel={() => {
              setIsEditOpen(false);
              setSelectedMachine(null);
            }}
            loading={updateMachineMutation.isPending}
          />
        )}
      </Modal>

      {/* Maintenance Modal */}
      <Modal
        isOpen={isMaintenanceOpen}
        onClose={() => {
          setIsMaintenanceOpen(false);
          setSelectedMachine(null);
        }}
        title="Add Maintenance Record"
      >
        {selectedMachine && (
          <MaintenanceForm
            machine={selectedMachine}
            onSubmit={handleAddMaintenance}
            onCancel={() => {
              setIsMaintenanceOpen(false);
              setSelectedMachine(null);
            }}
            loading={addMaintenanceMutation.isPending}
          />
        )}
      </Modal>
    </Layout>
  );
};

// Create Machine Form Component
const CreateMachineForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    manufacturer: '',
    serialNumber: '',
    category: 'diagnostic',
    location: {
      building: '',
      floor: '',
      room: '',
      bay: ''
    },
    specifications: {
      powerRating: '',
      dimensions: '',
      weight: '',
      capacity: '',
      operatingPressure: '',
      operatingTemperature: ''
    },
    purchaseInfo: {
      purchaseDate: '',
      purchasePrice: '',
      supplier: '',
      warrantyExpiry: ''
    },
    operatingInstructions: '',
    safetyRequirements: '',
    requiredCertifications: []
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object || {}),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Machine Name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
        <Input
          label="Model"
          value={formData.model}
          onChange={(e) => handleInputChange('model', e.target.value)}
        />
        <Input
          label="Manufacturer"
          value={formData.manufacturer}
          onChange={(e) => handleInputChange('manufacturer', e.target.value)}
        />
        <Input
          label="Serial Number"
          value={formData.serialNumber}
          onChange={(e) => handleInputChange('serialNumber', e.target.value)}
        />
        <Select
          label="Category"
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          required
          options={[
            { value: 'diagnostic', label: 'Diagnostic' },
            { value: 'repair', label: 'Repair' },
            { value: 'lifting', label: 'Lifting' },
            { value: 'welding', label: 'Welding' },
            { value: 'machining', label: 'Machining' },
            { value: 'testing', label: 'Testing' },
            { value: 'other', label: 'Other' }
          ]}
        />
        <Input
          label="Building"
          value={formData.location.building}
          onChange={(e) => handleInputChange('location.building', e.target.value)}
        />
        <Input
          label="Floor"
          value={formData.location.floor}
          onChange={(e) => handleInputChange('location.floor', e.target.value)}
        />
        <Input
          label="Room"
          value={formData.location.room}
          onChange={(e) => handleInputChange('location.room', e.target.value)}
        />
        <Input
          label="Bay"
          value={formData.location.bay}
          onChange={(e) => handleInputChange('location.bay', e.target.value)}
        />
      </div>

      {/* Specifications Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Power Rating"
            value={formData.specifications.powerRating}
            onChange={(e) => handleInputChange('specifications.powerRating', e.target.value)}
          />
          <Input
            label="Dimensions"
            value={formData.specifications.dimensions}
            onChange={(e) => handleInputChange('specifications.dimensions', e.target.value)}
          />
          <Input
            label="Weight (kg)"
            type="number"
            value={formData.specifications.weight}
            onChange={(e) => handleInputChange('specifications.weight', e.target.value)}
          />
          <Input
            label="Capacity"
            value={formData.specifications.capacity}
            onChange={(e) => handleInputChange('specifications.capacity', e.target.value)}
            required
          />
          <Input
            label="Operating Pressure"
            value={formData.specifications.operatingPressure}
            onChange={(e) => handleInputChange('specifications.operatingPressure', e.target.value)}
          />
          <Input
            label="Operating Temperature"
            value={formData.specifications.operatingTemperature}
            onChange={(e) => handleInputChange('specifications.operatingTemperature', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Create Machine
        </Button>
      </div>
    </form>
  );
};

// Edit Machine Form Component
const EditMachineForm: React.FC<{
  machine: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ machine, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: machine.name || '',
    model: machine.model || '',
    manufacturer: machine.manufacturer || '',
    serialNumber: machine.serialNumber || '',
    category: machine.category || 'diagnostic',
    status: machine.status || 'operational',
    location: {
      building: machine.location?.building || '',
      floor: machine.location?.floor || '',
      room: machine.location?.room || '',
      bay: machine.location?.bay || ''
    },
    specifications: {
      powerRating: machine.specifications?.powerRating || '',
      dimensions: machine.specifications?.dimensions || '',
      weight: machine.specifications?.weight || '',
      capacity: machine.specifications?.capacity || '',
      operatingPressure: machine.specifications?.operatingPressure || '',
      operatingTemperature: machine.specifications?.operatingTemperature || ''
    },
    operatingInstructions: machine.operatingInstructions || '',
    safetyRequirements: machine.safetyRequirements || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object || {}),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Machine Name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          required
        />
        <Input
          label="Model"
          value={formData.model}
          onChange={(e) => handleInputChange('model', e.target.value)}
        />
        <Input
          label="Manufacturer"
          value={formData.manufacturer}
          onChange={(e) => handleInputChange('manufacturer', e.target.value)}
        />
        <Input
          label="Serial Number"
          value={formData.serialNumber}
          onChange={(e) => handleInputChange('serialNumber', e.target.value)}
        />
        <Select
          label="Category"
          value={formData.category}
          onChange={(e) => handleInputChange('category', e.target.value)}
          required
          options={[
            { value: 'diagnostic', label: 'Diagnostic' },
            { value: 'repair', label: 'Repair' },
            { value: 'lifting', label: 'Lifting' },
            { value: 'welding', label: 'Welding' },
            { value: 'machining', label: 'Machining' },
            { value: 'testing', label: 'Testing' },
            { value: 'other', label: 'Other' }
          ]}
        />
        <Select
          label="Status"
          value={formData.status}
          onChange={(e) => handleInputChange('status', e.target.value)}
          options={[
            { value: 'operational', label: 'Operational' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'broken', label: 'Broken' },
            { value: 'retired', label: 'Retired' }
          ]}
        />
        <Input
          label="Building"
          value={formData.location.building}
          onChange={(e) => handleInputChange('location.building', e.target.value)}
        />
        <Input
          label="Floor"
          value={formData.location.floor}
          onChange={(e) => handleInputChange('location.floor', e.target.value)}
        />
        <Input
          label="Room"
          value={formData.location.room}
          onChange={(e) => handleInputChange('location.room', e.target.value)}
        />
        <Input
          label="Bay"
          value={formData.location.bay}
          onChange={(e) => handleInputChange('location.bay', e.target.value)}
        />
      </div>

      {/* Specifications Section */}
      <div className="border-t pt-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Power Rating"
            value={formData.specifications.powerRating}
            onChange={(e) => handleInputChange('specifications.powerRating', e.target.value)}
          />
          <Input
            label="Dimensions"
            value={formData.specifications.dimensions}
            onChange={(e) => handleInputChange('specifications.dimensions', e.target.value)}
          />
          <Input
            label="Weight (kg)"
            type="number"
            value={formData.specifications.weight}
            onChange={(e) => handleInputChange('specifications.weight', e.target.value)}
          />
          <Input
            label="Capacity"
            value={formData.specifications.capacity}
            onChange={(e) => handleInputChange('specifications.capacity', e.target.value)}
            required
          />
          <Input
            label="Operating Pressure"
            value={formData.specifications.operatingPressure}
            onChange={(e) => handleInputChange('specifications.operatingPressure', e.target.value)}
          />
          <Input
            label="Operating Temperature"
            value={formData.specifications.operatingTemperature}
            onChange={(e) => handleInputChange('specifications.operatingTemperature', e.target.value)}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Update Machine
        </Button>
      </div>
    </form>
  );
};

// Maintenance Form Component
const MaintenanceForm: React.FC<{
  machine: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ machine, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    type: 'preventive',
    description: '',
    cost: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Select
          label="Maintenance Type"
          value={formData.type}
          onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          required
          options={[
            { value: 'preventive', label: 'Preventive' },
            { value: 'corrective', label: 'Corrective' },
            { value: 'emergency', label: 'Emergency' }
          ]}
        />
        <Input
          label="Description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
        />
        <Input
          label="Cost"
          type="number"
          value={formData.cost}
          onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
        />
        <Input
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Add Maintenance Record
        </Button>
      </div>
    </form>
  );
};

export default MachinesPage;
