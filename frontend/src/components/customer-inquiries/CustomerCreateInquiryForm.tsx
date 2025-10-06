'use client';

import React, { useState, useEffect } from 'react';
import { customerInquiriesAPI, customersAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';

interface CustomerCreateInquiryFormProps {
  onClose: () => void;
  onSuccess: () => void;
  customerId?: string; // Required for customer portal, optional for admin use
  isAdminMode?: boolean; // When true, allows customer selection (admin only)
}

const CustomerCreateInquiryForm: React.FC<CustomerCreateInquiryFormProps> = ({ onClose, onSuccess, customerId, isAdminMode = false }) => {
  const [customer, setCustomer] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [productsOfInterest, setProductsOfInterest] = useState<Array<{ product: string; quantity: number; notes?: string }>>([{ product: '', quantity: 1 }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loadingCustomers, setLoadingCustomers] = useState(false);

  // Set customer ID if provided, otherwise load customers for selection (admin mode only)
  useEffect(() => {
    if (customerId) {
      setCustomer(customerId);
    } else if (isAdminMode) {
      const loadCustomers = async () => {
        setLoadingCustomers(true);
        try {
          const response = await customersAPI.getCustomers();
          setCustomers(response.data?.data?.customers || []);
        } catch (error) {
          console.error('Failed to load customers:', error);
        } finally {
          setLoadingCustomers(false);
        }
      };
      loadCustomers();
    }
  }, [customerId, isAdminMode]);

  const handleAddItem = () => {
    setProductsOfInterest((prev) => [...prev, { product: '', quantity: 1 }]);
  };

  const handleRemoveItem = (index: number) => {
    setProductsOfInterest((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: 'product' | 'quantity' | 'notes', value: string) => {
    setProductsOfInterest((prev) => prev.map((it, i) => i === index ? { ...it, [field]: field === 'quantity' ? Number(value) : value } : it));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCustomerId = customerId || customer;
    
    // Security check: customer portal must have customerId provided
    if (!isAdminMode && !customerId) {
      console.error('Customer ID is required for customer portal mode');
      return;
    }
    
    if (!finalCustomerId || !subject.trim() || !message.trim()) return;
    setIsSubmitting(true);
    try {
      const payload: any = {
        customer: finalCustomerId,
        subject: subject.trim(),
        message: message.trim(),
        priority,
        productsOfInterest: productsOfInterest
          .filter((it) => it.product.trim())
          .map((it) => ({ 
            product: it.product.trim(), 
            quantity: it.quantity || 1,
            notes: it.notes?.trim() || undefined
          })),
      };
      await customerInquiriesAPI.createCustomerInquiry(payload);
      onSuccess();
    } catch (err) {
      // Basic error feedback; page has toast on error via caller usually
      console.error('Failed to create inquiry', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isAdminMode && !customerId && (
        <div>
          <label className="block text-sm font-medium text-gray-700">Customer *</label>
          <Select
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            options={[
              { value: '', label: 'Select Customer' },
              ...customers.map((cust) => ({
                value: cust._id,
                label: `${cust.name} (${cust.email})`
              }))
            ]}
            disabled={loadingCustomers}
          />
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700">Subject *</label>
        <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Briefly describe your inquiry" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Message *</label>
        <TextArea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} placeholder="Provide details to help us assist you" required />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">Priority</label>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium text-gray-700">Products of Interest (optional)</label>
          <Button type="button" variant="ghost" size="sm" onClick={handleAddItem}>Add Item</Button>
        </div>
        <div className="space-y-2 mt-2">
          {productsOfInterest.map((item, index) => (
            <div key={index} className="grid grid-cols-6 gap-2 items-center">
              <div className="col-span-4">
                <Input placeholder="Product name" value={item.product} onChange={(e) => handleItemChange(index, 'product', e.target.value)} />
              </div>
              <div className="col-span-1">
                <Input type="number" min={1} value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)} />
              </div>
              <div className="col-span-1 flex justify-end">
                <Button type="button" variant="outline" size="sm" onClick={() => handleRemoveItem(index)}>Remove</Button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Submit Inquiry</Button>
      </div>
    </form>
  );
};

export default CustomerCreateInquiryForm;


