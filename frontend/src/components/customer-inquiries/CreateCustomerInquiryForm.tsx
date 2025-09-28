'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Form, FormActions, FormSection } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { customerInquiriesAPI } from '@/lib/api';
import { customersAPI } from '@/lib/api';
import { productsAPI } from '@/lib/api';
import { z } from 'zod';

interface CreateCustomerInquiryFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const inquirySchema = z.object({
  customer: z.string().min(1, 'Customer is required'),
  subject: z.string().min(1, 'Subject is required').max(200, 'Subject must be less than 200 characters'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message must be less than 1000 characters'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']),
  productsOfInterest: z.array(z.object({
    product: z.string().min(1, 'Product is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1').optional(),
    notes: z.string().max(500, 'Notes must be less than 500 characters').optional(),
  })).optional(),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
  followUpDate: z.string().optional(),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

const CreateCustomerInquiryForm: React.FC<CreateCustomerInquiryFormProps> = ({
  onClose,
  onSuccess,
  initialData,
}) => {
  const [productsOfInterest, setProductsOfInterest] = useState<any[]>(
    initialData?.productsOfInterest || [{ product: '', quantity: 1, notes: '' }]
  );

  // Fetch customers and products
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.getCustomers({ limit: 100 }),
  });

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsAPI.getProducts({ limit: 100 }),
  });

  const customers = Array.isArray(customersData?.data?.data) 
    ? customersData.data.data 
    : Array.isArray(customersData?.data) 
    ? customersData.data 
    : [];
  const products = Array.isArray(productsData?.data?.data) 
    ? productsData.data.data 
    : Array.isArray(productsData?.data) 
    ? productsData.data 
    : [];

  const createMutation = useMutation({
    mutationFn: (data: any) => customerInquiriesAPI.createCustomerInquiry(data),
    onSuccess: () => {
      onSuccess();
      toast.success('Customer inquiry created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating inquiry:', error);
      toast.error(error.response?.data?.message || 'Failed to create customer inquiry');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      customerInquiriesAPI.updateCustomerInquiry(id, data),
    onSuccess: () => {
      onSuccess();
      toast.success('Customer inquiry updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating inquiry:', error);
      toast.error(error.response?.data?.message || 'Failed to update customer inquiry');
    },
  });

  const handleSubmit = (data: InquiryFormData) => {
    const submitData = {
      ...data,
      productsOfInterest: productsOfInterest.filter(item => item.product),
      followUpDate: data.followUpDate ? new Date(data.followUpDate).toISOString() : undefined,
    };

    if (initialData) {
      updateMutation.mutate({ id: initialData._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const addProductInterest = () => {
    setProductsOfInterest([...productsOfInterest, { product: '', quantity: 1, notes: '' }]);
  };

  const removeProductInterest = (index: number) => {
    setProductsOfInterest(productsOfInterest.filter((_, i) => i !== index));
  };

  const updateProductInterest = (index: number, field: string, value: any) => {
    const updated = [...productsOfInterest];
    updated[index] = { ...updated[index], [field]: value };
    setProductsOfInterest(updated);
  };

  const defaultValues = initialData ? {
    customer: initialData.customer._id || initialData.customer,
    subject: initialData.subject,
    message: initialData.message || initialData.description,
    priority: initialData.priority,
    notes: initialData.notes || initialData.internalNotes,
    followUpDate: initialData.followUpDate ? 
      new Date(initialData.followUpDate).toISOString().split('T')[0] : '',
  } : {
    customer: '',
    subject: '',
    message: '',
    priority: 'normal',
    notes: '',
    followUpDate: '',
  };

  return (
    <Form schema={inquirySchema} onSubmit={handleSubmit} defaultValues={defaultValues}>
      {(methods) => (
        <div className="space-y-6">
          <FormSection title="Inquiry Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer *
                </label>
                <select
                  {...methods.register('customer')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer: any) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.firstName} {customer.lastName} ({customer.email})
                    </option>
                  ))}
                </select>
                {methods.formState.errors.customer && (
                  <p className="mt-1 text-sm text-red-600">
                    {methods.formState.errors.customer.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  {...methods.register('priority')}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject *
              </label>
              <input
                {...methods.register('subject')}
                type="text"
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter inquiry subject"
              />
              {methods.formState.errors.subject && (
                <p className="mt-1 text-sm text-red-600">
                  {methods.formState.errors.subject.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message *
              </label>
              <textarea
                {...methods.register('message')}
                rows={4}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="Enter inquiry message"
              />
              {methods.formState.errors.message && (
                <p className="mt-1 text-sm text-red-600">
                  {methods.formState.errors.message.message}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Follow-up Date
                </label>
                <input
                  {...methods.register('followUpDate')}
                  type="date"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  {...methods.register('notes')}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Internal notes"
                />
                {methods.formState.errors.notes && (
                  <p className="mt-1 text-sm text-red-600">
                    {methods.formState.errors.notes.message}
                  </p>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection title="Products of Interest">
            <div className="space-y-4">
              {productsOfInterest.map((item, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product
                    </label>
                    <select
                      value={item.product}
                      onChange={(e) => updateProductInterest(index, 'product', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="">Select a product</option>
                      {products.map((product: any) => (
                        <option key={product._id} value={product._id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateProductInterest(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateProductInterest(index, 'notes', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Product-specific notes"
                    />
                  </div>

                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeProductInterest(index)}
                      disabled={productsOfInterest.length === 1}
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addProductInterest}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Product Interest
              </Button>
            </div>
          </FormSection>

          <FormActions
            onCancel={onClose}
            submitText={initialData ? 'Update Inquiry' : 'Create Inquiry'}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}
    </Form>
  );
};

export default CreateCustomerInquiryForm;