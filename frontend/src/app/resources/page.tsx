'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  WrenchScrewdriverIcon,
  UserGroupIcon,
  CogIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

// Tool Management Component
const ToolManagement: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    status: 'available',
    location: '',
    condition: 'good',
    purchaseDate: '',
    purchasePrice: 0,
    supplier: '',
    warrantyExpiry: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch tools
  const { data: toolsData, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.get('/tools'),
  });

  const tools = toolsData?.data?.data?.tools || [];

  // Create tool mutation
  const createToolMutation = useMutation({
    mutationFn: (data: any) => api.post('/tools', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Update tool mutation
  const updateToolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/tools/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsEditOpen(false);
      setSelectedTool(null);
      resetForm();
    },
  });

  // Delete tool mutation
  const deleteToolMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tools/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      status: 'available',
      location: '',
      condition: 'good',
      purchaseDate: '',
      purchasePrice: 0,
      supplier: '',
      warrantyExpiry: '',
      notes: ''
    });
  };

  const handleCreate = () => {
    createToolMutation.mutate(formData);
  };

  const handleEdit = (tool: any) => {
    setSelectedTool(tool);
    setFormData({
      name: tool.name || '',
      description: tool.description || '',
      category: tool.category || '',
      status: tool.status || 'available',
      location: tool.location || '',
      condition: tool.condition || 'good',
      purchaseDate: tool.purchaseDate ? new Date(tool.purchaseDate).toISOString().split('T')[0] : '',
      purchasePrice: tool.purchasePrice || 0,
      supplier: tool.supplier || '',
      warrantyExpiry: tool.warrantyExpiry ? new Date(tool.warrantyExpiry).toISOString().split('T')[0] : '',
      notes: tool.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedTool) {
      updateToolMutation.mutate({ id: selectedTool._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tool?')) {
      deleteToolMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Tool Name',
      render: (tool: any) => (
        <div>
          <div className="font-medium text-gray-900">{tool.name}</div>
          <div className="text-sm text-gray-500">{tool.category}</div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (tool: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          tool.status === 'available' ? 'bg-green-100 text-green-800' :
          tool.status === 'in_use' ? 'bg-blue-100 text-blue-800' :
          tool.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {tool.status.replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'condition',
      label: 'Condition',
      render: (tool: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          tool.condition === 'excellent' ? 'bg-green-100 text-green-800' :
          tool.condition === 'good' ? 'bg-blue-100 text-blue-800' :
          tool.condition === 'fair' ? 'bg-yellow-100 text-yellow-800' :
          'bg-red-100 text-red-800'
        }`}>
          {tool.condition.toUpperCase()}
        </span>
      )
    },
    {
      key: 'location',
      label: 'Location'
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (tool: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(tool)}
            className="text-blue-600 hover:text-blue-700"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(tool._id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tool Management</h2>
          <p className="text-gray-600">Manage workshop tools and equipment</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Tool
        </Button>
      </div>

      <DataTable
        data={tools}
        columns={columns}
        loading={isLoading}
      />

      {/* Create Tool Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
        }}
        title="Add New Tool"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tool Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              options={[
                { value: '', label: 'Select Category' },
                { value: 'hand_tools', label: 'Hand Tools' },
                { value: 'power_tools', label: 'Power Tools' },
                { value: 'diagnostic', label: 'Diagnostic Equipment' },
                { value: 'specialty', label: 'Specialty Tools' },
                { value: 'safety', label: 'Safety Equipment' }
              ]}
            />
          </div>
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'in_use', label: 'In Use' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'retired', label: 'Retired' }
              ]}
            />
            <Select
              label="Condition"
              value={formData.condition}
              onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
              options={[
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' }
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
            />
          </div>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createToolMutation.isPending}
            >
              Add Tool
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Tool Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTool(null);
          resetForm();
        }}
        title="Edit Tool"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Tool Name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
              options={[
                { value: '', label: 'Select Category' },
                { value: 'hand_tools', label: 'Hand Tools' },
                { value: 'power_tools', label: 'Power Tools' },
                { value: 'diagnostic', label: 'Diagnostic Equipment' },
                { value: 'specialty', label: 'Specialty Tools' },
                { value: 'safety', label: 'Safety Equipment' }
              ]}
            />
          </div>
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'available', label: 'Available' },
                { value: 'in_use', label: 'In Use' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'retired', label: 'Retired' }
              ]}
            />
            <Select
              label="Condition"
              value={formData.condition}
              onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
              options={[
                { value: 'excellent', label: 'Excellent' },
                { value: 'good', label: 'Good' },
                { value: 'fair', label: 'Fair' },
                { value: 'poor', label: 'Poor' }
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              step="0.01"
              value={formData.purchasePrice}
              onChange={(e) => setFormData(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpiry: e.target.value }))}
            />
          </div>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedTool(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              loading={updateToolMutation.isPending}
            >
              Update Tool
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Technician Management Component
const TechnicianManagement: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    experience: '',
    certifications: '',
    hourlyRate: 0,
    status: 'active',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch technicians
  const { data: techniciansData, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get('/technicians'),
  });

  const technicians = techniciansData?.data?.data?.technicians || [];

  // Create technician mutation
  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => api.post('/technicians', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsCreateOpen(false);
      resetForm();
    },
  });

  // Update technician mutation
  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/technicians/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsEditOpen(false);
      setSelectedTechnician(null);
      resetForm();
    },
  });

  // Delete technician mutation
  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
    },
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialization: '',
      experience: '',
      certifications: '',
      hourlyRate: 0,
      status: 'active',
      notes: ''
    });
  };

  const handleCreate = () => {
    createTechnicianMutation.mutate(formData);
  };

  const handleEdit = (technician: any) => {
    setSelectedTechnician(technician);
    setFormData({
      firstName: technician.firstName || '',
      lastName: technician.lastName || '',
      email: technician.email || '',
      phone: technician.phone || '',
      specialization: technician.specialization || '',
      experience: technician.experience || '',
      certifications: technician.certifications || '',
      hourlyRate: technician.hourlyRate || 0,
      status: technician.status || 'active',
      notes: technician.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedTechnician) {
      updateTechnicianMutation.mutate({ id: selectedTechnician._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this technician?')) {
      deleteTechnicianMutation.mutate(id);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (technician: any) => (
        <div>
          <div className="font-medium text-gray-900">{technician.firstName} {technician.lastName}</div>
          <div className="text-sm text-gray-500">{technician.email}</div>
        </div>
      )
    },
    {
      key: 'specialization',
      label: 'Specialization'
    },
    {
      key: 'experience',
      label: 'Experience'
    },
    {
      key: 'hourlyRate',
      label: 'Hourly Rate',
      render: (technician: any) => `$${technician.hourlyRate}/hr`
    },
    {
      key: 'status',
      label: 'Status',
      render: (technician: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          technician.status === 'active' ? 'bg-green-100 text-green-800' :
          technician.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {technician.status.toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (technician: any) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(technician)}
            className="text-blue-600 hover:text-blue-700"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(technician._id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Technician Management</h2>
          <p className="text-gray-600">Manage workshop technicians and specialists</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Technician
        </Button>
      </div>

      <DataTable
        data={technicians}
        columns={columns}
        loading={isLoading}
      />

      {/* Create Technician Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
        }}
        title="Add New Technician"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Specialization"
              value={formData.specialization}
              onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
            />
            <Input
              label="Experience"
              value={formData.experience}
              onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Hourly Rate"
              type="number"
              step="0.01"
              value={formData.hourlyRate}
              onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'on_leave', label: 'On Leave' }
              ]}
            />
          </div>
          <TextArea
            label="Certifications"
            value={formData.certifications}
            onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
            rows={2}
            placeholder="List certifications and qualifications..."
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createTechnicianMutation.isPending}
            >
              Add Technician
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Technician Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTechnician(null);
          resetForm();
        }}
        title="Edit Technician"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
              required
            />
            <Input
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
            <Input
              label="Phone"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Specialization"
              value={formData.specialization}
              onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
            />
            <Input
              label="Experience"
              value={formData.experience}
              onChange={(e) => setFormData(prev => ({ ...prev, experience: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Hourly Rate"
              type="number"
              step="0.01"
              value={formData.hourlyRate}
              onChange={(e) => setFormData(prev => ({ ...prev, hourlyRate: parseFloat(e.target.value) || 0 }))}
            />
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'on_leave', label: 'On Leave' }
              ]}
            />
          </div>
          <TextArea
            label="Certifications"
            value={formData.certifications}
            onChange={(e) => setFormData(prev => ({ ...prev, certifications: e.target.value }))}
            rows={2}
            placeholder="List certifications and qualifications..."
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedTechnician(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              loading={updateTechnicianMutation.isPending}
            >
              Update Technician
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Main Resource Management Page
const ResourceManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tools' | 'technicians'>('tools');

  const tabs = [
    {
      id: 'tools',
      name: 'Tools',
      icon: WrenchScrewdriverIcon,
      component: ToolManagement
    },
    {
      id: 'technicians',
      name: 'Technicians',
      icon: UserGroupIcon,
      component: TechnicianManagement
    }
  ];

  const ActiveComponent = tabs.find(tab => tab.id === activeTab)?.component || ToolManagement;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
            <p className="text-gray-600">Manage workshop tools, technicians, and equipment</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'tools' | 'technicians')}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Active Tab Content */}
        <ActiveComponent />
      </div>
    </Layout>
  );
};

export default ResourceManagementPage;