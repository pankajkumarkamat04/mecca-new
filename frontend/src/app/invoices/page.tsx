'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { invoicesAPI, customersAPI, productsAPI } from '@/lib/api';
import { useSettings } from '@/contexts/SettingsContext';
import { formatCurrency, formatDate, getStatusColor, buildPrintableInvoiceHTML } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import PriceSummary from '@/components/ui/PriceSummary';
import { Invoice } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import {
  PlusIcon,
  EyeIcon,
  DocumentTextIcon,
  QrCodeIcon,
  PrinterIcon,
  ShareIcon,
} from '@heroicons/react/24/outline';

const InvoicesPage: React.FC = () => {
  const { company } = useSettings();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState<{ amount: string; method: string; reference: string; date: string }>({ amount: '', method: 'cash', reference: '', date: new Date().toISOString().slice(0,10) });
  const [pendingStatus, setPendingStatus] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');

  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoicesData, isPending, error, isError } = useQuery({
    queryKey: ['invoices', currentPage, pageSize, searchTerm, filterStatus],
    queryFn: () => invoicesAPI.getInvoices({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: filterStatus === 'all' ? undefined : filterStatus,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  // Create invoice
  const createInvoiceMutation = useMutation({
    mutationFn: (data: any) => invoicesAPI.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsCreateModalOpen(false);
      toast.success('Invoice created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create invoice');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => invoicesAPI.updateInvoice(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success('Invoice status updated');
    },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to update status'); }
  });

  const addPaymentMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => invoicesAPI.addPayment(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsPayModalOpen(false);
      toast.success('Payment recorded');
    },
    onError: (error: any) => { toast.error(error.response?.data?.message || 'Failed to record payment'); },
  });

  // Supporting data
  const { data: customersList } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersAPI.getCustomers({ limit: 100, page: 1 })
  });
  const { data: productsList } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 })
  });
  const customerOptions = Array.isArray(customersList?.data) ? customersList.data : [];
  const productOptions = Array.isArray(productsList?.data) ? productsList.data : [];
  
  const customerOptionsFormatted = customerOptions.map((c: any) => ({ value: c._id, label: `${c.firstName} ${c.lastName}` }));
  const productOptionsFormatted = productOptions.map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));

  // Form schema
  const invoiceSchema = useMemo(() => z.object({
    customer: z.string().min(1, 'Customer is required'),
    customerPhone: z.string().min(1, 'Customer phone number is required'),
    invoiceDate: z.string().min(1),
    dueDate: z.string().optional().or(z.literal('')),
    items: z.array(z.object({
      product: z.string().min(1),
      quantity: z.coerce.number().min(1),
      unitPrice: z.coerce.number().min(0),
      taxRate: z.coerce.number().min(0).max(100).optional().default(0),
    })).min(1),
    notes: z.string().optional().or(z.literal('')),
  }), []);

  const handleViewInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsViewModalOpen(true);
  };

  const handlePrintInvoice = (invoice: Invoice) => {
    const html = buildPrintableInvoiceHTML(invoice as any, company);
    const w = window.open('', '_blank', 'width=900,height=650');
    if (!w) { toast.error('Pop-up blocked. Allow pop-ups to print.'); return; }
    w.document.open();
    w.document.write(html);
    w.document.close();
  };

  const handleShareInvoice = (invoice: Invoice) => {
    const shareUrl = `${window.location.origin}/invoice/${invoice.invoiceNumber}`;
    
    if (navigator.share) {
      navigator.share({
        title: `Invoice ${invoice.invoiceNumber}`,
        text: `Invoice ${invoice.invoiceNumber} for ${typeof invoice.customer === 'string' ? invoice.customer : (invoice.customer as any)?.name || 'Customer'}`,
        url: shareUrl
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(shareUrl);
        toast.success('Invoice link copied to clipboard');
      });
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(shareUrl);
      toast.success('Invoice link copied to clipboard');
    }
  };

  const handleGenerateQR = (invoice: Invoice) => {
    const invoiceUrl = `${window.location.origin}/invoice/${invoice.invoiceNumber}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(invoiceUrl)}`;
    
    // Open QR code in new window
    window.open(qrCodeUrl, '_blank');
    toast.success('QR code generated successfully');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-100 text-gray-800', label: 'Draft' },
      sent: { color: 'bg-blue-100 text-blue-800', label: 'Sent' },
      paid: { color: 'bg-green-100 text-green-800', label: 'Paid' },
      partial: { color: 'bg-yellow-100 text-yellow-800', label: 'Partial' },
      overdue: { color: 'bg-red-100 text-red-800', label: 'Overdue' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const columns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice',
      sortable: true,
      render: (row: Invoice) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.invoiceNumber}</div>
          <div className="text-sm text-gray-500">{formatDate(row.invoiceDate)}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (row: Invoice) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {row.customer && typeof row.customer === 'object' 
              ? `${row.customer.firstName} ${row.customer.lastName}`
              : 'Unknown Customer'
            }
          </div>
          <div className="text-sm text-gray-500">
            {row.customer && typeof row.customer === 'object' ? row.customer.email : ''}
          </div>
        </div>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      sortable: true,
      render: (row: any) => {
        const toNumber = (v: any, fb = 0) => {
          const n = typeof v === 'string' ? Number(v) : v;
          return Number.isFinite(n) ? n : fb;
        };
        const items = row.items || [];
        const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
        const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
        const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
        const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
        const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
        const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
        const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
        const shippingCost = toNumber(row.shipping?.cost);
        const subtotal = toNumber(row.subtotal, computedSubtotal);
        const totalDiscount = toNumber(row.totalDiscount, computedTotalDiscount);
        const totalTax = toNumber(row.totalTax, computedTotalTax);
        const totalAmount = toNumber(row.total, subtotal - totalDiscount + totalTax + shippingCost);
        const paid = toNumber(row.paid);
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-sm text-gray-500">
              Paid: {formatCurrency(paid)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: Invoice) => getStatusBadge(row.status),
    },
    {
      key: 'options',
      label: 'Options',
      render: (row: any) => {
        if (row.status === 'paid') return <span className="text-xs text-gray-500">Paid</span>;
        return (
          <div className="flex flex-col gap-2 min-w-[220px]">
            <div className="flex items-center gap-2">
              <Select
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'partial', label: 'Partial' },
                  { value: 'overdue', label: 'Overdue' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
                value={row.status}
                onChange={async (e) => {
                  const next = e.target.value;
                  if (!next || next === row.status) return;
                  const ok = window.confirm(`Change status to ${next}?`);
                  if (!ok) return;
                  await updateStatusMutation.mutateAsync({ id: row._id, status: next });
                }}
              />
            </div>
            <div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedInvoice(row);
                  const inv: any = row;
                  const toNumber = (v: any, fb = 0) => { const n = typeof v === 'string' ? Number(v) : v; return Number.isFinite(n) ? n : fb; };
                  const items = inv.items || [];
                  const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
                  const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
                  const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
                  const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
                  const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
                  const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
                  const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
                  const shippingCost = toNumber(inv.shipping?.cost);
                  const subtotal = toNumber(inv.subtotal, computedSubtotal);
                  const totalDiscount = toNumber(inv.totalDiscount, computedTotalDiscount);
                  const totalTax = toNumber(inv.totalTax, computedTotalTax);
                  const totalAmount = toNumber(inv.total, subtotal - totalDiscount + totalTax + shippingCost);
                  const paid = toNumber(inv.paid);
                  const due = Math.max(0, totalAmount - paid);
                  setPaymentForm({ amount: String(due.toFixed(2)), method: 'cash', reference: '', date: new Date().toISOString().slice(0,10) });
                  setIsPayModalOpen(true);
                }}
              >
                Pay
              </Button>
            </div>
          </div>
        );
      },
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      sortable: true,
      render: (row: Invoice) => (
        <div>
          <div className="text-sm text-gray-900">
            {row.dueDate ? formatDate(row.dueDate) : 'N/A'}
          </div>
          {(row as any).isOverdue && (
            <div className="text-xs text-red-600">
              {(row as any).daysOverdue} days overdue
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Invoice) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewInvoice(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Invoice"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handlePrintInvoice(row)}
            className="text-gray-600 hover:text-gray-900"
            title="Print Invoice"
          >
            <PrinterIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleGenerateQR(row)}
            className="text-purple-600 hover:text-purple-900"
            title="Generate QR Code"
          >
            <QrCodeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleShareInvoice(row)}
            className="text-green-600 hover:text-green-900"
            title="Share Invoice"
          >
            <ShareIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'paid', label: 'Paid' },
    { value: 'partial', label: 'Partial' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <Layout title="Invoices">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
            <p className="text-gray-600">Manage invoices, payments, and billing</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<DocumentTextIcon className="h-4 w-4" />}
          >
            Create Invoice
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search invoices by number, customer, phone, or amount..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                  📞 Phone search supported
                </div>
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select
                options={statusOptions}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                fullWidth
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Overdue
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Invoices Table */}
        <DataTable
          columns={columns}
          data={Array.isArray(invoicesData?.data?.data) ? invoicesData.data.data : []}
          loading={isPending}
          pagination={invoicesData?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage={isPending ? "Loading invoices..." : "No invoices found"}
        />

        {/* Create Invoice Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Invoice"
          size="xl"
        >
          <Form
            schema={invoiceSchema}
            defaultValues={{
              customer: '',
              customerPhone: '',
              invoiceDate: new Date().toISOString().slice(0, 10),
              dueDate: '',
              items: [{ product: '', quantity: 1, unitPrice: 0 }],
              notes: '',
            }}
            onSubmit={async (values) => {
              const payload: any = { ...values };
              if (!payload.dueDate) delete payload.dueDate;
              if (!payload.notes) delete payload.notes;
              // customerPhone is now required, so we don't delete it
              // Compute totals on backend; only send raw fields
              await createInvoiceMutation.mutateAsync(payload);
            }}
            loading={createInvoiceMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Invoice Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Customer" required error={methods.formState.errors.customer?.message as string}>
                    <Select
                      options={[{ value: '', label: 'Select customer', disabled: true }, ...customerOptionsFormatted]}
                      value={methods.watch('customer')}
                      onChange={(e) => methods.setValue('customer', e.target.value)}
                      fullWidth
                    />
                  </FormField>
                  <FormField label="Customer Phone" required error={methods.formState.errors.customerPhone?.message as string}>
                    <Input 
                      type="tel" 
                      placeholder="Enter customer phone number"
                      {...methods.register('customerPhone')} 
                      fullWidth 
                    />
                  </FormField>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Invoice Date" required error={methods.formState.errors.invoiceDate?.message as string}>
                    <Input type="date" {...methods.register('invoiceDate')} fullWidth />
                  </FormField>
                  <FormField label="Due Date" error={methods.formState.errors.dueDate?.message as string}>
                    <Input type="date" {...methods.register('dueDate')} fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Items">
                <div className="space-y-3">
                  {methods.watch('items').map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <FormField label="Product" required error={(methods.formState.errors.items as any)?.[idx]?.product?.message as string}>
                        <Select
                          options={[{ value: '', label: 'Select product', disabled: true }, ...productOptionsFormatted]}
                          value={methods.watch(`items.${idx}.product` as const)}
                          onChange={(e) => methods.setValue(`items.${idx}.product` as const, e.target.value)}
                          fullWidth
                        />
                      </FormField>
                      <FormField label="Quantity" required error={(methods.formState.errors.items as any)?.[idx]?.quantity?.message as string}>
                        <Input type="number" min={1} {...methods.register(`items.${idx}.quantity` as const)} fullWidth />
                      </FormField>
                      <FormField label="Unit Price" required error={(methods.formState.errors.items as any)?.[idx]?.unitPrice?.message as string}>
                        <Input type="number" step="0.01" {...methods.register(`items.${idx}.unitPrice` as const)} fullWidth />
                      </FormField>
                      <FormField label="Tax %" error={(methods.formState.errors.items as any)?.[idx]?.taxRate?.message as string}>
                        <Input type="number" step="0.1" {...methods.register(`items.${idx}.taxRate` as const)} fullWidth />
                      </FormField>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            const current = methods.getValues('items');
                            if (current.length > 1) methods.setValue('items', current.filter((_, i) => i !== idx));
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => methods.setValue('items', [...methods.getValues('items'), { product: '', quantity: 1, unitPrice: 0 }])}
                  >
                    Add Item
                  </Button>
                </div>
              </FormSection>

              <FormSection title="Notes">
                <FormField label="Notes">
                  <Input {...methods.register('notes')} placeholder="Optional notes" fullWidth />
                </FormField>
              </FormSection>

              {/* Price Summary */}
              <FormSection title="Price Summary">
                {(() => {
                  const items = methods.watch('items') || [];
                  const priceItems = items.filter((item: any) => item.product).map((item: any) => ({
                    product: productOptions.find((p: any) => p.value === item.product),
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    discount: 0,
                    taxRate: item.taxRate || 0
                  }));
                  
                  const calculation = calculatePrice(priceItems);
                  return (
                    <PriceSummary 
                      calculation={calculation} 
                      showBreakdown={true}
                      showItems={true}
                      title=""
                    />
                  );
                })()}
              </FormSection>

              <FormActions
                onCancel={() => setIsCreateModalOpen(false)}
                submitText={createInvoiceMutation.isPending ? 'Creating...' : 'Create Invoice'}
                loading={createInvoiceMutation.isPending}
              />
            </div>
          )}</Form>
        </Modal>

        {/* View Invoice Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Invoice Details"
          size="xl"
        >
          {selectedInvoice && (
            <div className="space-y-6">
              {(() => {
                const inv: any = selectedInvoice;
                const toNumber = (v: any, fb = 0) => {
                  const n = typeof v === 'string' ? Number(v) : v;
                  return Number.isFinite(n) ? n : fb;
                };
                const items = inv.items || [];
                const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
                const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
                const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
                const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
                const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
                const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
                const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
                const shippingCost = toNumber(inv.shipping?.cost);
                const subtotal = toNumber(inv.subtotal, computedSubtotal);
                const totalDiscount = toNumber(inv.totalDiscount, computedTotalDiscount);
                const totalTax = toNumber(inv.totalTax, computedTotalTax);
                const totalAmount = toNumber(inv.total, subtotal - totalDiscount + totalTax + shippingCost);
                const paid = toNumber(inv.paid);
                const due = toNumber(inv.balance, Math.max(0, totalAmount - paid));
                return (
                  <div className="hidden" data-subtotals-prep>
                    {/* precompute values for summary below */}
                  </div>
                );
              })()}
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Invoice #{selectedInvoice.invoiceNumber}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Date: {formatDate(selectedInvoice.invoiceDate)}
                  </p>
                  <p className="text-sm text-gray-500">
                    Due: {selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : 'N/A'}
                  </p>
                </div>
                <div className="text-right">
                  <InvoiceHeaderRight invoice={selectedInvoice as any} />
                  {getStatusBadge(selectedInvoice.status)}
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Bill To:</h4>
                {selectedInvoice.customer && typeof selectedInvoice.customer === 'object' ? (
                  <div>
                    <p className="font-medium">
                      {selectedInvoice.customer.firstName} {selectedInvoice.customer.lastName}
                    </p>
                    <p className="text-sm text-gray-600">{selectedInvoice.customer.email}</p>
                    {selectedInvoice.customer.phone && (
                      <p className="text-sm text-gray-600">{selectedInvoice.customer.phone}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-500">No customer information</p>
                    {(selectedInvoice as any).customerPhone && (
                      <p className="text-sm text-gray-600">Phone: {(selectedInvoice as any).customerPhone}</p>
                    )}
                  </div>
                )}
                {(selectedInvoice as any).customerPhone && typeof selectedInvoice.customer === 'object' && (
                  <p className="text-sm text-gray-600 mt-1">Invoice Phone: {(selectedInvoice as any).customerPhone}</p>
                )}
              </div>

              {/* Invoice Items */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Items</h4>
                <div className="space-y-3">
                  {selectedInvoice.items.map((item: any, index: number) => {
                    const toNumber = (v: any, fb = 0) => {
                      const n = typeof v === 'string' ? Number(v) : v;
                      return Number.isFinite(n) ? n : fb;
                    };
                    const unitPrice = toNumber(item.unitPrice, 0);
                    const quantity = toNumber(item.quantity, 0);
                    const discount = toNumber(item.discount, 0);
                    const taxRate = toNumber(item.taxRate, 0);
                    
                    // Calculate breakdown
                    const subtotal = unitPrice * quantity;
                    const discountAmount = (subtotal * discount) / 100;
                    const afterDiscount = subtotal - discountAmount;
                    const taxAmount = (afterDiscount * taxRate) / 100;
                    const itemTotal = afterDiscount + taxAmount;
                    
                    return (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">
                              {typeof item.product === 'object' && item.product?.name
                                ? item.product.name
                                : (item.name || 'Unknown Product')}
                            </p>
                            <p className="text-sm text-gray-600">
                              Qty: {quantity} × {formatCurrency(unitPrice)}
                            </p>
                            {item.sku && (
                              <p className="text-xs text-gray-500">SKU: {item.sku}</p>
                            )}
                          </div>
                          <p className="font-medium text-gray-900 text-lg">{formatCurrency(itemTotal)}</p>
                        </div>
                        
                        {/* Tax and Discount Breakdown */}
                        <div className="text-sm text-gray-600 space-y-1">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>{formatCurrency(subtotal)}</span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-green-600">
                              <span>Discount ({discount}%):</span>
                              <span>-{formatCurrency(discountAmount)}</span>
                            </div>
                          )}
                          {taxRate > 0 && (
                            <div className="flex justify-between text-blue-600">
                              <span>Tax ({taxRate}%):</span>
                              <span>+{formatCurrency(taxAmount)}</span>
                            </div>
                          )}
                          <div className="flex justify-between font-medium text-gray-800 border-t pt-1">
                            <span>Total:</span>
                            <span>{formatCurrency(itemTotal)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Invoice Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                {(() => {
                  const inv: any = selectedInvoice;
                  const toNumber = (v: any, fb = 0) => {
                    const n = typeof v === 'string' ? Number(v) : v;
                    return Number.isFinite(n) ? n : fb;
                  };
                  const items = inv.items || [];
                  const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
                  const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
                  const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
                  const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
                  const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
                  const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
                  const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
                  const shippingCost = toNumber(inv.shipping?.cost);
                  const subtotal = toNumber(inv.subtotal, computedSubtotal);
                  const totalDiscount = toNumber(inv.totalDiscount, computedTotalDiscount);
                  const totalTax = toNumber(inv.totalTax, computedTotalTax);
                  const totalAmount = toNumber(inv.total, subtotal - totalDiscount + totalTax + shippingCost);
                  const paid = toNumber(inv.paid);
                  const due = toNumber(inv.balance, Math.max(0, totalAmount - paid));
                  return (
                    <>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Subtotal:</span>
                        <span>{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total Discount:</span>
                        <span>-{formatCurrency(totalDiscount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>Total Tax:</span>
                        <span>{formatCurrency(totalTax)}</span>
                      </div>
                      {shippingCost > 0 && (
                        <div className="flex justify-between text-sm text-gray-600 mb-2">
                          <span>Shipping:</span>
                          <span>{formatCurrency(shippingCost)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-lg font-semibold text-gray-900 border-t border-gray-200 pt-2">
                        <span>Total:</span>
                        <span>{formatCurrency(totalAmount)}</span>
                      </div>
                      <div className="flex justify-between text-sm text-gray-600 mt-2">
                        <span>Paid:</span>
                        <span>{formatCurrency(paid)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium text-gray-900">
                        <span>Due:</span>
                        <span>{formatCurrency(due)}</span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Actions */}
              <div className="space-y-4">
                {/* Status change and quick pay (only if not paid) */}
                {selectedInvoice.status !== 'paid' && (
                  <div className="bg-gray-50 p-4 rounded-lg flex flex-col md:flex-row md:items-end md:justify-between gap-3">
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Change Status</label>
                      <div className="flex gap-3 items-center">
                        <Select
                          options={[
                            { value: 'draft', label: 'Draft' },
                            { value: 'sent', label: 'Sent' },
                            { value: 'partial', label: 'Partial' },
                            { value: 'overdue', label: 'Overdue' },
                            { value: 'cancelled', label: 'Cancelled' },
                          ]}
                          value={selectedInvoice.status}
                          onChange={async (e) => {
                            const next = e.target.value;
                            if (!next || next === selectedInvoice.status) return;
                            const ok = window.confirm(`Change status to ${next}?`);
                            if (!ok) return;
                            await updateStatusMutation.mutateAsync({ id: (selectedInvoice as any)._id, status: next });
                            setSelectedInvoice({ ...(selectedInvoice as any), status: next } as any);
                          }}
                          fullWidth
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment</label>
                      <Button onClick={() => {
                        // default amount = due
                        const inv: any = selectedInvoice;
                        const toNumber = (v: any, fb = 0) => { const n = typeof v === 'string' ? Number(v) : v; return Number.isFinite(n) ? n : fb; };
                        const items = inv.items || [];
                        const lineBase = (it: any) => toNumber(it.unitPrice) * toNumber(it.quantity);
                        const lineDiscount = (it: any) => (lineBase(it) * toNumber(it.discount)) / 100;
                        const lineAfterDiscount = (it: any) => lineBase(it) - lineDiscount(it);
                        const lineTax = (it: any) => (lineAfterDiscount(it) * toNumber(it.taxRate)) / 100;
                        const computedSubtotal = items.reduce((s: number, it: any) => s + lineBase(it), 0);
                        const computedTotalDiscount = items.reduce((s: number, it: any) => s + lineDiscount(it), 0);
                        const computedTotalTax = items.reduce((s: number, it: any) => s + lineTax(it), 0);
                        const shippingCost = toNumber(inv.shipping?.cost);
                        const subtotal = toNumber(inv.subtotal, computedSubtotal);
                        const totalDiscount = toNumber(inv.totalDiscount, computedTotalDiscount);
                        const totalTax = toNumber(inv.totalTax, computedTotalTax);
                        const totalAmount = toNumber(inv.total, subtotal - totalDiscount + totalTax + shippingCost);
                        const paid = toNumber(inv.paid);
                        const due = Math.max(0, totalAmount - paid);
                        setPaymentForm({ amount: String(due.toFixed(2)), method: 'cash', reference: '', date: new Date().toISOString().slice(0,10) });
                        setIsPayModalOpen(true);
                      }}>Pay</Button>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => handlePrintInvoice(selectedInvoice)}
                  leftIcon={<PrinterIcon className="h-4 w-4" />}
                >
                  Print
                </Button>
                <Button
                  onClick={() => handleGenerateQR(selectedInvoice)}
                  leftIcon={<QrCodeIcon className="h-4 w-4" />}
                >
                  Generate QR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Pay Modal */}
        <Modal isOpen={isPayModalOpen} onClose={() => setIsPayModalOpen(false)} title="Record Payment" size="md">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <Input value={paymentForm.amount} onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))} fullWidth />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Method</label>
                <Select
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'card', label: 'Card' },
                    { value: 'bank', label: 'Bank' },
                  ]}
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, method: e.target.value }))}
                  fullWidth
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <Input type="date" value={paymentForm.date} onChange={(e) => setPaymentForm(prev => ({ ...prev, date: e.target.value }))} fullWidth />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
              <Input value={paymentForm.reference} onChange={(e) => setPaymentForm(prev => ({ ...prev, reference: e.target.value }))} placeholder="Optional" fullWidth />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsPayModalOpen(false)}>Cancel</Button>
              <Button onClick={async () => {
                if (!selectedInvoice) return;
                const amountNum = Number(paymentForm.amount);
                if (!Number.isFinite(amountNum) || amountNum <= 0) { toast.error('Enter a valid amount'); return; }
                await addPaymentMutation.mutateAsync({ id: (selectedInvoice as any)._id, payload: {
                  amount: amountNum,
                  method: paymentForm.method,
                  reference: paymentForm.reference || undefined,
                  date: paymentForm.date,
                } });
              }} disabled={addPaymentMutation.isPending}>
                {addPaymentMutation.isPending ? 'Saving...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </Layout>
  );
};

export default InvoicesPage;

// Header right block: company logo (if available) and total
const InvoiceHeaderRight: React.FC<{ invoice: any }> = ({ invoice }) => {
  try {
    // Lazy require hook context at runtime
    const { useSettings } = require('@/contexts/SettingsContext');
    const { company } = useSettings();
    return (
      <div>
        <div className="flex items-center justify-end gap-3">
          {company?.logo?.url && (
            <img src={company.logo.url} alt="Logo" className="h-10 w-auto object-contain" />
          )}
          <div className="text-2xl font-bold text-gray-900">
            {formatCurrency(invoice?.total ?? invoice?.totalAmount ?? 0)}
          </div>
        </div>
      </div>
    );
  } catch {
    return (
      <div className="text-2xl font-bold text-gray-900">{formatCurrency(invoice?.total ?? invoice?.totalAmount ?? 0)}</div>
    );
  }
};
