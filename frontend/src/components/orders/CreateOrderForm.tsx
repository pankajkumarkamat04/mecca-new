'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersAPI, productsAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import CustomerSelector from '@/components/ui/CustomerSelector';
import FormProductSelector from '@/components/ui/FormProductSelector';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { formatCurrency } from '@/lib/utils';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

interface CreateOrderFormProps {
  onClose: () => void;
  onSuccess: (order: any) => void;
  initialData?: any;
}

const CreateOrderForm: React.FC<CreateOrderFormProps> = ({ onClose, onSuccess, initialData }) => {
  const [formData, setFormData] = useState({
    customer: initialData?.customer || '',
    expectedDeliveryDate: initialData?.expectedDeliveryDate || '',
    shippingMethod: initialData?.shippingMethod || 'pickup',
    paymentMethod: initialData?.paymentMethod || 'cash',
    priority: initialData?.priority || 'normal',
    source: initialData?.source || 'pos',
    notes: initialData?.notes || '',
    internalNotes: initialData?.internalNotes || '',
    tags: initialData?.tags || [],
    items: initialData?.items || [{
      product: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
      notes: '',
      name: '',
      sku: '',
      description: '',
      total: 0
    }], // Start with one default empty item
  });

  const [newItem, setNewItem] = useState({
    product: '',
    quantity: 1,
    unitPrice: 0,
    discount: 0,
    taxRate: 0,
    notes: ''
  });

  // Fetch customers
  const { data: customersData } = useQuery({
    queryKey: ['customers-for-order'],
    queryFn: () => customersAPI.getCustomers({ page: 1, limit: 100 })
  });

  // Fetch products
  const { data: productsData } = useQuery({
    queryKey: ['products-for-order'],
    queryFn: () => productsAPI.getProducts({ page: 1, limit: 100 })
  });

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...formData.items];
    const updatedItem = {
      ...updatedItems[index],
      [field]: value
    };

    // If product is being changed, auto-fill price and product details
    if (field === 'product' && value) {
      const product = productsData?.data?.data?.find((p: any) => p._id === value);
      if (product) {
        updatedItem.unitPrice = product.pricing?.salePrice || product.pricing?.sellingPrice || 0;
        updatedItem.name = product.name;
        updatedItem.sku = product.sku;
        updatedItem.description = product.description;
        updatedItem.taxRate = product.pricing?.taxRate || 0;
      }
    }

    updatedItems[index] = updatedItem;
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleAddItem = () => {
    // Add a new empty item to the list
    const newEmptyItem = {
      product: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      taxRate: 0,
      notes: '',
      name: '',
      sku: '',
      description: '',
      total: 0
    };
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newEmptyItem]
    }));
  };

  const handleRemoveItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index)
    }));
  };

  const calculateItemTotal = (item: any) => {
    const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
    const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
    const taxAmount = (afterDiscount * item.taxRate) / 100;
    return afterDiscount + taxAmount;
  };

  const calculateTotals = () => {
    // Only calculate totals for items with products selected
    const validItems = formData.items.filter((item: any) => item.product && item.product.trim() !== '');
    
    const subtotal = validItems.reduce((sum: number, item: any) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
      return sum + afterDiscount;
    }, 0);

    const totalDiscount = validItems.reduce((sum: number, item: any) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      return sum + discountAmount;
    }, 0);

    const totalTax = validItems.reduce((sum: number, item: any) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
      const taxAmount = (afterDiscount * item.taxRate) / 100;
      return sum + taxAmount;
    }, 0);

    const total = subtotal + totalTax;

    return { subtotal, totalDiscount, totalTax, total };
  };

  const handleSubmit = () => {
    // Filter out empty items (items without product selected)
    const validItems = formData.items.filter((item: any) => item.product && item.product.trim() !== '');
    
    if (!formData.customer || validItems.length === 0) {
      alert('Please select a customer and add at least one item with a product selected');
      return;
    }

    // Calculate totals for each valid item
    const itemsWithTotals = validItems.map((item: any) => ({
      ...item,
      total: calculateItemTotal(item)
    }));

    const orderData = {
      ...formData,
      items: itemsWithTotals,
      ...calculateTotals()
    };

    onSuccess(orderData);
  };

  const totals = calculateTotals();

  return (
    <div className="space-y-6">
      {/* Customer Selection */}
      <div>
        <CustomerSelector
          label="Customer *"
          value={formData.customer}
          onChange={(id) => handleInputChange('customer', id)}
        />
      </div>

      {/* Order Details */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery Date</label>
          <Input
            type="date"
            value={formData.expectedDeliveryDate}
            onChange={(e) => handleInputChange('expectedDeliveryDate', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Method</label>
          <Select
            value={formData.shippingMethod}
            onChange={(e) => handleInputChange('shippingMethod', e.target.value)}
            options={[
              { value: 'pickup', label: 'Pickup' },
              { value: 'delivery', label: 'Delivery' },
              { value: 'shipping', label: 'Shipping' },
              { value: 'express', label: 'Express' },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
          <Select
            value={formData.paymentMethod}
            onChange={(e) => handleInputChange('paymentMethod', e.target.value)}
            options={[
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'bank_transfer', label: 'Bank Transfer' },
              { value: 'check', label: 'Check' },
              { value: 'online', label: 'Online' },
              { value: 'other', label: 'Other' },
            ]}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
          <Select
            value={formData.priority}
            onChange={(e) => handleInputChange('priority', e.target.value)}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'normal', label: 'Normal' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' },
            ]}
          />
        </div>
      </div>

      {/* Items */}
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Items</h3>
          <Button
            type="button"
            onClick={handleAddItem}
            className="flex items-center space-x-2"
            variant="outline"
          >
            <PlusIcon className="h-4 w-4" />
            <span>Add Product</span>
          </Button>
        </div>
        
        {/* Items List */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 table-fixed">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Discount %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Tax %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {formData.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-6 py-4">
                    <div className="w-48 min-w-0">
                      <FormProductSelector
                        value={item.product}
                        onChange={(value) => handleItemChange(index, 'product', value)}
                        placeholder="Select Product"
                      />
                      {item.name && (
                        <div className="mt-1 text-xs text-gray-500 truncate">
                          {item.sku && `SKU: ${item.sku}`}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-16 min-w-0"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                      className="w-20 min-w-0"
                    />
                  </td>
                   <td className="px-6 py-4">
                     <Input
                       type="number"
                       min="0"
                       max="100"
                       step="0.01"
                       value={item.discount}
                       onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                       className="w-16 min-w-0"
                     />
                   </td>
                   <td className="px-6 py-4">
                     <Input
                       type="number"
                       min="0"
                       max="100"
                       step="0.01"
                       value={item.taxRate}
                       onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                       className="w-16 min-w-0"
                     />
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {item.product ? formatCurrency(calculateItemTotal(item)) : '$0.00'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {formData.items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800"
                        title="Remove item"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Totals */}
      {formData.items.some((item: any) => item.product && item.product.trim() !== '') && (
        <div className="border-t pt-4">
          <div className="flex justify-end">
            <div className="w-64 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subtotal:</span>
                <span className="text-sm font-medium">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Discount:</span>
                <span className="text-sm font-medium">-{formatCurrency(totals.totalDiscount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tax:</span>
                <span className="text-sm font-medium">{formatCurrency(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-base font-medium">Total:</span>
                <span className="text-base font-medium">{formatCurrency(totals.total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          placeholder="Order notes..."
        />
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!formData.customer || !formData.items.some((item: any) => item.product && item.product.trim() !== '')}
        >
          {initialData ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </div>
  );
};

export default CreateOrderForm;
