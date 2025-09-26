'use client';

import React, { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { Form, FormActions, FormSection } from '@/components/ui/Form';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { quotationsAPI } from '@/lib/api';
import { customersAPI } from '@/lib/api';
import { productsAPI } from '@/lib/api';
import { z } from 'zod';

interface CreateQuotationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const quotationSchema = z.object({
  customer: z.string().min(1, 'Customer is required'),
  validUntil: z.string().min(1, 'Valid until date is required'),
  items: z.array(z.object({
    product: z.string().min(1, 'Product is required'),
    quantity: z.number().min(1, 'Quantity must be at least 1'),
    unitPrice: z.number().min(0, 'Unit price must be positive'),
    discount: z.number().min(0).max(100).optional(),
    taxRate: z.number().min(0).max(100).optional(),
  })).min(1, 'At least one item is required'),
  notes: z.string().optional(),
  terms: z.string().optional(),
});

type QuotationFormData = z.infer<typeof quotationSchema>;

const CreateQuotationForm: React.FC<CreateQuotationFormProps> = ({
  onClose,
  onSuccess,
  initialData,
}) => {
  const [items, setItems] = useState<any[]>(
    initialData?.items || [{ product: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]
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

  const customers = customersData?.data?.data || customersData?.data || [];
  const products = productsData?.data?.data || productsData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: any) => quotationsAPI.createQuotation(data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('Error creating quotation:', error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      quotationsAPI.updateQuotation(id, data),
    onSuccess: () => {
      onSuccess();
    },
    onError: (error) => {
      console.error('Error updating quotation:', error);
    },
  });

  const addItem = () => {
    setItems([...items, { product: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Auto-calculate total
    const item = updated[index];
    const discountedPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
    const taxAmount = discountedPrice * (item.taxRate || 0) / 100;
    item.total = (discountedPrice + taxAmount) * item.quantity;
    
    setItems(updated);
  };

  const handleSubmit = (data: QuotationFormData) => {
    const submitData = {
      ...data,
      items: items.filter(item => item.product),
      validUntil: new Date(data.validUntil).toISOString(),
      quotationDate: new Date().toISOString(),
      status: 'draft',
    };

    if (initialData) {
      updateMutation.mutate({ id: initialData._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * (item.discount || 0) / 100);
    }, 0);
    const totalTax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const discountedAmount = itemSubtotal * (1 - (item.discount || 0) / 100);
      return sum + (discountedAmount * (item.taxRate || 0) / 100);
    }, 0);
    const total = subtotal - totalDiscount + totalTax;

    return { subtotal, totalDiscount, totalTax, total };
  };

  const totals = calculateTotals();

  const defaultValues = initialData ? {
    customer: initialData.customer._id || initialData.customer,
    validUntil: initialData.validUntil ? 
      new Date(initialData.validUntil).toISOString().split('T')[0] : '',
    notes: initialData.notes || '',
    terms: initialData.terms || '',
  } : {
    customer: '',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: '',
    terms: '',
  };

  return (
    <Form schema={quotationSchema} onSubmit={handleSubmit} defaultValues={defaultValues}>
      {(methods) => (
        <div className="space-y-6">
          <FormSection title="Quotation Details">
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
                  {Array.isArray(customers) ? customers.map((customer: any) => (
                    <option key={customer._id} value={customer._id}>
                      {customer.firstName} {customer.lastName} ({customer.email})
                    </option>
                  )) : null}
                </select>
                {methods.formState.errors.customer && (
                  <p className="mt-1 text-sm text-red-600">
                    {methods.formState.errors.customer.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valid Until *
                </label>
                <input
                  {...methods.register('validUntil')}
                  type="date"
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                />
                {methods.formState.errors.validUntil && (
                  <p className="mt-1 text-sm text-red-600">
                    {methods.formState.errors.validUntil.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  {...methods.register('notes')}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Quotation notes"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  {...methods.register('terms')}
                  rows={3}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Terms and conditions"
                />
              </div>
            </div>
          </FormSection>

          <FormSection title="Items">
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Product *
                      </label>
                      <select
                        value={item.product}
                        onChange={(e) => updateItem(index, 'product', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">Select a product</option>
                        {Array.isArray(products) ? products.map((product: any) => (
                          <option key={product._id} value={product._id}>
                            {product.name} ({product.sku}) - ${product.pricing?.sellingPrice || 0}
                          </option>
                        )) : null}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Discount %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => updateItem(index, 'discount', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    Total: ${item.total?.toFixed(2) || '0.00'}
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addItem}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </FormSection>

          <FormSection title="Totals">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>${totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Discount:</span>
                <span>-${totals.totalDiscount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Tax:</span>
                <span>${totals.totalTax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-semibold border-t pt-2 mt-2">
                <span>Total:</span>
                <span>${totals.total.toFixed(2)}</span>
              </div>
            </div>
          </FormSection>

          <FormActions
            onCancel={onClose}
            submitText={initialData ? 'Update Quotation' : 'Create Quotation'}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}
    </Form>
  );
};

export default CreateQuotationForm;
