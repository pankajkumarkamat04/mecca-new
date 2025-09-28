'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { customersAPI, productsAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
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
    items: initialData?.items || [],
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
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleAddItem = () => {
    if (newItem.product && newItem.quantity > 0) {
      const product = productsData?.data?.data?.find((p: any) => p._id === newItem.product);
      if (product) {
        const item = {
          ...newItem,
          name: product.name,
          sku: product.sku,
          description: product.description,
          unitPrice: newItem.unitPrice || product.pricing.salePrice,
          total: 0 // Will be calculated
        };
        
        setFormData(prev => ({
          ...prev,
          items: [...prev.items, item]
        }));
        
        setNewItem({
          product: '',
          quantity: 1,
          unitPrice: 0,
          discount: 0,
          taxRate: 0,
          notes: ''
        });
      }
    }
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
    const subtotal = formData.items.reduce((sum: number, item: any) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
      return sum + afterDiscount;
    }, 0);

    const totalDiscount = formData.items.reduce((sum: number, item: any) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      return sum + discountAmount;
    }, 0);

    const totalTax = formData.items.reduce((sum: number, item: any) => {
      const discountAmount = (item.unitPrice * item.quantity * item.discount) / 100;
      const afterDiscount = (item.unitPrice * item.quantity) - discountAmount;
      const taxAmount = (afterDiscount * item.taxRate) / 100;
      return sum + taxAmount;
    }, 0);

    const total = subtotal + totalTax;

    return { subtotal, totalDiscount, totalTax, total };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.customer || formData.items.length === 0) {
      alert('Please select a customer and add at least one item');
      return;
    }

    // Calculate totals for each item
    const itemsWithTotals = formData.items.map((item: any) => ({
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Customer *</label>
        <Select
          value={formData.customer}
          onChange={(e) => handleInputChange('customer', e.target.value)}
          options={[
            { value: '', label: 'Select Customer' },
            ...(customersData?.data?.data?.map((customer: any) => ({
              value: customer._id,
              label: `${customer.firstName} ${customer.lastName} (${customer.email})`
            })) || [])
          ]}
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
        <h3 className="text-lg font-medium text-gray-900 mb-4">Items</h3>
        
        {/* Add New Item */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="grid grid-cols-5 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <Select
                value={newItem.product}
                onChange={(e) => {
                  const productId = e.target.value;
                  const product = productsData?.data?.data?.find((p: any) => p._id === productId);
                  setNewItem(prev => ({
                    ...prev,
                    product: productId,
                    unitPrice: product?.pricing?.salePrice || 0
                  }));
                }}
                options={[
                  { value: '', label: 'Select Product' },
                  ...(productsData?.data?.data?.map((product: any) => ({
                    value: product._id,
                    label: `${product.name} (${product.sku})`
                  })) || [])
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
              <Input
                type="number"
                min="1"
                value={newItem.quantity}
                onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newItem.unitPrice}
                onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newItem.discount}
                onChange={(e) => setNewItem(prev => ({ ...prev, discount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tax %</label>
              <Input
                type="number"
                min="0"
                max="100"
                value={newItem.taxRate}
                onChange={(e) => setNewItem(prev => ({ ...prev, taxRate: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleAddItem}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="h-4 w-4" />
              <span>Add Item</span>
            </Button>
          </div>
        </div>

        {/* Items List */}
        {formData.items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Discount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tax</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.items.map((item: any, index: number) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.sku && (
                          <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-20"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={(e) => handleItemChange(index, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-20"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {formatCurrency(calculateItemTotal(item))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Totals */}
      {formData.items.length > 0 && (
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
          type="submit"
          disabled={!formData.customer || formData.items.length === 0}
        >
          {initialData ? 'Update Order' : 'Create Order'}
        </Button>
      </div>
    </form>
  );
};

export default CreateOrderForm;
