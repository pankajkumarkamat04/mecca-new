import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { serviceTemplateAPI, productsAPI, machinesAPI, toolsAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import FormProductSelector from '@/components/ui/FormProductSelector';
import FormToolSelector from '@/components/ui/FormToolSelector';
import FormMachineSelector from '@/components/ui/FormMachineSelector';
import { toast } from 'react-hot-toast';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface ServiceTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number;
  estimatedCost: number;
  priority: string;
  requiredTools: Array<{
    toolId?: string;
    name: string;
    quantity: number;
    optional: boolean;
  }>;
  requiredParts: Array<{
    productId?: string;
    name: string;
    quantity: number;
    optional: boolean;
  }>;
  requiredMachines: Array<{
    machineId?: string;
    name: string;
    quantity: number;
    optional: boolean;
  }>;
  tasks: Array<{
    name: string;
    description: string;
    estimatedDuration: number;
    order: number;
    required: boolean;
  }>;
  notes: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

const ServiceTemplateManager: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    estimatedDuration: 0,
    estimatedCost: 0,
    priority: 'medium',
    requiredTools: [] as Array<{ toolId?: string; name: string; quantity: number; optional: boolean }>,
    requiredParts: [] as Array<{ productId?: string; name: string; quantity: number; optional: boolean }>,
    requiredMachines: [] as Array<{ machineId?: string; name: string; quantity: number; optional: boolean }>,
    tasks: [] as Array<{ name: string; description: string; estimatedDuration: number; order: number; required: boolean }>,
    notes: ''
  });

  // Fetch service templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['serviceTemplates', page, limit, searchQuery, selectedCategory],
    queryFn: () => serviceTemplateAPI.getServiceTemplates({
      page,
      limit,
      search: searchQuery,
      category: selectedCategory
    }),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: serviceTemplateAPI.createServiceTemplate,
    onSuccess: () => {
      // Invalidate all serviceTemplates queries to ensure the list refreshes
      queryClient.invalidateQueries({ queryKey: ['serviceTemplates'] });
      // Also refetch the current query to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['serviceTemplates', page, limit, searchQuery, selectedCategory] });
      setIsCreateModalOpen(false);
      resetForm();
      toast.success('Service template created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create service template');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => serviceTemplateAPI.updateServiceTemplate(id, data),
    onSuccess: () => {
      // Invalidate all serviceTemplates queries to ensure the list refreshes
      queryClient.invalidateQueries({ queryKey: ['serviceTemplates'] });
      // Also refetch the current query to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['serviceTemplates', page, limit, searchQuery, selectedCategory] });
      setIsEditModalOpen(false);
      setSelectedTemplate(null);
      resetForm();
      toast.success('Service template updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update service template');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: serviceTemplateAPI.deleteServiceTemplate,
    onSuccess: () => {
      // Invalidate all serviceTemplates queries to ensure the list refreshes
      queryClient.invalidateQueries({ queryKey: ['serviceTemplates'] });
      // Also refetch the current query to ensure immediate update
      queryClient.refetchQueries({ queryKey: ['serviceTemplates', page, limit, searchQuery, selectedCategory] });
      toast.success('Service template deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete service template');
    },
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: '',
      estimatedDuration: 0,
      estimatedCost: 0,
      priority: 'medium',
      requiredTools: [],
      requiredParts: [],
      requiredMachines: [],
      tasks: [],
      notes: ''
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (!formData.category || formData.category === '') {
      toast.error('Service category is required');
      return;
    }
    if (formData.estimatedDuration <= 0) {
      toast.error('Estimated duration must be greater than 0');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!selectedTemplate) {
      toast.error('No template selected');
      return;
    }
    if (!formData.name.trim()) {
      toast.error('Service name is required');
      return;
    }
    if (!formData.category || formData.category === '') {
      toast.error('Service category is required');
      return;
    }
    if (formData.estimatedDuration <= 0) {
      toast.error('Estimated duration must be greater than 0');
      return;
    }
    updateMutation.mutate({ id: selectedTemplate._id, data: formData });
  };

  const handleEdit = (template: ServiceTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      estimatedDuration: template.estimatedDuration,
      estimatedCost: template.estimatedCost,
      priority: template.priority,
      requiredTools: template.requiredTools || [],
      requiredParts: template.requiredParts || [],
      requiredMachines: template.requiredMachines || [],
      tasks: template.tasks || [],
      notes: template.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this service template?')) {
      deleteMutation.mutate(id);
    }
  };

  const addTool = () => {
    setFormData(prev => ({
      ...prev,
      requiredTools: [...prev.requiredTools, { toolId: '', name: '', quantity: 1, optional: false }]
    }));
  };

  const removeTool = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredTools: prev.requiredTools.filter((_, i) => i !== index)
    }));
  };

  const updateTool = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      requiredTools: prev.requiredTools.map((tool, i) => 
        i === index ? { ...tool, [field]: value } : tool
      )
    }));
  };

  const addPart = () => {
    setFormData(prev => ({
      ...prev,
      requiredParts: [...prev.requiredParts, { productId: '', name: '', quantity: 1, optional: false }]
    }));
  };

  const addMachine = () => {
    setFormData(prev => ({
      ...prev,
      requiredMachines: [...prev.requiredMachines, { machineId: '', name: '', quantity: 1, optional: false }]
    }));
  };

  const removePart = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredParts: prev.requiredParts.filter((_, i) => i !== index)
    }));
  };

  const removeMachine = (index: number) => {
    setFormData(prev => ({
      ...prev,
      requiredMachines: prev.requiredMachines.filter((_, i) => i !== index)
    }));
  };

  const updatePart = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      requiredParts: prev.requiredParts.map((part, i) => 
        i === index ? { ...part, [field]: value } : part
      )
    }));
  };

  const updateMachine = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      requiredMachines: prev.requiredMachines.map((machine, i) => 
        i === index ? { ...machine, [field]: value } : machine
      )
    }));
  };

  // Handle product selection for parts
  const handleProductSelect = (index: number, productId: string) => {
    // Fetch product details to get the name
    productsAPI.getProductById(productId).then(response => {
      const product = response.data.data;
      updatePart(index, 'productId', productId);
      updatePart(index, 'name', product.name);
    }).catch(error => {
      console.error('Error fetching product:', error);
      toast.error('Failed to fetch product details');
    });
  };

  // Handle tool selection for tools
  const handleToolSelect = (index: number, toolId: string) => {
    // Fetch tool details to get the name
    toolsAPI.getToolById(toolId).then(response => {
      const tool = response.data.data;
      updateTool(index, 'toolId', toolId);
      updateTool(index, 'name', tool.name);
    }).catch(error => {
      console.error('Error fetching tool:', error);
      toast.error('Failed to fetch tool details');
    });
  };

  // Handle machine selection for machines
  const handleMachineSelect = (index: number, machineId: string) => {
    // Fetch machine details to get the name
    machinesAPI.getMachineById(machineId).then(response => {
      const machine = response.data.data;
      updateMachine(index, 'machineId', machineId);
      updateMachine(index, 'name', machine.name);
    }).catch(error => {
      console.error('Error fetching machine:', error);
      toast.error('Failed to fetch machine details');
    });
  };

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { 
        name: '', 
        description: '', 
        estimatedDuration: 30, 
        order: prev.tasks.length, 
        required: true 
      }]
    }));
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
    }));
  };

  const updateTask = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const columns = [
    {
      key: 'name',
      label: 'Name',
      render: (template: ServiceTemplate) => (
        <div>
          <div className="font-medium text-gray-900">{template.name}</div>
          <div className="text-sm text-gray-500">{template.description}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (template: ServiceTemplate) => (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {template.category.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'estimatedDuration',
      label: 'Duration',
      render: (template: ServiceTemplate) => {
        const hours = Math.floor(template.estimatedDuration / 60);
        const minutes = template.estimatedDuration % 60;
        return `${hours}h ${minutes}m`;
      },
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (template: ServiceTemplate) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          template.priority === 'urgent' ? 'bg-red-100 text-red-800' :
          template.priority === 'high' ? 'bg-orange-100 text-orange-800' :
          template.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {template.priority.toUpperCase()}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (template: ServiceTemplate) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEdit(template)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDelete(template._id)}
            className="text-red-600 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  const categories = [
    { value: '', label: 'Select Category' },
    { value: 'engine', label: 'Engine' },
    { value: 'transmission', label: 'Transmission' },
    { value: 'suspension', label: 'Suspension' },
    { value: 'brakes', label: 'Brakes' },
    { value: 'electrical', label: 'Electrical' },
    { value: 'air_conditioning', label: 'Air Conditioning' },
    { value: 'bodywork', label: 'Bodywork' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'diagnostic', label: 'Diagnostic' },
    { value: 'other', label: 'Other' },
  ];

  const priorities = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Service Templates</h1>
          <p className="text-gray-600">Manage predefined workshop services</p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Template
        </Button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4">
        <div className="flex-1">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="w-48"
          options={categories}
        />
      </div>

      {/* Data Table */}
      <DataTable
        data={templatesData?.data?.data?.serviceTemplates || []}
        columns={columns}
        loading={isLoading}
        pagination={templatesData?.data?.data?.pagination}
        onPageChange={setPage}
      />

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Service Template"
        size="lg"
      >
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engine Overhaul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                options={categories}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Service description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <Input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: Number(e.target.value) }))}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost
              </label>
              <Input
                type="number"
                value={formData.estimatedCost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                options={priorities}
              />
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
              <Button variant="outline" size="sm" onClick={addTask}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
            <div className="space-y-3">
              {formData.tasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <Input
                      placeholder="Task name"
                      value={task.name}
                      onChange={(e) => updateTask(index, 'name', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Duration (minutes)"
                      value={task.estimatedDuration}
                      onChange={(e) => updateTask(index, 'estimatedDuration', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <textarea
                    placeholder="Task description"
                    value={task.description}
                    onChange={(e) => updateTask(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    rows={2}
                  />
                  <div className="flex justify-between items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={task.required}
                        onChange={(e) => updateTask(index, 'required', e.target.checked)}
                        className="mr-2"
                      />
                      Required
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTask(index)}
                      className="text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Parts Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Required Parts</h3>
              <Button variant="outline" size="sm" onClick={addPart}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Part
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requiredParts.map((part, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Product *
                      </label>
                      <FormProductSelector
                        value={part.productId || ''}
                        onChange={(productId) => handleProductSelect(index, productId)}
                        placeholder="Search and select a product..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={part.quantity}
                      onChange={(e) => updatePart(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={part.optional}
                          onChange={(e) => updatePart(index, 'optional', e.target.checked)}
                          className="mr-2"
                        />
                        Optional
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePart(index)}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Tools Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Required Tools</h3>
              <Button variant="outline" size="sm" onClick={addTool}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Tool
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requiredTools.map((tool, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Tool *
                      </label>
                      <FormToolSelector
                        value={tool.toolId || ''}
                        onChange={(toolId) => handleToolSelect(index, toolId)}
                        placeholder="Search and select a tool..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={tool.quantity}
                      onChange={(e) => updateTool(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tool.optional}
                          onChange={(e) => updateTool(index, 'optional', e.target.checked)}
                          className="mr-2"
                        />
                        Optional
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTool(index)}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Machines Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Required Machines</h3>
              <Button variant="outline" size="sm" onClick={addMachine}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Machine
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requiredMachines.map((machine, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Machine *
                      </label>
                      <FormMachineSelector
                        value={machine.machineId || ''}
                        onChange={(machineId) => handleMachineSelect(index, machineId)}
                        placeholder="Search and select a machine..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={machine.quantity}
                      onChange={(e) => updateMachine(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={machine.optional}
                          onChange={(e) => updateMachine(index, 'optional', e.target.checked)}
                          className="mr-2"
                        />
                        Optional
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMachine(index)}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Template'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Service Template"
        size="lg"
      >
        {/* Same form content as create modal */}
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Engine Overhaul"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <Select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                options={categories}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Service description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Duration (minutes)
              </label>
              <Input
                type="number"
                value={formData.estimatedDuration}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedDuration: Number(e.target.value) }))}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Estimated Cost
              </label>
              <Input
                type="number"
                value={formData.estimatedCost}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
                min="0"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <Select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                options={priorities}
              />
            </div>
          </div>

          {/* Tasks Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
              <Button variant="outline" size="sm" onClick={addTask}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Task
              </Button>
            </div>
            <div className="space-y-3">
              {formData.tasks.map((task, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <Input
                      placeholder="Task name"
                      value={task.name}
                      onChange={(e) => updateTask(index, 'name', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Duration (minutes)"
                      value={task.estimatedDuration}
                      onChange={(e) => updateTask(index, 'estimatedDuration', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <textarea
                    placeholder="Task description"
                    value={task.description}
                    onChange={(e) => updateTask(index, 'description', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                    rows={2}
                  />
                  <div className="flex justify-between items-center">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={task.required}
                        onChange={(e) => updateTask(index, 'required', e.target.checked)}
                        className="mr-2"
                      />
                      Required
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeTask(index)}
                      className="text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Parts Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Required Parts</h3>
              <Button variant="outline" size="sm" onClick={addPart}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Part
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requiredParts.map((part, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Product *
                      </label>
                      <FormProductSelector
                        value={part.productId || ''}
                        onChange={(productId) => handleProductSelect(index, productId)}
                        placeholder="Search and select a product..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={part.quantity}
                      onChange={(e) => updatePart(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={part.optional}
                          onChange={(e) => updatePart(index, 'optional', e.target.checked)}
                          className="mr-2"
                        />
                        Optional
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removePart(index)}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Tools Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Required Tools</h3>
              <Button variant="outline" size="sm" onClick={addTool}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Tool
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requiredTools.map((tool, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Tool *
                      </label>
                      <FormToolSelector
                        value={tool.toolId || ''}
                        onChange={(toolId) => handleToolSelect(index, toolId)}
                        placeholder="Search and select a tool..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={tool.quantity}
                      onChange={(e) => updateTool(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={tool.optional}
                          onChange={(e) => updateTool(index, 'optional', e.target.checked)}
                          className="mr-2"
                        />
                        Optional
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeTool(index)}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Required Machines Section */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-900">Required Machines</h3>
              <Button variant="outline" size="sm" onClick={addMachine}>
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Machine
              </Button>
            </div>
            <div className="space-y-3">
              {formData.requiredMachines.map((machine, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-4 mb-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Machine *
                      </label>
                      <FormMachineSelector
                        value={machine.machineId || ''}
                        onChange={(machineId) => handleMachineSelect(index, machineId)}
                        placeholder="Search and select a machine..."
                        className="w-full"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={machine.quantity}
                      onChange={(e) => updateMachine(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                    <div className="flex items-center justify-between">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={machine.optional}
                          onChange={(e) => updateMachine(index, 'optional', e.target.checked)}
                          className="mr-2"
                        />
                        Optional
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMachine(index)}
                        className="text-red-600"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Updating...' : 'Update Template'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ServiceTemplateManager;
