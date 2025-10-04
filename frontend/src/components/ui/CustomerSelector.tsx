'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import Input from './Input';
import Button from './Button';
import Modal from './Modal';
import { MagnifyingGlassIcon, PlusIcon, UserIcon, PhoneIcon, EnvelopeIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
  company?: string;
}

interface CustomerSelectorProps {
  value?: string;
  onChange: (customerId: string, customer?: Customer) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

const CustomerSelector: React.FC<CustomerSelectorProps> = ({
  value,
  onChange,
  placeholder = "Search customers...",
  label = "Customer",
  required = false,
  disabled = false
}) => {
  const { hasPermission } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    company: ''
  });
  
  const queryClient = useQueryClient();
  
  // Check if user can create customers
  const canCreateCustomer = hasPermission('customers', 'create');

  // Handle escape key for customer selection modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Handle escape key for create customer modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showCreateModal) {
        setShowCreateModal(false);
        setCreateFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          company: ''
        });
      }
    };

    if (showCreateModal) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [showCreateModal]);

  // Fetch customers with search
  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers', searchTerm],
    queryFn: () => customersAPI.getCustomers({ 
      limit: 50, 
      search: searchTerm || undefined 
    }),
    enabled: isOpen
  });

  // Create customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: (data: any) => customersAPI.createCustomer(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      const newCustomer = response.data.data;
      setSelectedCustomer(newCustomer);
      onChange(newCustomer._id, newCustomer);
      setShowCreateModal(false);
      setIsOpen(false);
      setCreateFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        company: ''
      });
      toast.success('Customer created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create customer');
    }
  });

  const customers = customersData?.data?.data || [];

  // Filter customers based on search term
  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    
    const term = searchTerm.toLowerCase();
    return customers.filter((customer: Customer) => 
      customer.firstName.toLowerCase().includes(term) ||
      customer.lastName.toLowerCase().includes(term) ||
      customer.email.toLowerCase().includes(term) ||
      customer.phone.includes(term) ||
      (customer.company && customer.company.toLowerCase().includes(term))
    );
  }, [customers, searchTerm]);

  // Load selected customer when value changes
  useEffect(() => {
    if (value && customers.length > 0) {
      const customer = customers.find((c: Customer) => c._id === value);
      if (customer) {
        setSelectedCustomer(customer);
      }
    } else if (!value) {
      setSelectedCustomer(null);
    }
  }, [value, customers]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    onChange(customer._id, customer);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleCreateCustomer = () => {
    if (!createFormData.firstName || !createFormData.lastName) {
      toast.error('First name and last name are required');
      return;
    }
    
    createCustomerMutation.mutate(createFormData);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    onChange('', undefined);
  };

  const displayValue = selectedCustomer 
    ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` 
    : '';

  return (
    <div className="relative">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="relative">
          <div className="flex">
            <div className="flex-1 relative">
              <Input
                value={displayValue}
                onChange={() => {}} // Controlled by the dropdown
                onClick={() => !disabled && setIsOpen(true)}
                placeholder={placeholder}
                readOnly
                disabled={disabled}
                className="cursor-pointer"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              </div>
            </div>
            
            {selectedCustomer && !disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClearSelection}
                className="ml-2"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Customer Selection Dropdown */}
      <div className={isOpen ? 'fixed inset-0 z-[60] overflow-y-auto' : 'hidden'}>
        <div className="flex min-h-full items-center justify-center text-center p-4 sm:p-0">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => {
              setIsOpen(false);
              setSearchTerm('');
            }}
          />

          {/* Modal panel */}
          <div className="relative transform overflow-hidden bg-white text-left shadow-xl transition-all w-full max-w-lg">
            {/* Header */}
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Select Customer
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                {/* Search Input */}
                <div className="relative">
                  <Input
                    placeholder="Search by name, email, phone, or company..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    fullWidth
                  />
                  <MagnifyingGlassIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                </div>

                {/* Create New Customer Button - Only show if user has permission */}
                {canCreateCustomer && (
                  <div className="flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Customer
                    </Button>
                  </div>
                )}

                {/* Customer List */}
                <div className="max-h-96 overflow-y-auto">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                  ) : filteredCustomers.length > 0 ? (
                    <div className="space-y-2">
                      {filteredCustomers.map((customer: any) => (
                        <div
                          key={customer._id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center">
                                <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                                <div>
                                  <h4 className="font-medium text-gray-900">
                                    {typeof customer.firstName === 'string' ? customer.firstName : ''} {typeof customer.lastName === 'string' ? customer.lastName : ''}
                                  </h4>
                                  {customer.company && (
                                    <p className="text-sm text-gray-600">{typeof customer.company === 'string' ? customer.company : ''}</p>
                                  )}
                                </div>
                              </div>
                              
                              <div className="mt-2 space-y-1">
                                {customer.email && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <EnvelopeIcon className="h-4 w-4 mr-2" />
                                    {typeof customer.email === 'string' ? customer.email : ''}
                                  </div>
                                )}
                                {customer.phone && (
                                  <div className="flex items-center text-sm text-gray-600">
                                    <PhoneIcon className="h-4 w-4 mr-2" />
                                    {typeof customer.phone === 'string' ? customer.phone : ''}
                                  </div>
                                )}
                                {customer.address && (
                                  <div className="text-sm text-gray-600">
                                    {typeof customer.address === 'string' ? customer.address : ''}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {value === customer._id && (
                              <div className="ml-4">
                                <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <UserIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500 mb-4">
                        {searchTerm ? 'No customers found matching your search' : 'No customers available'}
                      </p>
                      {canCreateCustomer && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowCreateModal(true)}
                          className="flex items-center mx-auto"
                        >
                          <PlusIcon className="h-4 w-4 mr-2" />
                          Create New Customer
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Create Customer Modal */}
      <div className={showCreateModal ? 'fixed inset-0 z-[70] overflow-y-auto' : 'hidden'}>
        <div className="flex min-h-full items-center justify-center text-center p-4 sm:p-0">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
            onClick={() => {
              setShowCreateModal(false);
              setCreateFormData({
                firstName: '',
                lastName: '',
                email: '',
                phone: '',
                address: '',
                company: ''
              });
            }}
          />

          {/* Modal panel */}
          <div className="relative transform overflow-hidden bg-white text-left shadow-xl transition-all w-full max-w-md">
            {/* Header */}
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    Create New Customer
                  </h3>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateFormData({
                      firstName: '',
                      lastName: '',
                      email: '',
                      phone: '',
                      address: '',
                      company: ''
                    });
                  }}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="px-4 pb-4 sm:px-6 sm:pb-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={createFormData.firstName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    fullWidth
                  />
                  <Input
                    label="Last Name"
                    value={createFormData.lastName}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    fullWidth
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={createFormData.email}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, email: e.target.value }))}
                    fullWidth
                  />
                  <Input
                    label="Phone"
                    value={createFormData.phone}
                    onChange={(e) => setCreateFormData(prev => ({ ...prev, phone: e.target.value }))}
                    fullWidth
                  />
                </div>
                
                <Input
                  label="Company"
                  value={createFormData.company}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, company: e.target.value }))}
                  fullWidth
                />
                
                <Input
                  label="Address"
                  value={createFormData.address}
                  onChange={(e) => setCreateFormData(prev => ({ ...prev, address: e.target.value }))}
                  fullWidth
                />

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    disabled={createCustomerMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateCustomer}
                    disabled={createCustomerMutation.isPending || !createFormData.firstName || !createFormData.lastName}
                  >
                    {createCustomerMutation.isPending ? 'Creating...' : 'Create Customer'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerSelector;
