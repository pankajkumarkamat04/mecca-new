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
  ChartBarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

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
      toast.success('Tool created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create tool');
    }
  });

  // Update tool mutation
  const updateToolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/tools/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsEditOpen(false);
      setSelectedTool(null);
      resetForm();
      toast.success('Tool updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tool');
    }
  });

  // Delete tool mutation
  const deleteToolMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tools/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast.success('Tool deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete tool');
    }
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
          {(tool.status || 'unknown').replace('_', ' ').toUpperCase()}
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
          {(tool.condition || 'unknown').toUpperCase()}
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
                { value: 'hand_tool', label: 'Hand Tools' },
                { value: 'power_tool', label: 'Power Tools' },
                { value: 'diagnostic_tool', label: 'Diagnostic Equipment' },
                { value: 'specialty_tool', label: 'Specialty Tools' },
                { value: 'measuring_tool', label: 'Measuring Tools' },
                { value: 'cutting_tool', label: 'Cutting Tools' },
                { value: 'other', label: 'Other' }
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
                { value: 'hand_tool', label: 'Hand Tools' },
                { value: 'power_tool', label: 'Power Tools' },
                { value: 'diagnostic_tool', label: 'Diagnostic Equipment' },
                { value: 'specialty_tool', label: 'Specialty Tools' },
                { value: 'measuring_tool', label: 'Measuring Tools' },
                { value: 'cutting_tool', label: 'Cutting Tools' },
                { value: 'other', label: 'Other' }
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

// Old Technician Management Component (to be removed)
const OldTechnicianManagement: React.FC = () => {
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
      queryClient.invalidateQueries({ queryKey: ['technicians-management'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Technician created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create technician');
    }
  });

  // Update technician mutation
  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/technicians/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians-management'] });
      setIsEditOpen(false);
      setSelectedTechnician(null);
      resetForm();
      toast.success('Technician updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update technician');
    }
  });

  // Delete technician mutation
  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians-management'] });
      toast.success('Technician deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete technician');
    }
  });

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      specialization: '',
      experience: '',
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
      key: 'status',
      label: 'Status',
      render: (technician: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          technician.status === 'active' ? 'bg-green-100 text-green-800' :
          technician.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
          'bg-red-100 text-red-800'
        }`}>
          {(technician.status || 'unknown').toUpperCase()}
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

// Technician Management Component
const TechnicianManagement: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    name: '',
    user: '',
    department: 'workshop',
    position: 'technician',
    employmentStatus: 'active',
    hireDate: '',
    workStation: '',
    personalInfo: {
      dateOfBirth: '',
      address: {
        street: '',
        city: '',
        state: '',
        zipCode: '',
        country: ''
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        email: ''
      }
    },
    skills: [],
    certifications: [],
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch technicians
  const { data: techniciansData, isLoading } = useQuery({
    queryKey: ['technicians-management'],
    queryFn: () => api.get('/technicians'),
  });

  // Fetch users for technician creation
  const { data: usersData } = useQuery({
    queryKey: ['users-for-technician-management'],
    queryFn: () => api.get('/users'),
  });

  const technicians = techniciansData?.data?.data?.technicians || [];
  const users = usersData?.data?.data?.users || [];

  // Create technician mutation
  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => api.post('/technicians', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians-management'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Technician created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create technician');
    }
  });

  // Update technician mutation
  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/technicians/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians-management'] });
      setIsEditOpen(false);
      toast.success('Technician updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update technician');
    }
  });

  // Delete technician mutation
  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/technicians/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians-management'] });
      toast.success('Technician deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete technician');
    }
  });

  const handleCreate = () => {
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Technician name is required');
      return;
    }
    createTechnicianMutation.mutate(formData);
  };

  const resetForm = () => {
    setFormData({
      employeeId: '',
      name: '',
      user: '',
      department: 'workshop',
      position: 'technician',
      employmentStatus: 'active',
      hireDate: '',
      workStation: '',
      personalInfo: {
        dateOfBirth: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        emergencyContact: {
          name: '',
          relationship: '',
          phone: '',
          email: ''
        }
      },
      skills: [],
      certifications: [],
      notes: ''
    });
  };

  const handleUpdate = () => {
    if (selectedTechnician) {
      updateTechnicianMutation.mutate({ id: selectedTechnician._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this technician?')) {
      deleteTechnicianMutation.mutate(id);
    }
  };

  const handleEdit = (technician: any) => {
    setSelectedTechnician(technician);
    setFormData({
      employeeId: technician.employeeId || '',
      name: technician.name || '',
      user: technician.user?._id || '',
      department: technician.department || 'workshop',
      position: technician.position || 'technician',
      employmentStatus: technician.employmentStatus || 'active',
      hireDate: technician.hireDate || '',
      workStation: technician.workStation || '',
      personalInfo: {
        dateOfBirth: technician.personalInfo?.dateOfBirth || '',
        address: {
          street: technician.personalInfo?.address?.street || '',
          city: technician.personalInfo?.address?.city || '',
          state: technician.personalInfo?.address?.state || '',
          zipCode: technician.personalInfo?.address?.zipCode || '',
          country: technician.personalInfo?.address?.country || ''
        },
        emergencyContact: {
          name: technician.personalInfo?.emergencyContact?.name || '',
          relationship: technician.personalInfo?.emergencyContact?.relationship || '',
          phone: technician.personalInfo?.emergencyContact?.phone || '',
          email: technician.personalInfo?.emergencyContact?.email || ''
        }
      },
      skills: technician.skills || [],
      certifications: technician.certifications || [],
      notes: technician.notes || ''
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      key: 'user',
      label: 'Name',
      render: (technician: any) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
            <UserGroupIcon className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {technician.name || (technician.user ? `${technician.user.firstName} ${technician.user.lastName}` : 'No Name')}
            </p>
            <p className="text-sm text-gray-500">
              {technician.user?.email || technician.employeeId || 'N/A'}
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'employeeId',
      label: 'Employee ID',
      render: (technician: any) => (
        <span className="text-sm text-gray-900">
          {technician.employeeId || 'Not Assigned'}
        </span>
      )
    },
    {
      key: 'department',
      label: 'Department'
    },
    {
      key: 'position',
      label: 'Position'
    },
    {
      key: 'employmentStatus',
      label: 'Status',
      render: (technician: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          technician.employmentStatus === 'active' ? 'bg-green-100 text-green-800' :
          technician.employmentStatus === 'on_leave' ? 'bg-yellow-100 text-yellow-800' :
          technician.employmentStatus === 'inactive' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {(technician.employmentStatus || 'unknown').toUpperCase()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (technician: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(technician)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(technician._id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Technician Management</h2>
          <p className="text-gray-600">Manage workshop technicians and staff</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Technician
        </Button>
      </div>

      {/* Technicians Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={technicians}
          columns={columns}
          loading={isLoading}
        />
      </div>

      {/* Create Technician Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Technician"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="Employee ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Technician Name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User (Optional)</label>
                <Select
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  options={[
                    { value: '', label: 'Select User (Optional)' },
                    ...users.map((user: any) => ({
                      value: user._id,
                      label: `${user.firstName} ${user.lastName}`
                    }))
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <Select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  options={[
                    { value: 'workshop', label: 'Workshop' },
                    { value: 'diagnostics', label: 'Diagnostics' },
                    { value: 'body_shop', label: 'Body Shop' },
                    { value: 'paint_shop', label: 'Paint Shop' },
                    { value: 'assembly', label: 'Assembly' },
                    { value: 'quality_control', label: 'Quality Control' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <Select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  options={[
                    { value: 'junior_technician', label: 'Junior Technician' },
                    { value: 'technician', label: 'Technician' },
                    { value: 'senior_technician', label: 'Senior Technician' },
                    { value: 'lead_technician', label: 'Lead Technician' },
                    { value: 'specialist', label: 'Specialist' },
                    { value: 'supervisor', label: 'Supervisor' }
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                <Select
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'on_leave', label: 'On Leave' },
                    { value: 'terminated', label: 'Terminated' },
                    { value: 'retired', label: 'Retired' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                <Input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <Input
                type="date"
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  personalInfo: { ...formData.personalInfo, dateOfBirth: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <Input
                  value={formData.personalInfo.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, street: e.target.value }
                    }
                  })}
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  value={formData.personalInfo.address.city}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, city: e.target.value }
                    }
                  })}
                  placeholder="City"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <Input
                  value={formData.personalInfo.address.state}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, state: e.target.value }
                    }
                  })}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <Input
                  value={formData.personalInfo.address.zipCode}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, zipCode: e.target.value }
                    }
                  })}
                  placeholder="ZIP Code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <Input
                  value={formData.personalInfo.address.country}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, country: e.target.value }
                    }
                  })}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <Input
                  value={formData.personalInfo.emergencyContact.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, name: e.target.value }
                    }
                  })}
                  placeholder="Emergency contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <Input
                  value={formData.personalInfo.emergencyContact.relationship}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, relationship: e.target.value }
                    }
                  })}
                  placeholder="Relationship"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={formData.personalInfo.emergencyContact.phone}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, phone: e.target.value }
                    }
                  })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.personalInfo.emergencyContact.email}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, email: e.target.value }
                    }
                  })}
                  placeholder="Email address"
                />
              </div>
            </div>
          </div>


          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.employeeId}>
              Create Technician
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Technician Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Technician"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employee ID *</label>
                <Input
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="Employee ID"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Technician Name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User (Optional)</label>
                <Select
                  value={formData.user}
                  onChange={(e) => setFormData({ ...formData, user: e.target.value })}
                  options={[
                    { value: '', label: 'Select User (Optional)' },
                    ...users.map((user: any) => ({
                      value: user._id,
                      label: `${user.firstName} ${user.lastName}`
                    }))
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <Select
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  options={[
                    { value: 'workshop', label: 'Workshop' },
                    { value: 'diagnostics', label: 'Diagnostics' },
                    { value: 'body_shop', label: 'Body Shop' },
                    { value: 'paint_shop', label: 'Paint Shop' },
                    { value: 'assembly', label: 'Assembly' },
                    { value: 'quality_control', label: 'Quality Control' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                <Select
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  options={[
                    { value: 'junior_technician', label: 'Junior Technician' },
                    { value: 'technician', label: 'Technician' },
                    { value: 'senior_technician', label: 'Senior Technician' },
                    { value: 'lead_technician', label: 'Lead Technician' },
                    { value: 'specialist', label: 'Specialist' },
                    { value: 'supervisor', label: 'Supervisor' }
                  ]}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
                <Select
                  value={formData.employmentStatus}
                  onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value })}
                  options={[
                    { value: 'active', label: 'Active' },
                    { value: 'on_leave', label: 'On Leave' },
                    { value: 'terminated', label: 'Terminated' },
                    { value: 'retired', label: 'Retired' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hire Date</label>
                <Input
                  type="date"
                  value={formData.hireDate}
                  onChange={(e) => setFormData({ ...formData, hireDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <Input
                type="date"
                value={formData.personalInfo.dateOfBirth}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  personalInfo: { ...formData.personalInfo, dateOfBirth: e.target.value }
                })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                <Input
                  value={formData.personalInfo.address.street}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, street: e.target.value }
                    }
                  })}
                  placeholder="Street address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <Input
                  value={formData.personalInfo.address.city}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, city: e.target.value }
                    }
                  })}
                  placeholder="City"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                <Input
                  value={formData.personalInfo.address.state}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, state: e.target.value }
                    }
                  })}
                  placeholder="State"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code</label>
                <Input
                  value={formData.personalInfo.address.zipCode}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, zipCode: e.target.value }
                    }
                  })}
                  placeholder="ZIP Code"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <Input
                  value={formData.personalInfo.address.country}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      address: { ...formData.personalInfo.address, country: e.target.value }
                    }
                  })}
                  placeholder="Country"
                />
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Emergency Contact</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                <Input
                  value={formData.personalInfo.emergencyContact.name}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, name: e.target.value }
                    }
                  })}
                  placeholder="Emergency contact name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
                <Input
                  value={formData.personalInfo.emergencyContact.relationship}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, relationship: e.target.value }
                    }
                  })}
                  placeholder="Relationship"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <Input
                  value={formData.personalInfo.emergencyContact.phone}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, phone: e.target.value }
                    }
                  })}
                  placeholder="Phone number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <Input
                  type="email"
                  value={formData.personalInfo.emergencyContact.email}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    personalInfo: { 
                      ...formData.personalInfo, 
                      emergencyContact: { ...formData.personalInfo.emergencyContact, email: e.target.value }
                    }
                  })}
                  placeholder="Email address"
                />
              </div>
            </div>
          </div>


          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.employeeId}>
              Update Technician
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Machine Management Component
const MachineManagement: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    model: '',
    manufacturer: '',
    serialNumber: '',
    category: '',
    status: 'operational',
    location: {
      building: '',
      floor: '',
      room: '',
      bay: ''
    },
    specifications: {
      powerRating: '',
      dimensions: '',
      weight: 0,
      capacity: '',
      operatingPressure: '',
      operatingTemperature: ''
    },
    purchaseInfo: {
      purchaseDate: '',
      purchasePrice: 0,
      supplier: '',
      warrantyExpiry: ''
    },
    maintenance: {
      schedule: 'monthly',
      lastMaintenance: '',
      nextMaintenance: ''
    },
    operatingInstructions: '',
    safetyRequirements: '',
    requiredCertifications: [],
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch machines
  const { data: machinesData, isLoading } = useQuery({
    queryKey: ['machines-management'],
    queryFn: () => api.get('/machines'),
  });

  const machines = machinesData?.data?.data?.machines || [];

  // Create machine mutation
  const createMachineMutation = useMutation({
    mutationFn: (data: any) => api.post('/machines', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines-management'] });
      setIsCreateOpen(false);
      toast.success('Machine created successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to create machine');
    }
  });

  // Update machine mutation
  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => api.put(`/machines/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines-management'] });
      setIsEditOpen(false);
      toast.success('Machine updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update machine');
    }
  });

  // Delete machine mutation
  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/machines/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines-management'] });
      toast.success('Machine deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to delete machine');
    }
  });

  const handleCreate = () => {
    createMachineMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (selectedMachine) {
      updateMachineMutation.mutate({ id: selectedMachine._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this machine?')) {
      deleteMachineMutation.mutate(id);
    }
  };

  const handleEdit = (machine: any) => {
    setSelectedMachine(machine);
    setFormData({
      name: machine.name || '',
      model: machine.model || '',
      manufacturer: machine.manufacturer || '',
      serialNumber: machine.serialNumber || '',
      category: machine.category || '',
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
        weight: machine.specifications?.weight || 0,
        capacity: machine.specifications?.capacity || '',
        operatingPressure: machine.specifications?.operatingPressure || '',
        operatingTemperature: machine.specifications?.operatingTemperature || ''
      },
      purchaseInfo: {
        purchaseDate: machine.purchaseInfo?.purchaseDate || '',
        purchasePrice: machine.purchaseInfo?.purchasePrice || 0,
        supplier: machine.purchaseInfo?.supplier || '',
        warrantyExpiry: machine.purchaseInfo?.warrantyExpiry || ''
      },
      maintenance: {
        schedule: machine.maintenance?.schedule || 'monthly',
        lastMaintenance: machine.maintenance?.lastMaintenance || '',
        nextMaintenance: machine.maintenance?.nextMaintenance || ''
      },
      operatingInstructions: machine.operatingInstructions || '',
      safetyRequirements: machine.safetyRequirements || '',
      requiredCertifications: machine.requiredCertifications || [],
      notes: machine.notes || ''
    });
    setIsEditOpen(true);
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (machine: any) => (
        <div>
          <div className="font-medium">{machine.name}</div>
          <div className="text-sm text-gray-500">{machine.model}</div>
        </div>
      )
    },
    {
      key: 'manufacturer',
      label: 'Manufacturer'
    },
    {
      key: 'serialNumber',
      label: 'Serial Number'
    },
    {
      key: 'category',
      label: 'Category'
    },
    {
      key: 'status',
      label: 'Status',
      render: (machine: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          machine.status === 'operational' ? 'bg-green-100 text-green-800' :
          machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
          machine.status === 'out_of_order' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {(machine.status || 'unknown').toUpperCase()}
        </span>
      )
    },
    {
      key: 'location',
      label: 'Location',
      render: (machine: any) => (
        <div className="text-sm">
          {machine.location ? (
            <div>
              <div>{machine.location.building || 'N/A'}</div>
              <div className="text-gray-500">
                {machine.location.floor && machine.location.room 
                  ? `${machine.location.floor}/${machine.location.room}` 
                  : machine.location.floor || machine.location.room || ''
                }
              </div>
            </div>
          ) : (
            <span className="text-gray-500">Not specified</span>
          )}
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (machine: any) => (
        <div className="flex space-x-2">
          <button
            onClick={() => handleEdit(machine)}
            className="text-blue-600 hover:text-blue-800"
            title="Edit"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(machine._id)}
            className="text-red-600 hover:text-red-800"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Machine Management</h2>
          <p className="text-gray-600">Manage workshop machines and equipment</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Machine
        </Button>
      </div>

      {/* Machines Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={machines}
          columns={columns}
          loading={isLoading}
        />
      </div>

      {/* Create Machine Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Machine"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Machine name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Machine model"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Manufacturer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <Input
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="Serial number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={[
                    { value: '', label: 'Select Category' },
                    { value: 'diagnostic', label: 'Diagnostic' },
                    { value: 'repair', label: 'Repair' },
                    { value: 'lifting', label: 'Lifting' },
                    { value: 'welding', label: 'Welding' },
                    { value: 'machining', label: 'Machining' },
                    { value: 'testing', label: 'Testing' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'operational', label: 'Operational' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'broken', label: 'Broken' },
                    { value: 'retired', label: 'Retired' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <Input
                  value={formData.location.building}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, building: e.target.value }
                  })}
                  placeholder="Building"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <Input
                  value={formData.location.floor}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, floor: e.target.value }
                  })}
                  placeholder="Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <Input
                  value={formData.location.room}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, room: e.target.value }
                  })}
                  placeholder="Room"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bay</label>
                <Input
                  value={formData.location.bay}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, bay: e.target.value }
                  })}
                  placeholder="Bay"
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Specifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Power Rating</label>
                <Input
                  value={formData.specifications.powerRating}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, powerRating: e.target.value }
                  })}
                  placeholder="Power rating"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                <Input
                  value={formData.specifications.dimensions}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, dimensions: e.target.value }
                  })}
                  placeholder="Dimensions"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <Input
                  type="number"
                  value={formData.specifications.weight}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, weight: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <Input
                  value={formData.specifications.capacity}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, capacity: e.target.value }
                  })}
                  placeholder="Capacity"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Pressure</label>
                <Input
                  value={formData.specifications.operatingPressure}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, operatingPressure: e.target.value }
                  })}
                  placeholder="Operating pressure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Temperature</label>
                <Input
                  value={formData.specifications.operatingTemperature}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, operatingTemperature: e.target.value }
                  })}
                  placeholder="Operating temperature"
                />
              </div>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Purchase Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <Input
                  type="date"
                  value={formData.purchaseInfo.purchaseDate}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, purchaseDate: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchaseInfo.purchasePrice}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, purchasePrice: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <Input
                  value={formData.purchaseInfo.supplier}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, supplier: e.target.value }
                  })}
                  placeholder="Supplier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                <Input
                  type="date"
                  value={formData.purchaseInfo.warrantyExpiry}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, warrantyExpiry: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Maintenance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <Select
                  value={formData.maintenance.schedule}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, schedule: e.target.value }
                  })}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'annually', label: 'Annually' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance</label>
                <Input
                  type="date"
                  value={formData.maintenance.lastMaintenance}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, lastMaintenance: e.target.value }
                  })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Maintenance</label>
              <Input
                type="date"
                value={formData.maintenance.nextMaintenance}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  maintenance: { ...formData.maintenance, nextMaintenance: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operating Instructions</label>
              <TextArea
                value={formData.operatingInstructions}
                onChange={(e) => setFormData({ ...formData, operatingInstructions: e.target.value })}
                placeholder="Operating instructions"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Safety Requirements</label>
              <TextArea
                value={formData.safetyRequirements}
                onChange={(e) => setFormData({ ...formData, safetyRequirements: e.target.value })}
                placeholder="Safety requirements"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <TextArea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name || !formData.category}>
              Create Machine
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Machine Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Machine"
      >
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Machine name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <Input
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  placeholder="Machine model"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <Input
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                  placeholder="Manufacturer"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                <Input
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  placeholder="Serial number"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  options={[
                    { value: '', label: 'Select Category' },
                    { value: 'diagnostic', label: 'Diagnostic' },
                    { value: 'repair', label: 'Repair' },
                    { value: 'lifting', label: 'Lifting' },
                    { value: 'welding', label: 'Welding' },
                    { value: 'machining', label: 'Machining' },
                    { value: 'testing', label: 'Testing' },
                    { value: 'other', label: 'Other' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: 'operational', label: 'Operational' },
                    { value: 'maintenance', label: 'Maintenance' },
                    { value: 'broken', label: 'Broken' },
                    { value: 'retired', label: 'Retired' }
                  ]}
                />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Location</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <Input
                  value={formData.location.building}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, building: e.target.value }
                  })}
                  placeholder="Building"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <Input
                  value={formData.location.floor}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, floor: e.target.value }
                  })}
                  placeholder="Floor"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room</label>
                <Input
                  value={formData.location.room}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, room: e.target.value }
                  })}
                  placeholder="Room"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bay</label>
                <Input
                  value={formData.location.bay}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    location: { ...formData.location, bay: e.target.value }
                  })}
                  placeholder="Bay"
                />
              </div>
            </div>
          </div>

          {/* Specifications */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Specifications</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Power Rating</label>
                <Input
                  value={formData.specifications.powerRating}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, powerRating: e.target.value }
                  })}
                  placeholder="Power rating"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                <Input
                  value={formData.specifications.dimensions}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, dimensions: e.target.value }
                  })}
                  placeholder="Dimensions"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight (kg)</label>
                <Input
                  type="number"
                  value={formData.specifications.weight}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, weight: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Capacity</label>
                <Input
                  value={formData.specifications.capacity}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, capacity: e.target.value }
                  })}
                  placeholder="Capacity"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Pressure</label>
                <Input
                  value={formData.specifications.operatingPressure}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, operatingPressure: e.target.value }
                  })}
                  placeholder="Operating pressure"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Operating Temperature</label>
                <Input
                  value={formData.specifications.operatingTemperature}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    specifications: { ...formData.specifications, operatingTemperature: e.target.value }
                  })}
                  placeholder="Operating temperature"
                />
              </div>
            </div>
          </div>

          {/* Purchase Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Purchase Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <Input
                  type="date"
                  value={formData.purchaseInfo.purchaseDate}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, purchaseDate: e.target.value }
                  })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Price</label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.purchaseInfo.purchasePrice}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, purchasePrice: parseFloat(e.target.value) || 0 }
                  })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                <Input
                  value={formData.purchaseInfo.supplier}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, supplier: e.target.value }
                  })}
                  placeholder="Supplier"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                <Input
                  type="date"
                  value={formData.purchaseInfo.warrantyExpiry}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    purchaseInfo: { ...formData.purchaseInfo, warrantyExpiry: e.target.value }
                  })}
                />
              </div>
            </div>
          </div>

          {/* Maintenance */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Maintenance</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                <Select
                  value={formData.maintenance.schedule}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, schedule: e.target.value }
                  })}
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                    { value: 'quarterly', label: 'Quarterly' },
                    { value: 'annually', label: 'Annually' }
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Maintenance</label>
                <Input
                  type="date"
                  value={formData.maintenance.lastMaintenance}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    maintenance: { ...formData.maintenance, lastMaintenance: e.target.value }
                  })}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Maintenance</label>
              <Input
                type="date"
                value={formData.maintenance.nextMaintenance}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  maintenance: { ...formData.maintenance, nextMaintenance: e.target.value }
                })}
              />
            </div>
          </div>

          {/* Additional Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Additional Information</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operating Instructions</label>
              <TextArea
                value={formData.operatingInstructions}
                onChange={(e) => setFormData({ ...formData, operatingInstructions: e.target.value })}
                placeholder="Operating instructions"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Safety Requirements</label>
              <TextArea
                value={formData.safetyRequirements}
                onChange={(e) => setFormData({ ...formData, safetyRequirements: e.target.value })}
                placeholder="Safety requirements"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <TextArea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={!formData.name || !formData.category}>
              Update Machine
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

// Main Resource Management Page
const ResourceManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tools' | 'technicians' | 'machines'>('tools');

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
    },
    {
      id: 'machines',
      name: 'Machines',
      icon: CogIcon,
      component: MachineManagement
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