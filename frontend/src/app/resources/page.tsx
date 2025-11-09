'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { toolsAPI, techniciansAPI, machinesAPI } from '@/lib/api';
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
  ArrowRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

// Tool Management Component
const ToolManagement: React.FC = () => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStockCountOpen, setIsStockCountOpen] = useState(false);
  const [isAdjustInventoryOpen, setIsAdjustInventoryOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    description: '',
    category: '',
    status: 'available',
    location: '',
    condition: 'good',
    specifications: {
      size: '',
      weight: 0,
      powerSource: '',
      voltage: '',
      torque: '',
      capacity: ''
    },
    inventory: {
      quantity: 1,
      availableQuantity: 1,
      inUseQuantity: 0,
      misplacedQuantity: 0
    },
    purchaseDate: '',
    purchasePrice: 0,
    supplier: '',
    warrantyExpiry: '',
    notes: ''
  });
  const [stockCountData, setStockCountData] = useState({
    actualQuantity: 0,
    notes: ''
  });
  const [adjustmentData, setAdjustmentData] = useState({
    adjustmentType: 'found',
    quantity: 0,
    reason: ''
  });

  const queryClient = useQueryClient();

  // Fetch tools
  const { data: toolsData, isLoading } = useQuery({
    queryKey: ['tools'],
    queryFn: () => toolsAPI.getTools(),
  });

  const tools = toolsData?.data?.data?.tools || [];

  // Create tool mutation
  const createToolMutation = useMutation({
    mutationFn: (data: any) => toolsAPI.createTool(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Tool created successfully');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to create tool';
      
      if (error.response?.data) {
        // Check if there are multiple validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Create tool error:', error);
    }
  });

  // Update tool mutation
  const updateToolMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => toolsAPI.updateTool(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsEditOpen(false);
      setSelectedTool(null);
      resetForm();
      toast.success('Tool updated successfully');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to update tool';
      
      if (error.response?.data) {
        // Check if there are multiple validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Update tool error:', error);
    }
  });

  // Delete tool mutation
  const deleteToolMutation = useMutation({
    mutationFn: (id: string) => toolsAPI.deleteTool(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      toast.success('Tool deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete tool';
      toast.error(errorMessage);
      console.error('Delete tool error:', error);
    }
  });

  // Stock count mutation
  const stockCountMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => toolsAPI.performStockCount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsStockCountOpen(false);
      setStockCountData({ actualQuantity: 0, notes: '' });
      toast.success('Stock count completed successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to perform stock count';
      toast.error(errorMessage);
      console.error('Stock count error:', error);
    }
  });

  // Inventory adjustment mutation
  const adjustInventoryMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => toolsAPI.adjustInventory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      setIsAdjustInventoryOpen(false);
      setAdjustmentData({ adjustmentType: 'found', quantity: 0, reason: '' });
      toast.success('Inventory adjusted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to adjust inventory';
      toast.error(errorMessage);
      console.error('Adjust inventory error:', error);
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
      specifications: {
        size: '',
        weight: 0,
        powerSource: '',
        voltage: '',
        torque: '',
        capacity: ''
      },
      inventory: {
        quantity: 1,
        availableQuantity: 1,
        inUseQuantity: 0,
        misplacedQuantity: 0
      },
      purchaseDate: '',
      purchasePrice: 0,
      supplier: '',
      warrantyExpiry: '',
      notes: ''
    });
  };

  const handleCreate = () => {
    // Ensure required fields are not empty
    if (!formData.category) {
      toast.error('Please select a category');
      return;
    }
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
      specifications: {
        size: tool.specifications?.size || '',
        weight: tool.specifications?.weight || 0,
        powerSource: tool.specifications?.powerSource || '',
        voltage: tool.specifications?.voltage || '',
        torque: tool.specifications?.torque || '',
        capacity: tool.specifications?.capacity || ''
      },
      inventory: {
        quantity: tool.inventory?.quantity || 1,
        availableQuantity: tool.inventory?.availableQuantity || 1,
        inUseQuantity: tool.inventory?.inUseQuantity || 0,
        misplacedQuantity: tool.inventory?.misplacedQuantity || 0
      },
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
      // Ensure required fields are not empty
      if (!formData.category) {
        toast.error('Please select a category');
        return;
      }
      updateToolMutation.mutate({ id: selectedTool._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this tool?')) {
      deleteToolMutation.mutate(id);
    }
  };

  const handleStockCount = (tool: any) => {
    setSelectedTool(tool);
    setStockCountData({
      actualQuantity: tool.inventory?.quantity || 0,
      notes: ''
    });
    setIsStockCountOpen(true);
  };

  const handleAdjustInventory = (tool: any) => {
    setSelectedTool(tool);
    setAdjustmentData({
      adjustmentType: 'found',
      quantity: 0,
      reason: ''
    });
    setIsAdjustInventoryOpen(true);
  };

  const performStockCount = () => {
    if (selectedTool) {
      stockCountMutation.mutate({ id: selectedTool._id, data: stockCountData });
    }
  };

  const performInventoryAdjustment = () => {
    if (selectedTool) {
      adjustInventoryMutation.mutate({ id: selectedTool._id, data: adjustmentData });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Tool Name',
      render: (tool: any) => (
        <div>
          <div className="font-medium text-gray-900">{tool.name}</div>
          <div className="text-sm text-gray-500">
            {tool.category}
            {tool.specifications?.size && ` • Size: ${tool.specifications.size}`}
          </div>
        </div>
      )
    },
    {
      key: 'inventory',
      label: 'Inventory',
      render: (tool: any) => (
        <div className="text-sm">
          <div className="font-medium">Total: {tool.inventory?.quantity || 0}</div>
          <div className="text-gray-500">
            Available: {tool.inventory?.availableQuantity || 0} | 
            In Use: {tool.inventory?.inUseQuantity || 0}
            {tool.inventory?.misplacedQuantity > 0 && (
              <span className="text-red-600"> | Misplaced: {tool.inventory.misplacedQuantity}</span>
            )}
          </div>
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
      label: 'Location',
      render: (tool: any) => (
        <span className="text-sm text-gray-600">
          {(() => {
            const loc = tool.location;
            if (!loc) return 'Not specified';
            if (typeof loc === 'string') return loc;
            const parts = [loc.storageArea, loc.shelf, loc.bin].filter(Boolean);
            return parts.length ? parts.join(' / ') : 'Not specified';
          })()}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (tool: any) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(tool)}
            className="text-blue-600 hover:text-blue-700"
            title="Edit Tool"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleStockCount(tool)}
            className="text-green-600 hover:text-green-700"
            title="Stock Count"
          >
            <ChartBarIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAdjustInventory(tool)}
            className="text-orange-600 hover:text-orange-700"
            title="Adjust Inventory"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(tool._id)}
            className="text-red-600 hover:text-red-700"
            title="Delete Tool"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Tool Management</h2>
          <p className="text-sm text-gray-600 sm:text-base">Manage workshop tools and equipment with inventory tracking</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <PlusIcon className="mr-2 h-5 w-5" />
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, category: e.target.value }))}
              required
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Size"
              value={formData.specifications.size}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, size: e.target.value }
              }))}
              placeholder="e.g., 3, 10mm, 1/2 inch"
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={formData.specifications.weight}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, weight: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Power Source"
              value={formData.specifications.powerSource}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, powerSource: e.target.value }
              }))}
              options={[
                { value: '', label: 'Select Power Source' },
                { value: 'manual', label: 'Manual' },
                { value: 'electric', label: 'Electric' },
                { value: 'pneumatic', label: 'Pneumatic' },
                { value: 'hydraulic', label: 'Hydraulic' },
                { value: 'battery', label: 'Battery' }
              ]}
            />
            <Input
              label="Voltage"
              value={formData.specifications.voltage}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, voltage: e.target.value }
              }))}
              placeholder="e.g., 220V, 12V"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Torque"
              value={formData.specifications.torque}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, torque: e.target.value }
              }))}
              placeholder="e.g., 50 Nm"
            />
            <Input
              label="Capacity"
              value={formData.specifications.capacity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, capacity: e.target.value }
              }))}
              placeholder="e.g., 1000kg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={formData.inventory.quantity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                inventory: { ...prev.inventory, quantity: parseInt(e.target.value) || 1 }
              }))}
            />
            <Input
              label="Available Quantity"
              type="number"
              min="0"
              value={formData.inventory.availableQuantity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                inventory: { ...prev.inventory, availableQuantity: parseInt(e.target.value) || 0 }
              }))}
            />
          </div>
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, condition: e.target.value }))}
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, purchaseDate: e.target.value }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, warrantyExpiry: e.target.value }))}
            />
          </div>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, supplier: e.target.value }))}
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createToolMutation.isPending}
              className="w-full sm:w-auto"
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, category: e.target.value }))}
              required
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Size"
              value={formData.specifications.size}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, size: e.target.value }
              }))}
              placeholder="e.g., 3, 10mm, 1/2 inch"
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={formData.specifications.weight}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, weight: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Power Source"
              value={formData.specifications.powerSource}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, powerSource: e.target.value }
              }))}
              options={[
                { value: '', label: 'Select Power Source' },
                { value: 'manual', label: 'Manual' },
                { value: 'electric', label: 'Electric' },
                { value: 'pneumatic', label: 'Pneumatic' },
                { value: 'hydraulic', label: 'Hydraulic' },
                { value: 'battery', label: 'Battery' }
              ]}
            />
            <Input
              label="Voltage"
              value={formData.specifications.voltage}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, voltage: e.target.value }
              }))}
              placeholder="e.g., 220V, 12V"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Torque"
              value={formData.specifications.torque}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, torque: e.target.value }
              }))}
              placeholder="e.g., 50 Nm"
            />
            <Input
              label="Capacity"
              value={formData.specifications.capacity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, capacity: e.target.value }
              }))}
              placeholder="e.g., 1000kg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={formData.inventory.quantity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                inventory: { ...prev.inventory, quantity: parseInt(e.target.value) || 1 }
              }))}
            />
            <Input
              label="Available Quantity"
              type="number"
              min="0"
              value={formData.inventory.availableQuantity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                inventory: { ...prev.inventory, availableQuantity: parseInt(e.target.value) || 0 }
              }))}
            />
          </div>
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, condition: e.target.value }))}
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, purchaseDate: e.target.value }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, warrantyExpiry: e.target.value }))}
            />
          </div>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, supplier: e.target.value }))}
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedTool(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              loading={updateToolMutation.isPending}
              className="w-full sm:w-auto"
            >
              Update Tool
            </Button>
          </div>
        </div>
      </Modal>

      {/* Stock Count Modal */}
      <Modal
        isOpen={isStockCountOpen}
        onClose={() => {
          setIsStockCountOpen(false);
          setSelectedTool(null);
          setStockCountData({ actualQuantity: 0, notes: '' });
        }}
        title="Stock Count"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Tool: {selectedTool?.name}</h3>
            <p className="text-sm text-gray-600">
              Expected Quantity: {selectedTool?.inventory?.quantity || 0}
            </p>
          </div>
          <Input
            label="Actual Quantity Found"
            type="number"
            min="0"
            value={stockCountData.actualQuantity}
            onChange={(e) => setStockCountData((prev: any) => ({ 
              ...prev, 
              actualQuantity: parseInt(e.target.value) || 0 
            }))}
            required
          />
          <TextArea
            label="Notes"
            value={stockCountData.notes}
            onChange={(e) => setStockCountData((prev: any) => ({ 
              ...prev, 
              notes: e.target.value 
            }))}
            placeholder="Any notes about the stock count..."
            rows={3}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsStockCountOpen(false);
                setSelectedTool(null);
                setStockCountData({ actualQuantity: 0, notes: '' });
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={performStockCount}
              loading={stockCountMutation.isPending}
              className="w-full sm:w-auto"
            >
              Complete Stock Count
            </Button>
          </div>
        </div>
      </Modal>

      {/* Inventory Adjustment Modal */}
      <Modal
        isOpen={isAdjustInventoryOpen}
        onClose={() => {
          setIsAdjustInventoryOpen(false);
          setSelectedTool(null);
          setAdjustmentData({ adjustmentType: 'found', quantity: 0, reason: '' });
        }}
        title="Adjust Inventory"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Tool: {selectedTool?.name}</h3>
            <p className="text-sm text-gray-600">
              Current Quantity: {selectedTool?.inventory?.quantity || 0}
            </p>
          </div>
          <Select
            label="Adjustment Type"
            value={adjustmentData.adjustmentType}
            onChange={(e) => setAdjustmentData((prev: any) => ({ 
              ...prev, 
              adjustmentType: e.target.value 
            }))}
            options={[
              { value: 'found', label: 'Found Tools' },
              { value: 'lost', label: 'Lost Tools' },
              { value: 'damaged', label: 'Damaged Tools' },
              { value: 'returned', label: 'Returned Tools' }
            ]}
          />
          <Input
            label="Quantity"
            type="number"
            min="1"
            value={adjustmentData.quantity}
            onChange={(e) => setAdjustmentData((prev: any) => ({ 
              ...prev, 
              quantity: parseInt(e.target.value) || 0 
            }))}
            required
          />
          <TextArea
            label="Reason"
            value={adjustmentData.reason}
            onChange={(e) => setAdjustmentData((prev: any) => ({ 
              ...prev, 
              reason: e.target.value 
            }))}
            placeholder="Reason for inventory adjustment..."
            rows={3}
            required
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsAdjustInventoryOpen(false);
                setSelectedTool(null);
                setAdjustmentData({ adjustmentType: 'found', quantity: 0, reason: '' });
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={performInventoryAdjustment}
              loading={adjustInventoryMutation.isPending}
              className="w-full sm:w-auto"
            >
              Adjust Inventory
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
  const [isSkillOpen, setIsSkillOpen] = useState(false);
  const [isCertificationOpen, setIsCertificationOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    employeeId: '',
    department: 'workshop',
    position: 'technician',
    hireDate: '',
    employmentStatus: 'active',
    workInfo: {
      workStation: null,
      preferredShift: 'morning',
      maxHoursPerWeek: 40
    },
    contactInfo: {
      phone: '',
      email: '',
      address: ''
    },
    skills: [],
    certifications: [],
    preferences: {
      maxConcurrentJobs: 3,
      preferredJobTypes: [],
      availability: []
    },
    notes: ''
  });
  const [skillData, setSkillData] = useState({
    name: '',
    category: '',
    level: 'intermediate',
    yearsExperience: 0
  });
  const [certificationData, setCertificationData] = useState({
    name: '',
    issuingBody: '',
    certificateNumber: '',
    issuedDate: '',
    expiryDate: '',
    notes: ''
  });

  const queryClient = useQueryClient();

  // Fetch technicians
  const { data: techniciansData, isLoading } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => techniciansAPI.getTechnicians(),
  });

  const technicians = techniciansData?.data?.data?.technicians || [];

  // Create technician mutation
  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => techniciansAPI.createTechnician(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Technician created successfully');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to create technician';
      
      if (error.response?.data) {
        // Check if there are multiple validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Create technician error:', error);
    }
  });

  // Update technician mutation
  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => techniciansAPI.updateTechnician(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsEditOpen(false);
      setSelectedTechnician(null);
      resetForm();
      toast.success('Technician updated successfully');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to update technician';
      
      if (error.response?.data) {
        // Check if there are multiple validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Update technician error:', error);
    }
  });

  // Delete technician mutation
  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => techniciansAPI.deleteTechnician(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      toast.success('Technician deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete technician';
      toast.error(errorMessage);
      console.error('Delete technician error:', error);
    }
  });

  // Add skill mutation
  const addSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => techniciansAPI.addSkill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsSkillOpen(false);
      setSkillData({ name: '', category: '', level: 'intermediate', yearsExperience: 0 });
      toast.success('Skill added successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add skill';
      toast.error(errorMessage);
      console.error('Add skill error:', error);
    }
  });

  // Add certification mutation
  const addCertificationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => techniciansAPI.addCertification(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsCertificationOpen(false);
      setCertificationData({ name: '', issuingBody: '', certificateNumber: '', issuedDate: '', expiryDate: '', notes: '' });
      toast.success('Certification added successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add certification';
      toast.error(errorMessage);
      console.error('Add certification error:', error);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      employeeId: '',
      department: 'workshop',
      position: 'technician',
      hireDate: '',
      employmentStatus: 'active',
      workInfo: {
        workStation: null,
        preferredShift: 'morning',
        maxHoursPerWeek: 40
      },
      contactInfo: {
        phone: '',
        email: '',
        address: ''
      },
      skills: [],
      certifications: [],
      preferences: {
        maxConcurrentJobs: 3,
        preferredJobTypes: [],
        availability: []
      },
      notes: ''
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter technician name');
      return;
    }
    createTechnicianMutation.mutate(formData);
  };

  const handleEdit = (technician: any) => {
    setSelectedTechnician(technician);
    setFormData({
      name: technician.name || '',
      employeeId: technician.employeeId || '',
      department: technician.department || 'workshop',
      position: technician.position || 'technician',
      hireDate: technician.hireDate ? new Date(technician.hireDate).toISOString().split('T')[0] : '',
      employmentStatus: technician.employmentStatus || 'active',
      workInfo: {
        workStation: technician.workInfo?.workStation || null,
        preferredShift: technician.workInfo?.preferredShift || 'morning',
        maxHoursPerWeek: technician.workInfo?.maxHoursPerWeek || 40
      },
      contactInfo: {
        phone: technician.contactInfo?.phone || '',
        email: technician.contactInfo?.email || '',
        address: technician.contactInfo?.address || ''
      },
      skills: technician.skills || [],
      certifications: technician.certifications || [],
      preferences: {
        maxConcurrentJobs: technician.preferences?.maxConcurrentJobs || 3,
        preferredJobTypes: technician.preferences?.preferredJobTypes || [],
        availability: technician.preferences?.availability || []
      },
      notes: technician.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedTechnician) {
      if (!formData.name.trim()) {
        toast.error('Please enter technician name');
        return;
      }
      updateTechnicianMutation.mutate({ id: selectedTechnician._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this technician?')) {
      deleteTechnicianMutation.mutate(id);
    }
  };

  const handleAddSkill = (technician: any) => {
    setSelectedTechnician(technician);
    setIsSkillOpen(true);
  };

  const handleAddCertification = (technician: any) => {
    setSelectedTechnician(technician);
    setIsCertificationOpen(true);
  };

  const addSkill = () => {
    if (selectedTechnician) {
      addSkillMutation.mutate({ id: selectedTechnician._id, data: skillData });
    }
  };

  const addCertification = () => {
    if (selectedTechnician) {
      addCertificationMutation.mutate({ id: selectedTechnician._id, data: certificationData });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Technician',
      render: (technician: any) => (
        <div>
          <div className="font-medium text-gray-900">{technician.name}</div>
          <div className="text-sm text-gray-500">
            {technician.employeeId && `ID: ${technician.employeeId} • `}
            {technician.position} • {technician.department}
          </div>
        </div>
      )
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
          {(technician.employmentStatus || 'unknown').replace('_', ' ').toUpperCase()}
        </span>
      )
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (technician: any) => (
        <div className="text-sm">
          <div className="font-medium">{technician.skills?.length || 0} Skills</div>
          <div className="text-gray-500">
            {technician.skills?.slice(0, 2).map((skill: any, index: number) => (
              <span key={index}>
                {skill.name}
                {index < Math.min(technician.skills.length, 2) - 1 && ', '}
              </span>
            ))}
            {technician.skills?.length > 2 && '...'}
          </div>
        </div>
      )
    },
    {
      key: 'certifications',
      label: 'Certifications',
      render: (technician: any) => (
        <div className="text-sm">
          <div className="font-medium">{technician.certifications?.length || 0} Active</div>
          <div className="text-gray-500">
            {technician.certifications?.filter((cert: any) => cert.isActive).length || 0} Valid
          </div>
        </div>
      )
    },
    {
      key: 'workInfo',
      label: 'Work Info',
      render: (technician: any) => (
        <div className="text-sm">
          <div className="font-medium">{technician.workInfo?.preferredShift || 'morning'} Shift</div>
          <div className="text-gray-500">{technician.workInfo?.maxHoursPerWeek || 40}h/week</div>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (technician: any) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(technician)}
            className="text-blue-600 hover:text-blue-700"
            title="Edit Technician"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddSkill(technician)}
            className="text-green-600 hover:text-green-700"
            title="Add Skill"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddCertification(technician)}
            className="text-purple-600 hover:text-purple-700"
            title="Add Certification"
          >
            <CogIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(technician._id)}
            className="text-red-600 hover:text-red-700"
            title="Delete Technician"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Technician Management</h2>
          <p className="text-sm text-gray-600 sm:text-base">Manage workshop technicians and staff</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <PlusIcon className="mr-2 h-5 w-5" />
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
              label="Technician Name"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Employee ID"
              value={formData.employeeId}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, employeeId: e.target.value }))}
              placeholder="Optional"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, department: e.target.value }))}
              options={[
                { value: 'workshop', label: 'Workshop' },
                { value: 'diagnostics', label: 'Diagnostics' },
                { value: 'body_shop', label: 'Body Shop' },
                { value: 'paint_shop', label: 'Paint Shop' },
                { value: 'assembly', label: 'Assembly' },
                { value: 'quality_control', label: 'Quality Control' }
              ]}
            />
            <Select
              label="Position"
              value={formData.position}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, position: e.target.value }))}
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Hire Date"
              type="date"
              value={formData.hireDate}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, hireDate: e.target.value }))}
            />
            <Select
              label="Employment Status"
              value={formData.employmentStatus}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, employmentStatus: e.target.value }))}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'terminated', label: 'Terminated' },
                { value: 'retired', label: 'Retired' }
              ]}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Preferred Shift"
              value={formData.workInfo.preferredShift}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                workInfo: { ...prev.workInfo, preferredShift: e.target.value }
              }))}
              options={[
                { value: 'morning', label: 'Morning Shift' },
                { value: 'afternoon', label: 'Afternoon Shift' },
                { value: 'night', label: 'Night Shift' },
                { value: 'flexible', label: 'Flexible' }
              ]}
            />
            <Input
              label="Max Hours per Week"
              type="number"
              min="1"
              max="80"
              value={formData.workInfo.maxHoursPerWeek}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                workInfo: { ...prev.workInfo, maxHoursPerWeek: parseInt(e.target.value) || 40 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={formData.contactInfo.phone}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                contactInfo: { ...prev.contactInfo, phone: e.target.value }
              }))}
            />
            <Input
              label="Email"
              type="email"
              value={formData.contactInfo.email}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                contactInfo: { ...prev.contactInfo, email: e.target.value }
              }))}
            />
          </div>
          <Input
            label="Address"
            value={formData.contactInfo.address}
            onChange={(e) => setFormData((prev: any) => ({ 
              ...prev, 
              contactInfo: { ...prev.contactInfo, address: e.target.value }
            }))}
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createTechnicianMutation.isPending}
              className="w-full sm:w-auto"
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
              label="Technician Name"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, category: e.target.value }))}
              required
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Size"
              value={formData.specifications.size}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, size: e.target.value }
              }))}
              placeholder="e.g., 3, 10mm, 1/2 inch"
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={formData.specifications.weight}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, weight: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Power Source"
              value={formData.specifications.powerSource}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, powerSource: e.target.value }
              }))}
              options={[
                { value: '', label: 'Select Power Source' },
                { value: 'manual', label: 'Manual' },
                { value: 'electric', label: 'Electric' },
                { value: 'pneumatic', label: 'Pneumatic' },
                { value: 'hydraulic', label: 'Hydraulic' },
                { value: 'battery', label: 'Battery' }
              ]}
            />
            <Input
              label="Voltage"
              value={formData.specifications.voltage}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, voltage: e.target.value }
              }))}
              placeholder="e.g., 220V, 12V"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Torque"
              value={formData.specifications.torque}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, torque: e.target.value }
              }))}
              placeholder="e.g., 50 Nm"
            />
            <Input
              label="Capacity"
              value={formData.specifications.capacity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, capacity: e.target.value }
              }))}
              placeholder="e.g., 1000kg"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Quantity"
              type="number"
              min="1"
              value={formData.inventory.quantity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                inventory: { ...prev.inventory, quantity: parseInt(e.target.value) || 1 }
              }))}
            />
            <Input
              label="Available Quantity"
              type="number"
              min="0"
              value={formData.inventory.availableQuantity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                inventory: { ...prev.inventory, availableQuantity: parseInt(e.target.value) || 0 }
              }))}
            />
          </div>
          <TextArea
            label="Description"
            value={formData.description}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
            rows={3}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, condition: e.target.value }))}
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
              onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, purchasePrice: parseFloat(e.target.value) || 0 }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, purchaseDate: e.target.value }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.warrantyExpiry}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, warrantyExpiry: e.target.value }))}
            />
          </div>
          <Input
            label="Supplier"
            value={formData.supplier}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, supplier: e.target.value }))}
          />
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedTechnician(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              loading={updateTechnicianMutation.isPending}
              className="w-full sm:w-auto"
            >
              Update Technician
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Skill Modal */}
      <Modal
        isOpen={isSkillOpen}
        onClose={() => {
          setIsSkillOpen(false);
          setSelectedTechnician(null);
          setSkillData({ name: '', category: '', level: 'intermediate', yearsExperience: 0 });
        }}
        title="Add Skill"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Technician: {selectedTechnician?.name}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Skill Name"
              value={skillData.name}
              onChange={(e) => setSkillData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Category"
              value={skillData.category}
              onChange={(e) => setSkillData((prev: any) => ({ ...prev, category: e.target.value }))}
              placeholder="e.g., Mechanical, Electrical"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Skill Level"
              value={skillData.level}
              onChange={(e) => setSkillData((prev: any) => ({ ...prev, level: e.target.value }))}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
                { value: 'expert', label: 'Expert' }
              ]}
            />
            <Input
              label="Years of Experience"
              type="number"
              min="0"
              value={skillData.yearsExperience}
              onChange={(e) => setSkillData((prev: any) => ({ ...prev, yearsExperience: parseInt(e.target.value) || 0 }))}
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsSkillOpen(false);
                setSelectedTechnician(null);
                setSkillData({ name: '', category: '', level: 'intermediate', yearsExperience: 0 });
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={addSkill}
              loading={addSkillMutation.isPending}
              className="w-full sm:w-auto"
            >
              Add Skill
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Certification Modal */}
      <Modal
        isOpen={isCertificationOpen}
        onClose={() => {
          setIsCertificationOpen(false);
          setSelectedTechnician(null);
          setCertificationData({ name: '', issuingBody: '', certificateNumber: '', issuedDate: '', expiryDate: '', notes: '' });
        }}
        title="Add Certification"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Technician: {selectedTechnician?.name}</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Certification Name"
              value={certificationData.name}
              onChange={(e) => setCertificationData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Issuing Body"
              value={certificationData.issuingBody}
              onChange={(e) => setCertificationData((prev: any) => ({ ...prev, issuingBody: e.target.value }))}
              required
            />
          </div>
          <Input
            label="Certificate Number"
            value={certificationData.certificateNumber}
            onChange={(e) => setCertificationData((prev: any) => ({ ...prev, certificateNumber: e.target.value }))}
            required
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Issued Date"
              type="date"
              value={certificationData.issuedDate}
              onChange={(e) => setCertificationData((prev: any) => ({ ...prev, issuedDate: e.target.value }))}
              required
            />
            <Input
              label="Expiry Date"
              type="date"
              value={certificationData.expiryDate}
              onChange={(e) => setCertificationData((prev: any) => ({ ...prev, expiryDate: e.target.value }))}
              required
            />
          </div>
          <TextArea
            label="Notes"
            value={certificationData.notes}
            onChange={(e) => setCertificationData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCertificationOpen(false);
                setSelectedTechnician(null);
                setCertificationData({ name: '', issuingBody: '', certificateNumber: '', issuedDate: '', expiryDate: '', notes: '' });
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={addCertification}
              loading={addCertificationMutation.isPending}
              className="w-full sm:w-auto"
            >
              Add Certification
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
  const [isMaintenanceOpen, setIsMaintenanceOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any>(null);
  const [formData, setFormData] = useState<any>({
    name: '',
    model: '',
    manufacturer: '',
    serialNumber: '',
    category: '',
    status: 'operational',
    location: '',
    specifications: {
      capacity: '',
      powerRating: '',
      dimensions: '',
      weight: 0,
      operatingTemperature: '',
      operatingPressure: ''
    },
    availability: {
      isAvailable: true,
      currentJob: null,
      bookedBy: null,
      bookedUntil: null
    },
    maintenance: {
      lastMaintenance: '',
      nextMaintenance: '',
      maintenanceInterval: 30,
      maintenanceHistory: []
    },
    purchaseInfo: {
      purchaseDate: '',
      purchasePrice: 0,
      supplier: '',
      warrantyExpiry: ''
    },
    notes: ''
  });
  const [maintenanceData, setMaintenanceData] = useState({
    type: 'routine',
    description: '',
    cost: 0,
    notes: ''
  });
  const [bookingData, setBookingData] = useState({
    jobId: '',
    until: ''
  });

  const queryClient = useQueryClient();

  // Fetch machines
  const { data: machinesData, isLoading } = useQuery({
    queryKey: ['machines'],
    queryFn: () => machinesAPI.getMachines(),
  });

  const machines = machinesData?.data?.data?.machines || [];

  // Create machine mutation
  const createMachineMutation = useMutation({
    mutationFn: (data: any) => machinesAPI.createMachine(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsCreateOpen(false);
      resetForm();
      toast.success('Machine created successfully');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to create machine';
      
      if (error.response?.data) {
        // Check if there are multiple validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Create machine error:', error);
    }
  });

  // Update machine mutation
  const updateMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => machinesAPI.updateMachine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsEditOpen(false);
      setSelectedMachine(null);
      resetForm();
      toast.success('Machine updated successfully');
    },
    onError: (error: any) => {
      let errorMessage = 'Failed to update machine';
      
      if (error.response?.data) {
        // Check if there are multiple validation errors
        if (error.response.data.errors && Array.isArray(error.response.data.errors)) {
          errorMessage = error.response.data.errors.join(', ');
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Update machine error:', error);
    }
  });

  // Delete machine mutation
  const deleteMachineMutation = useMutation({
    mutationFn: (id: string) => machinesAPI.deleteMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine deleted successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to delete machine';
      toast.error(errorMessage);
      console.error('Delete machine error:', error);
    }
  });

  // Book machine mutation
  const bookMachineMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => machinesAPI.bookMachine(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsBookingOpen(false);
      setBookingData({ jobId: '', until: '' });
      toast.success('Machine booked successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to book machine';
      toast.error(errorMessage);
      console.error('Book machine error:', error);
    }
  });

  // Release machine mutation
  const releaseMachineMutation = useMutation({
    mutationFn: (id: string) => machinesAPI.releaseMachine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      toast.success('Machine released successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to release machine';
      toast.error(errorMessage);
      console.error('Release machine error:', error);
    }
  });

  // Add maintenance record mutation
  const addMaintenanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => machinesAPI.addMaintenanceRecord(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['machines'] });
      setIsMaintenanceOpen(false);
      setMaintenanceData({ type: 'routine', description: '', cost: 0, notes: '' });
      toast.success('Maintenance record added successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Failed to add maintenance record';
      toast.error(errorMessage);
      console.error('Add maintenance error:', error);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      model: '',
      manufacturer: '',
      serialNumber: '',
      category: '',
      status: 'operational',
      location: '',
      specifications: {
        capacity: '',
        powerRating: '',
        dimensions: '',
        weight: 0,
        operatingTemperature: '',
        operatingPressure: ''
      },
      availability: {
        isAvailable: true,
        currentJob: null,
        bookedBy: null,
        bookedUntil: null
      },
      maintenance: {
        lastMaintenance: '',
        nextMaintenance: '',
        maintenanceInterval: 30,
        maintenanceHistory: []
      },
      purchaseInfo: {
        purchaseDate: '',
        purchasePrice: 0,
        supplier: '',
        warrantyExpiry: ''
      },
      notes: ''
    });
  };

  const handleCreate = () => {
    if (!formData.name.trim()) {
      toast.error('Please enter machine name');
      return;
    }
    if (!formData.category || formData.category === '') {
      toast.error('Please select a category');
      return;
    }
    createMachineMutation.mutate(formData);
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
      location: machine.location || '',
      specifications: {
        capacity: machine.specifications?.capacity || '',
        powerRating: machine.specifications?.powerRating || '',
        dimensions: machine.specifications?.dimensions || '',
        weight: machine.specifications?.weight || 0,
        operatingTemperature: machine.specifications?.operatingTemperature || '',
        operatingPressure: machine.specifications?.operatingPressure || ''
      },
      availability: {
        isAvailable: machine.availability?.isAvailable || true,
        currentJob: machine.availability?.currentJob || null,
        bookedBy: machine.availability?.bookedBy || null,
        bookedUntil: machine.availability?.bookedUntil || null
      },
      maintenance: {
        lastMaintenance: machine.maintenance?.lastMaintenance || '',
        nextMaintenance: machine.maintenance?.nextMaintenance || '',
        maintenanceInterval: machine.maintenance?.maintenanceInterval || 30,
        maintenanceHistory: machine.maintenance?.maintenanceHistory || []
      },
      purchaseInfo: {
        purchaseDate: machine.purchaseInfo?.purchaseDate ? new Date(machine.purchaseInfo.purchaseDate).toISOString().split('T')[0] : '',
        purchasePrice: machine.purchaseInfo?.purchasePrice || 0,
        supplier: machine.purchaseInfo?.supplier || '',
        warrantyExpiry: machine.purchaseInfo?.warrantyExpiry ? new Date(machine.purchaseInfo.warrantyExpiry).toISOString().split('T')[0] : ''
      },
      notes: machine.notes || ''
    });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (selectedMachine) {
      if (!formData.name.trim()) {
        toast.error('Please enter machine name');
        return;
      }
      if (!formData.category || formData.category === '') {
        toast.error('Please select a category');
        return;
      }
      updateMachineMutation.mutate({ id: selectedMachine._id, data: formData });
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this machine?')) {
      deleteMachineMutation.mutate(id);
    }
  };

  const handleBookMachine = (machine: any) => {
    setSelectedMachine(machine);
    setIsBookingOpen(true);
  };

  const handleReleaseMachine = (id: string) => {
    if (confirm('Are you sure you want to release this machine?')) {
      releaseMachineMutation.mutate(id);
    }
  };

  const handleAddMaintenance = (machine: any) => {
    setSelectedMachine(machine);
    setIsMaintenanceOpen(true);
  };

  const bookMachine = () => {
    if (selectedMachine) {
      bookMachineMutation.mutate({ id: selectedMachine._id, data: bookingData });
    }
  };

  const addMaintenance = () => {
    if (selectedMachine) {
      addMaintenanceMutation.mutate({ id: selectedMachine._id, data: maintenanceData });
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Machine',
      render: (machine: any) => (
        <div>
          <div className="font-medium text-gray-900">{machine.name}</div>
          <div className="text-sm text-gray-500">
            {machine.model} • {machine.manufacturer}
            {machine.serialNumber && ` • SN: ${machine.serialNumber}`}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (machine: any) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          machine.status === 'operational' ? 'bg-green-100 text-green-800' :
          machine.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' :
          machine.status === 'broken' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {(machine.status || 'unknown').toUpperCase()}
        </span>
      )
    },
    {
      key: 'availability',
      label: 'Availability',
      render: (machine: any) => (
        <div className="text-sm">
          <div className={`font-medium ${machine.availability?.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
            {machine.availability?.isAvailable ? 'Available' : 'Booked'}
          </div>
          {machine.availability?.bookedUntil && (
            <div className="text-gray-500">
              Until: {new Date(machine.availability.bookedUntil).toLocaleDateString()}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      label: 'Category'
    },
    {
      key: 'location',
      label: 'Location',
      render: (machine: any) => {
        // Handle both string and object location formats
        if (typeof machine.location === 'string') {
          return (
            <span className="text-sm text-gray-600">
              {machine.location || 'Not specified'}
            </span>
          );
        } else if (machine.location && typeof machine.location === 'object') {
          const { building, floor, room, bay } = machine.location;
          const locationParts = [building, floor, room, bay].filter(Boolean);
          return (
            <span className="text-sm text-gray-600">
              {locationParts.length > 0 ? locationParts.join(', ') : 'Not specified'}
            </span>
          );
        }
        return (
          <span className="text-sm text-gray-600">
            Not specified
          </span>
        );
      }
    },
    {
      key: 'maintenance',
      label: 'Maintenance',
      render: (machine: any) => (
        <div className="text-sm">
          <div className="font-medium">
            {machine.maintenance?.maintenanceHistory?.length || 0} Records
          </div>
          <div className="text-gray-500">
            Next: {machine.maintenance?.nextMaintenance ? 
              new Date(machine.maintenance.nextMaintenance).toLocaleDateString() : 'N/A'}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (machine: any) => (
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(machine)}
            className="text-blue-600 hover:text-blue-700"
            title="Edit Machine"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          {machine.availability?.isAvailable ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleBookMachine(machine)}
              className="text-green-600 hover:text-green-700"
              title="Book Machine"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleReleaseMachine(machine._id)}
              className="text-orange-600 hover:text-orange-700"
              title="Release Machine"
            >
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleAddMaintenance(machine)}
            className="text-purple-600 hover:text-purple-700"
            title="Add Maintenance"
          >
            <CogIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(machine._id)}
            className="text-red-600 hover:text-red-700"
            title="Delete Machine"
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">Machine Management</h2>
          <p className="text-sm text-gray-600 sm:text-base">Manage workshop machines and equipment</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
          <PlusIcon className="mr-2 h-5 w-5" />
          Add Machine
        </Button>
      </div>

      <DataTable
        data={machines}
        columns={columns}
        loading={isLoading}
      />

      {/* Create Machine Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => {
          setIsCreateOpen(false);
          resetForm();
        }}
        title="Add New Machine"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Machine Name"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, manufacturer: e.target.value }))}
            />
            <Input
              label="Serial Number"
              value={formData.serialNumber}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, serialNumber: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, category: e.target.value }))}
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
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'operational', label: 'Operational' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'broken', label: 'Broken' },
                { value: 'retired', label: 'Retired' }
              ]}
            />
          </div>
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Capacity"
              value={formData.specifications.capacity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, capacity: e.target.value }
              }))}
              placeholder="e.g., 1000kg, 500mm"
            />
            <Input
              label="Power Rating"
              value={formData.specifications.powerRating}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, powerRating: e.target.value }
              }))}
              placeholder="e.g., 5kW, 220V"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dimensions"
              value={formData.specifications.dimensions}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, dimensions: e.target.value }
              }))}
              placeholder="e.g., 2000x1500x1200mm"
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={formData.specifications.weight}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, weight: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Operating Temperature"
              value={formData.specifications.operatingTemperature}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, operatingTemperature: e.target.value }
              }))}
              placeholder="e.g., 0-40°C"
            />
            <Input
              label="Operating Pressure"
              value={formData.specifications.operatingPressure}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, operatingPressure: e.target.value }
              }))}
              placeholder="e.g., 10 bar"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseInfo.purchaseDate}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, purchaseDate: e.target.value }
              }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              value={formData.purchaseInfo.purchasePrice}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, purchasePrice: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier"
              value={formData.purchaseInfo.supplier}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, supplier: e.target.value }
              }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.purchaseInfo.warrantyExpiry}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, warrantyExpiry: e.target.value }
              }))}
            />
          </div>
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateOpen(false);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              loading={createMachineMutation.isPending}
              className="w-full sm:w-auto"
            >
              Add Machine
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Machine Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedMachine(null);
          resetForm();
        }}
        title="Edit Machine"
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Machine Name"
              value={formData.name}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              label="Model"
              value={formData.model}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, model: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Manufacturer"
              value={formData.manufacturer}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, manufacturer: e.target.value }))}
            />
            <Input
              label="Serial Number"
              value={formData.serialNumber}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, serialNumber: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, category: e.target.value }))}
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
            <Select
              label="Status"
              value={formData.status}
              onChange={(e) => setFormData((prev: any) => ({ ...prev, status: e.target.value }))}
              options={[
                { value: 'operational', label: 'Operational' },
                { value: 'maintenance', label: 'Maintenance' },
                { value: 'broken', label: 'Broken' },
                { value: 'retired', label: 'Retired' }
              ]}
            />
          </div>
          <Input
            label="Location"
            value={formData.location}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, location: e.target.value }))}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Capacity"
              value={formData.specifications.capacity}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, capacity: e.target.value }
              }))}
              placeholder="e.g., 1000kg, 500mm"
            />
            <Input
              label="Power Rating"
              value={formData.specifications.powerRating}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, powerRating: e.target.value }
              }))}
              placeholder="e.g., 5kW, 220V"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Dimensions"
              value={formData.specifications.dimensions}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, dimensions: e.target.value }
              }))}
              placeholder="e.g., 2000x1500x1200mm"
            />
            <Input
              label="Weight (kg)"
              type="number"
              value={formData.specifications.weight}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, weight: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Operating Temperature"
              value={formData.specifications.operatingTemperature}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, operatingTemperature: e.target.value }
              }))}
              placeholder="e.g., 0-40°C"
            />
            <Input
              label="Operating Pressure"
              value={formData.specifications.operatingPressure}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                specifications: { ...prev.specifications, operatingPressure: e.target.value }
              }))}
              placeholder="e.g., 10 bar"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Purchase Date"
              type="date"
              value={formData.purchaseInfo.purchaseDate}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, purchaseDate: e.target.value }
              }))}
            />
            <Input
              label="Purchase Price"
              type="number"
              value={formData.purchaseInfo.purchasePrice}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, purchasePrice: parseFloat(e.target.value) || 0 }
              }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Supplier"
              value={formData.purchaseInfo.supplier}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, supplier: e.target.value }
              }))}
            />
            <Input
              label="Warranty Expiry"
              type="date"
              value={formData.purchaseInfo.warrantyExpiry}
              onChange={(e) => setFormData((prev: any) => ({ 
                ...prev, 
                purchaseInfo: { ...prev.purchaseInfo, warrantyExpiry: e.target.value }
              }))}
            />
          </div>
          <TextArea
            label="Notes"
            value={formData.notes}
            onChange={(e) => setFormData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={3}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditOpen(false);
                setSelectedMachine(null);
                resetForm();
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              loading={updateMachineMutation.isPending}
              className="w-full sm:w-auto"
            >
              Update Machine
            </Button>
          </div>
        </div>
      </Modal>

      {/* Book Machine Modal */}
      <Modal
        isOpen={isBookingOpen}
        onClose={() => {
          setIsBookingOpen(false);
          setSelectedMachine(null);
          setBookingData({ jobId: '', until: '' });
        }}
        title="Book Machine"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Machine: {selectedMachine?.name}</h3>
            <p className="text-sm text-gray-600">
              Model: {selectedMachine?.model} • Manufacturer: {selectedMachine?.manufacturer}
            </p>
          </div>
          <Input
            label="Job ID"
            value={bookingData.jobId}
            onChange={(e) => setBookingData((prev: any) => ({ ...prev, jobId: e.target.value }))}
            required
            placeholder="Enter job ID or reference"
          />
          <Input
            label="Book Until"
            type="datetime-local"
            value={bookingData.until}
            onChange={(e) => setBookingData((prev: any) => ({ ...prev, until: e.target.value }))}
            required
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsBookingOpen(false);
                setSelectedMachine(null);
                setBookingData({ jobId: '', until: '' });
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={bookMachine}
              loading={bookMachineMutation.isPending}
              className="w-full sm:w-auto"
            >
              Book Machine
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add Maintenance Modal */}
      <Modal
        isOpen={isMaintenanceOpen}
        onClose={() => {
          setIsMaintenanceOpen(false);
          setSelectedMachine(null);
          setMaintenanceData({ type: 'routine', description: '', cost: 0, notes: '' });
        }}
        title="Add Maintenance Record"
        size="md"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Machine: {selectedMachine?.name}</h3>
            <p className="text-sm text-gray-600">
              Model: {selectedMachine?.model} • Serial: {selectedMachine?.serialNumber}
            </p>
          </div>
          <Select
            label="Maintenance Type"
            value={maintenanceData.type}
            onChange={(e) => setMaintenanceData((prev: any) => ({ ...prev, type: e.target.value }))}
            options={[
              { value: 'routine', label: 'Routine Maintenance' },
              { value: 'preventive', label: 'Preventive Maintenance' },
              { value: 'corrective', label: 'Corrective Maintenance' },
              { value: 'emergency', label: 'Emergency Repair' },
              { value: 'calibration', label: 'Calibration' },
              { value: 'inspection', label: 'Inspection' }
            ]}
          />
          <TextArea
            label="Description"
            value={maintenanceData.description}
            onChange={(e) => setMaintenanceData((prev: any) => ({ ...prev, description: e.target.value }))}
            rows={3}
            required
            placeholder="Describe the maintenance work performed..."
          />
          <Input
            label="Cost"
            type="number"
            min="0"
            step="0.01"
            value={maintenanceData.cost}
            onChange={(e) => setMaintenanceData((prev: any) => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
            placeholder="Enter maintenance cost"
          />
          <TextArea
            label="Notes"
            value={maintenanceData.notes}
            onChange={(e) => setMaintenanceData((prev: any) => ({ ...prev, notes: e.target.value }))}
            rows={2}
            placeholder="Additional notes or recommendations..."
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsMaintenanceOpen(false);
                setSelectedMachine(null);
                setMaintenanceData({ type: 'routine', description: '', cost: 0, notes: '' });
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={addMaintenance}
              loading={addMaintenanceMutation.isPending}
              className="w-full sm:w-auto"
            >
              Add Maintenance Record
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
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Resource Management</h1>
          <p className="text-sm text-gray-600 sm:text-base">Manage tools, technicians, and machines in one place</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-4" aria-label="Resource sections">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } flex items-center gap-2 border-b-2 py-2 px-1 text-sm font-medium whitespace-nowrap`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Active Tab Content */}
        <ActiveComponent />
      </div>
    </Layout>
  );
};

export default ResourceManagementPage;