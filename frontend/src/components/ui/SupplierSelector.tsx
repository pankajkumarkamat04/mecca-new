'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { suppliersAPI } from '@/lib/api';
import { MagnifyingGlassIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Supplier {
  _id: string;
  name: string;
  code: string;
  contactPerson?: {
    firstName: string;
    lastName: string;
    fullName: string;
    email: string;
    phone: string;
  };
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  isActive: boolean;
}

interface SupplierSelectorProps {
  selectedSupplier: Supplier | null;
  onSupplierSelect: (supplier: Supplier | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const SupplierSelector: React.FC<SupplierSelectorProps> = ({
  selectedSupplier,
  onSupplierSelect,
  placeholder = "Select a supplier...",
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch suppliers
  const { data: suppliersData, isLoading } = useQuery({
    queryKey: ['suppliers', { search: searchTerm }],
    queryFn: () => suppliersAPI.getSuppliers({ 
      search: searchTerm,
      limit: 50,
      page: 1 
    }),
    enabled: true // Always fetch suppliers
  });

  const suppliers = suppliersData?.data?.data || [];

  // Filter suppliers based on search term
  const filteredSuppliers = suppliers.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.contactPerson?.email && supplier.contactPerson.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.contactPerson?.fullName && supplier.contactPerson.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (supplier.code && supplier.code.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (supplier: Supplier) => {
    onSupplierSelect(supplier);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onSupplierSelect(null);
    setSearchTerm('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Supplier Display */}
      <div
        className={`
          w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm cursor-pointer
          focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
          ${isOpen ? 'ring-2 ring-red-500 border-red-500' : ''}
        `}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        {selectedSupplier ? (
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">{selectedSupplier.name}</div>
              <div className="text-sm text-gray-500">
                {typeof selectedSupplier.contactPerson === 'object' 
                  ? selectedSupplier.contactPerson?.fullName 
                  : selectedSupplier.contactPerson} • {typeof selectedSupplier.contactPerson === 'object' 
                    ? selectedSupplier.contactPerson?.email 
                    : selectedSupplier.email}
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
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Suppliers List */}
          <div className="py-1">
            {isLoading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading suppliers...</div>
            ) : filteredSuppliers.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">
                {searchTerm ? 'No suppliers found' : 'No suppliers available'}
              </div>
            ) : (
              filteredSuppliers.map((supplier: Supplier) => (
                <div
                  key={supplier._id}
                  className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
                  onClick={() => handleSelect(supplier)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{supplier.name}</div>
                    <div className="text-sm text-gray-500">
                      {typeof supplier.contactPerson === 'object' 
                        ? supplier.contactPerson?.fullName 
                        : supplier.contactPerson} • {typeof supplier.contactPerson === 'object' 
                          ? supplier.contactPerson?.email 
                          : supplier.email}
                    </div>
                    {(typeof supplier.contactPerson === 'object' ? supplier.contactPerson?.phone : supplier.phone) && (
                      <div className="text-xs text-gray-400">
                        {typeof supplier.contactPerson === 'object' ? supplier.contactPerson?.phone : supplier.phone}
                      </div>
                    )}
                  </div>
                  {selectedSupplier?._id === supplier._id && (
                    <CheckIcon className="h-4 w-4 text-red-600" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && !disabled && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};

export default SupplierSelector;
