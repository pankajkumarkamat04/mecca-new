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
import CustomerSelector from '@/components/ui/CustomerSelector';
import FormProductSelector from '@/components/ui/FormProductSelector';
import { quotationsAPI } from '@/lib/api';
import { customersAPI } from '@/lib/api';
import { productsAPI } from '@/lib/api';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import { z } from 'zod';

interface CreateQuotationFormProps {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any;
}

const quotationSchema = z.object({
  customer: z.string().min(1, 'Customer is required'),
  validUntil: z.string().min(1, 'Valid until date is required'),
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
  const [taxes, setTaxes] = useState<any[]>(
    initialData?.taxes || []
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
      toast.success('Quotation created successfully');
    },
    onError: (error: any) => {
      console.error('Error creating quotation:', error);
      toast.error(error.response?.data?.message || 'Failed to create quotation');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      quotationsAPI.updateQuotation(id, data),
    onSuccess: () => {
      onSuccess();
      toast.success('Quotation updated successfully');
    },
    onError: (error: any) => {
      console.error('Error updating quotation:', error);
      toast.error(error.response?.data?.message || 'Failed to update quotation');
    },
  });

  const addItem = () => {
    setItems([...items, { product: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addTax = () => {
    setTaxes([...taxes, { name: '', rate: 0, amount: 0 }]);
  };

  const removeTax = (index: number) => {
    setTaxes(taxes.filter((_, i) => i !== index));
  };

  const updateTax = (index: number, field: string, value: any) => {
    const updated = [...taxes];
    updated[index] = { ...updated[index], [field]: value };
    
    // Calculate tax amount based on subtotal
    if (field === 'rate') {
      const subtotal = calculateTotals().subtotal;
      updated[index].amount = (subtotal * value) / 100;
    }
    
    setTaxes(updated);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // If product is selected, auto-populate unit price
    if (field === 'product' && value) {
      const selectedProduct = products.find((p: any) => p._id === value);
      if (selectedProduct && selectedProduct.pricing?.sellingPrice) {
        updated[index].unitPrice = selectedProduct.pricing.sellingPrice;
      }
    }
    
    // Auto-calculate total
    const item = updated[index];
    const discountedPrice = item.unitPrice * (1 - (item.discount || 0) / 100);
    const taxAmount = discountedPrice * (item.taxRate || 0) / 100;
    item.total = (discountedPrice + taxAmount) * item.quantity;
    
    setItems(updated);
  };

  const handleSubmit = (data: QuotationFormData) => {
    console.log('CreateQuotationForm handleSubmit called with data:', data);
    console.log('Items:', items);
    console.log('Taxes:', taxes);
    
    // Validate that at least one item is selected
    const validItems = items.filter(item => item.product);
    if (validItems.length === 0) {
      toast.error('Please add at least one item to the quotation');
      return;
    }

    const submitData = {
      ...data,
      items: validItems,
      taxes: taxes.filter(tax => tax.name && tax.rate > 0),
      validUntil: new Date(data.validUntil).toISOString(),
      quotationDate: new Date().toISOString(),
      status: 'draft',
    };

    console.log('Submitting quotation data:', submitData);

    if (initialData) {
      updateMutation.mutate({ id: initialData._id, data: submitData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  const calculateTotals = () => {
    // Convert items to price calculator format
    const priceItems = items.filter(item => item.product).map(item => ({
      product: products.find((p: any) => p._id === item.product),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      taxRate: item.taxRate || 0
    }));

    // Convert additional taxes to price calculator format
    const additionalTaxes = taxes.filter(tax => tax.name && tax.rate > 0).map(tax => ({
      name: tax.name,
      rate: tax.rate,
      description: `Additional ${tax.name} tax`
    }));

    // Use universal price calculator
    const calculation = calculatePrice(priceItems, [], additionalTaxes);

    return calculation;
  };

  const totals = calculateTotals();

  const defaultValues = initialData ? {
    customer: typeof initialData.customer === 'string' 
      ? initialData.customer 
      : initialData.customer?._id || '',
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
    <Form schema={quotationSchema} defaultValues={defaultValues}>
      {(methods) => (
        <div className="space-y-6">
          <FormSection title="Quotation Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer *</label>
                <CustomerSelector
                  value={(() => {
                    const customerValue = methods.watch('customer');
                    if (typeof customerValue === 'string') return customerValue;
                    if (typeof customerValue === 'object' && customerValue && '_id' in customerValue) return (customerValue as any)._id;
                    return '';
                  })()}
                  onChange={(id) => methods.setValue('customer', id, { shouldValidate: true })}
                />
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
                  name="validUntil"
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
                  name="notes"
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
                  name="terms"
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
                      <FormProductSelector
                        value={item.product}
                        onChange={(value) => updateItem(index, 'product', value)}
                        placeholder="Select a product"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity *
                      </label>
                      <input
                        name={`quantity-${index}`}
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Unit Price *
                      </label>
                      <input
                        name={`unitPrice-${index}`}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
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

          <FormSection title="Additional Taxes">
            <div className="space-y-4">
              {taxes.map((tax, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tax Name
                      </label>
                      <input
                        type="text"
                        value={tax.name}
                        onChange={(e) => updateTax(index, 'name', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        placeholder="e.g., VAT, Sales Tax"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rate %
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={tax.rate}
                        onChange={(e) => updateTax(index, 'rate', parseFloat(e.target.value) || 0)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={tax.amount}
                        readOnly
                        className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm sm:text-sm"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTax(index)}
                      >
                        <TrashIcon className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                onClick={addTax}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Tax
              </Button>
            </div>
          </FormSection>

          <FormSection title="Price Summary">
            <PriceSummary 
              calculation={totals} 
              showBreakdown={true}
              showItems={true}
              title=""
            />
          </FormSection>

          <FormActions
            onCancel={onClose}
            onSubmit={() => {
              // Validate form first
              methods.trigger().then((isValid) => {
                if (isValid) {
                  const formData = methods.getValues();
                  handleSubmit(formData);
                } else {
                  toast.error('Please fill in all required fields');
                }
              });
            }}
            submitText={initialData ? 'Update Quotation' : 'Create Quotation'}
            loading={createMutation.isPending || updateMutation.isPending}
          />
        </div>
      )}
    </Form>
  );
};

export default CreateQuotationForm;
