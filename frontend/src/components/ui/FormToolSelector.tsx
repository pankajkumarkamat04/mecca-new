'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { toolsAPI } from '@/lib/api';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Tool {
  _id: string;
  name: string;
  toolNumber?: string;
  category: string;
  condition: string;
  location?: string;
  specifications?: any;
  availability: {
    isAvailable: boolean;
  };
}

interface FormToolSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

const FormToolSelector: React.FC<FormToolSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select a tool...",
  disabled = false,
  className = "",
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch tools
  const { data: toolsData, isLoading } = useQuery({
    queryKey: ['tools', { search: searchTerm }],
    queryFn: () => toolsAPI.getTools(),
    enabled: true // Always fetch tools
  });

  const tools = toolsData?.data?.data?.tools || [];
  const selectedTool = tools.find((t: Tool) => t._id === value);

  // Filter tools based on search term
  const filteredTools = tools.filter((tool: Tool) =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tool.toolNumber && tool.toolNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    tool.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (tool: Tool) => {
    onChange(tool._id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const getConditionColor = (condition: string) => {
    switch (condition?.toLowerCase()) {
      case 'excellent':
        return 'text-green-600';
      case 'good':
        return 'text-blue-600';
      case 'fair':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const formatLocation = (loc: any) => {
    if (!loc) return '';
    const parts = [loc.storageArea, loc.shelf, loc.bin].filter(Boolean);
    return parts.join(' / ');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Tool Display */}
      <div
        className={`
          w-full px-3 py-2 border rounded-md cursor-pointer
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-red-500 border-red-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedTool ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{selectedTool.name}</div>
              <div className="text-sm text-gray-500">
                {selectedTool.toolNumber && `Tool #: ${selectedTool.toolNumber} • `}
                Category: {selectedTool.category}
              </div>
              <div className="text-sm text-gray-600">
                Condition: <span className={getConditionColor(selectedTool.condition)}>
                  {selectedTool.condition}
                </span>
                {selectedTool.location && ` • Location: ${formatLocation(selectedTool.location)}`}
              </div>
              <div className="text-sm text-gray-600">
                Status: <span className={selectedTool.availability?.isAvailable ? 'text-green-600' : 'text-red-600'}>
                  {selectedTool.availability?.isAvailable ? 'Available' : 'In Use'}
                </span>
              </div>
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClear();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        ) : (
          <div className="text-gray-500">{placeholder}</div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Search tools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Tools List */}
          <div className="py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading tools...</div>
            ) : filteredTools.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No tools found' : 'No tools available'}
              </div>
            ) : (
              filteredTools.map((tool: Tool) => (
                <div
                  key={tool._id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSelect(tool)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{tool.name}</div>
                    <div className="text-sm text-gray-500">
                      {tool.toolNumber && `Tool #: ${tool.toolNumber} • `}
                      Category: {tool.category}
                    </div>
                    <div className="text-sm text-gray-600">
                      Condition: <span className={getConditionColor(tool.condition)}>
                        {tool.condition}
                      </span>
                      {tool.location && ` • Location: ${formatLocation(tool.location)}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: <span className={tool.availability?.isAvailable ? 'text-green-600' : 'text-red-600'}>
                        {tool.availability?.isAvailable ? 'Available' : 'In Use'}
                      </span>
                    </div>
                  </div>
                  {selectedTool?._id === tool._id && (
                    <CheckIcon className="h-4 w-4 text-red-600 inline-block ml-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FormToolSelector;
