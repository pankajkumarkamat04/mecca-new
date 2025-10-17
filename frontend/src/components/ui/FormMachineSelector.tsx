'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { machinesAPI } from '@/lib/api';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Machine {
  _id: string;
  name: string;
  machineNumber?: string;
  type: string;
  status: string;
  location?: string;
  specifications?: any;
  availability: {
    isAvailable: boolean;
    bookedUntil?: string;
  };
}

interface FormMachineSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

const FormMachineSelector: React.FC<FormMachineSelectorProps> = ({
  value,
  onChange,
  placeholder = "Select a machine...",
  disabled = false,
  className = "",
  error
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch machines
  const { data: machinesData, isLoading } = useQuery({
    queryKey: ['machines', { search: searchTerm }],
    queryFn: () => machinesAPI.getMachines(),
    enabled: true // Always fetch machines
  });

  const machines = machinesData?.data?.data?.machines || [];
  const selectedMachine = machines.find((m: Machine) => m._id === value);

  // Filter machines based on search term
  const filteredMachines = machines.filter((machine: Machine) =>
    machine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (machine.machineNumber && machine.machineNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
    machine.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelect = (machine: Machine) => {
    onChange(machine._id);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'operational':
        return 'text-green-600';
      case 'maintenance':
        return 'text-yellow-600';
      case 'out_of_order':
        return 'text-red-600';
      case 'idle':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getAvailabilityColor = (isAvailable: boolean) => {
    return isAvailable ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Machine Display */}
      <div
        className={`
          w-full px-3 py-2 border rounded-md cursor-pointer
          ${error ? 'border-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white hover:border-gray-400'}
          ${isOpen ? 'ring-2 ring-red-500 border-red-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedMachine ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{selectedMachine.name}</div>
              <div className="text-sm text-gray-500">
                {selectedMachine.machineNumber && `Machine #: ${selectedMachine.machineNumber} • `}
                Type: {selectedMachine.type}
              </div>
              <div className="text-sm text-gray-600">
                Status: <span className={getStatusColor(selectedMachine.status)}>
                  {selectedMachine.status}
                </span>
                {selectedMachine.location && ` • Location: ${selectedMachine.location}`}
              </div>
              <div className="text-sm text-gray-600">
                Availability: <span className={getAvailabilityColor(selectedMachine.availability?.isAvailable)}>
                  {selectedMachine.availability?.isAvailable ? 'Available' : 'Booked'}
                </span>
                {selectedMachine.availability?.bookedUntil && (
                  <span className="text-gray-500">
                    {' '}(Until: {new Date(selectedMachine.availability.bookedUntil).toLocaleDateString()})
                  </span>
                )}
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
                placeholder="Search machines..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Machines List */}
          <div className="py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading machines...</div>
            ) : filteredMachines.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No machines found' : 'No machines available'}
              </div>
            ) : (
              filteredMachines.map((machine: Machine) => (
                <div
                  key={machine._id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSelect(machine)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{machine.name}</div>
                    <div className="text-sm text-gray-500">
                      {machine.machineNumber && `Machine #: ${machine.machineNumber} • `}
                      Type: {machine.type}
                    </div>
                    <div className="text-sm text-gray-600">
                      Status: <span className={getStatusColor(machine.status)}>
                        {machine.status}
                      </span>
                      {machine.location && ` • Location: ${machine.location}`}
                    </div>
                    <div className="text-sm text-gray-600">
                      Availability: <span className={getAvailabilityColor(machine.availability?.isAvailable)}>
                        {machine.availability?.isAvailable ? 'Available' : 'Booked'}
                      </span>
                      {machine.availability?.bookedUntil && (
                        <span className="text-gray-500">
                          {' '}(Until: {new Date(machine.availability.bookedUntil).toLocaleDateString()})
                        </span>
                      )}
                    </div>
                  </div>
                  {selectedMachine?._id === machine._id && (
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

export default FormMachineSelector;
