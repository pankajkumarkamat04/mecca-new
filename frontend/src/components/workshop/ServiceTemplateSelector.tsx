import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { serviceTemplateAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ServiceTemplate {
  _id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number;
  estimatedCost: number;
  priority: string;
  requiredTools: Array<{
    name: string;
    quantity: number;
    optional: boolean;
  }>;
  requiredParts: Array<{
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
}

interface ServiceTemplateSelectorProps {
  onSelect: (template: ServiceTemplate | null) => void;
  selectedTemplate?: ServiceTemplate | null;
  disabled?: boolean;
}

const ServiceTemplateSelector: React.FC<ServiceTemplateSelectorProps> = ({
  onSelect,
  selectedTemplate,
  disabled = false
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  // Fetch service templates
  const { data: templatesData, isLoading } = useQuery({
    queryKey: ['serviceTemplates', searchQuery, selectedCategory],
    queryFn: () => serviceTemplateAPI.getServiceTemplates({
      search: searchQuery,
      category: selectedCategory,
      limit: 50
    }),
    enabled: isModalOpen,
  });

  const templates = templatesData?.data?.data?.serviceTemplates || [];

  const categories = [
    { value: '', label: 'All Categories' },
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

  const handleSelect = (template: ServiceTemplate) => {
    onSelect(template);
    setIsModalOpen(false);
    setSearchQuery('');
    setSelectedCategory('');
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <>
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          Service Template
        </label>
        <div className="flex space-x-2">
          <div className="flex-1">
            <Input
              value={selectedTemplate?.name || ''}
              placeholder="Select a service template..."
              readOnly
              disabled={disabled}
            />
          </div>
          <Button
            variant="outline"
            onClick={() => setIsModalOpen(true)}
            disabled={disabled}
          >
            {selectedTemplate ? 'Change' : 'Select'}
          </Button>
          {selectedTemplate && (
            <Button
              variant="outline"
              onClick={() => onSelect(null)}
              disabled={disabled}
              className="text-red-600 hover:text-red-700"
            >
              Clear
            </Button>
          )}
        </div>
        {selectedTemplate && (
          <div className="text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>Duration: {formatDuration(selectedTemplate.estimatedDuration)}</span>
              <span>Priority: 
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(selectedTemplate.priority)}`}>
                  {selectedTemplate.priority.toUpperCase()}
                </span>
              </span>
              {selectedTemplate.estimatedCost > 0 && (
                <span>Est. Cost: ${selectedTemplate.estimatedCost}</span>
              )}
            </div>
            {selectedTemplate.description && (
              <p className="mt-1">{selectedTemplate.description}</p>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Service Template"
        size="lg"
      >
        <div className="space-y-4">
          {/* Search and Filter */}
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

          {/* Templates List */}
          <div className="max-h-96 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600">No service templates found</p>
              </div>
            ) : (
              templates.map((template: ServiceTemplate) => (
                <div
                  key={template._id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-sm cursor-pointer transition-all"
                  onClick={() => handleSelect(template)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="font-medium text-gray-900">{template.name}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(template.priority)}`}>
                          {template.priority.toUpperCase()}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {template.category.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                        <span>Duration: {formatDuration(template.estimatedDuration)}</span>
                        {template.estimatedCost > 0 && (
                          <span>Est. Cost: ${template.estimatedCost}</span>
                        )}
                        <span>Tasks: {template.tasks?.length || 0}</span>
                        <span>Parts: {template.requiredParts?.length || 0}</span>
                        <span>Tools: {template.requiredTools?.length || 0}</span>
                      </div>
                    </div>
                    <div className="ml-4">
                      <CheckIcon className="h-5 w-5 text-blue-600" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default ServiceTemplateSelector;
