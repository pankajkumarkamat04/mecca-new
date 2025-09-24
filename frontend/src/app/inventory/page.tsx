'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { inventoryAPI, productsAPI } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { StockMovement, Product } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import {
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

const InventoryPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('levels');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [movementType, setMovementType] = useState('all');

  const queryClient = useQueryClient();

  // Fetch inventory levels
  const { data: inventoryLevels, isLoading: levelsLoading } = useQuery(
    ['inventory-levels', searchTerm],
    () => inventoryAPI.getInventoryLevels(),
    {
      enabled: activeTab === 'levels',
    }
  );

  // Fetch stock movements
  const { data: movementsData, isLoading: movementsLoading } = useQuery(
    ['stock-movements', currentPage, pageSize, movementType],
    () => inventoryAPI.getStockMovements({
      page: currentPage,
      limit: pageSize,
      type: movementType === 'all' ? undefined : movementType,
    }),
    {
      enabled: activeTab === 'movements',
      keepPreviousData: true,
    }
  );

  // Fetch low stock products
  const { data: lowStockData } = useQuery(
    'low-stock-products',
    () => productsAPI.getLowStockProducts(),
    {
      enabled: activeTab === 'alerts',
    }
  );

  // Create stock movement mutation
  const createMovementMutation = useMutation(
    (movementData: any) => inventoryAPI.createStockMovement(movementData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory-levels']);
        queryClient.invalidateQueries(['stock-movements']);
        toast.success('Stock movement recorded successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to record movement');
      },
    }
  );

  // Stock adjustment mutation
  const adjustmentMutation = useMutation(
    (adjustmentData: any) => inventoryAPI.performStockAdjustment(adjustmentData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['inventory-levels']);
        queryClient.invalidateQueries(['stock-movements']);
        toast.success('Stock adjustment completed successfully');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to adjust stock');
      },
    }
  );

  // Form schemas
  const movementSchema = useMemo(() => z.object({
    product: z.string().min(1, 'Product is required'),
    movementType: z.enum(['in', 'out', 'transfer', 'adjustment', 'return', 'damage', 'expired']),
    quantity: z.coerce.number().min(0.01, 'Quantity must be greater than 0'),
    unitCost: z.coerce.number().min(0, 'Unit cost cannot be negative'),
    reference: z.string().max(100).optional().or(z.literal('')),
    referenceType: z.enum(['purchase_order', 'sale', 'invoice', 'transfer', 'adjustment', 'manual']).optional().default('manual'),
    reason: z.string().max(500).optional().or(z.literal('')),
    supplier: z.string().optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  }), []);

  const adjustmentSchema = useMemo(() => z.object({
    productId: z.string().min(1, 'Product is required'),
    newQuantity: z.coerce.number().min(0, 'New quantity cannot be negative'),
    reason: z.string().max(500).optional().or(z.literal('')),
    notes: z.string().max(500).optional().or(z.literal('')),
  }), []);

  // Products for selects (basic fetch without pagination for simplicity)
  const { data: productsList } = useQuery(
    ['products-list'],
    () => productsAPI.getProducts({ limit: 100, page: 1 }),
    { staleTime: 60_000 }
  );

  const productOptions = (productsList?.data?.data || []).map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));
  const movementTypeOptionsForForm = [
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'return', label: 'Return' },
    { value: 'damage', label: 'Damage' },
    { value: 'expired', label: 'Expired' },
  ];

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock <= 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-100', label: 'Out of Stock' };
    if (currentStock <= minStock) return { status: 'low', color: 'text-yellow-600', bg: 'bg-yellow-100', label: 'Low Stock' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-100', label: 'In Stock' };
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'in':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
      case 'out':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowPathIcon className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
        return <CubeIcon className="h-4 w-4 text-gray-600" />;
      default:
        return <CubeIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
        return 'text-green-600';
      case 'out':
        return 'text-red-600';
      case 'transfer':
        return 'text-blue-600';
      case 'adjustment':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  // Inventory Levels Columns
  const levelsColumns = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (value: string, row: any) => {
        const product = row?.product || row;
        return (
          <div className="flex items-center">
            {product.images && product.images.length > 0 ? (
              <img
                className="h-10 w-10 rounded-lg mr-3 object-cover"
                src={product.images[0].url}
                alt={product.name}
              />
            ) : (
              <div className="h-10 w-10 bg-gray-300 rounded-lg mr-3 flex items-center justify-center">
                <CubeIcon className="h-5 w-5 text-gray-500" />
              </div>
            )}
            <div>
              <div className="text-sm font-medium text-gray-900">{product.name}</div>
              <div className="text-sm text-gray-500">SKU: {product.sku}</div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'inventory.currentStock',
      label: 'Current Stock',
      sortable: true,
      render: (value: number, row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        const unit = inv.unit || '';
        return (
          <div className="text-sm font-medium text-gray-900">
            {formatNumber(current)} {unit}
          </div>
        );
      },
    },
    {
      key: 'inventory.minStock',
      label: 'Min Stock',
      sortable: true,
      render: (value: number, row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const min = typeof inv.minStock === 'number' ? inv.minStock : 0;
        const unit = inv.unit || '';
        return (
          <div className="text-sm text-gray-900">
            {formatNumber(min)} {unit}
          </div>
        );
      },
    },
    {
      key: 'inventory.maxStock',
      label: 'Max Stock',
      sortable: true,
      render: (value: number, row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const max = typeof inv.maxStock === 'number' ? inv.maxStock : 0;
        const unit = inv.unit || '';
        return (
          <div className="text-sm text-gray-900">
            {formatNumber(max)} {unit}
          </div>
        );
      },
    },
    {
      key: 'stockValue',
      label: 'Stock Value',
      sortable: true,
      render: (value: number, row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const pricing = product?.pricing || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        const cost = typeof pricing.costPrice === 'number' ? pricing.costPrice : 0;
        const currency = pricing.currency || 'USD';
        return (
          <div className="text-sm text-gray-900">
            {formatCurrency(current * cost, currency)}
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: any, row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        const min = typeof inv.minStock === 'number' ? inv.minStock : 0;
        const stockStatus = getStockStatus(current, min);
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
            {stockStatus.status === 'out' && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
            {stockStatus.label}
          </span>
        );
      },
    },
  ];

  // Stock Movements Columns
  const movementsColumns = [
    {
      key: 'product',
      label: 'Product',
      sortable: true,
      render: (value: any, row: StockMovement) => (
        <div className="text-sm font-medium text-gray-900">
          {typeof row.product === 'object' ? row.product.name : 'Unknown Product'}
        </div>
      ),
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: (value: string, row: StockMovement) => (
        <div className="flex items-center">
          {getMovementIcon(row.type)}
          <span className={`ml-2 text-sm font-medium capitalize ${getMovementColor(row.type)}`}>
            {row.type}
          </span>
        </div>
      ),
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      render: (value: number, row: StockMovement) => (
        <div className={`text-sm font-medium ${row.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
          {row.type === 'in' ? '+' : '-'}{formatNumber(Math.abs(row.quantity))}
        </div>
      ),
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-900">{value}</div>
      ),
    },
    {
      key: 'movedBy',
      label: 'Moved By',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-900">{value}</div>
      ),
    },
    {
      key: 'movementDate',
      label: 'Date',
      sortable: true,
      render: (value: string) => (
        <div className="text-sm text-gray-900">{formatDate(value)}</div>
      ),
    },
  ];

  const movementTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' },
  ];

  const tabs = [
    { id: 'levels', name: 'Inventory Levels', icon: CubeIcon },
    { id: 'movements', name: 'Stock Movements', icon: ArrowPathIcon },
    { id: 'alerts', name: 'Low Stock Alerts', icon: ExclamationTriangleIcon },
  ];

  return (
    <Layout title="Inventory Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
            <p className="text-gray-600">Track stock levels, movements, and manage inventory</p>
          </div>
          <div className="flex space-x-3">
            {hasPermission('inventory', 'update') && (
              <Button
                onClick={() => setIsAdjustmentModalOpen(true)}
                leftIcon={<CubeIcon className="h-4 w-4" />}
              >
                Stock Adjustment
              </Button>
            )}
            {hasPermission('inventory', 'create') && (
              <Button
                onClick={() => setIsMovementModalOpen(true)}
                leftIcon={<PlusIcon className="h-4 w-4" />}
              >
                Record Movement
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Inventory Levels Tab */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
            <DataTable
              columns={levelsColumns}
              data={inventoryLevels?.data?.data || []}
              loading={levelsLoading}
              emptyMessage="No inventory data found"
            />
          </div>
        )}

        {/* Stock Movements Tab */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex-1 mr-4">
                <Input
                  placeholder="Search movements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                />
              </div>
              <div className="w-48">
                <Select
                  options={movementTypeOptions}
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  fullWidth
                />
              </div>
            </div>
            <DataTable
              columns={movementsColumns}
              data={movementsData?.data?.data || []}
              loading={movementsLoading}
              pagination={movementsData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No stock movements found"
            />
          </div>
        )}

        {/* Low Stock Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                <h3 className="text-sm font-medium text-yellow-800">
                  Low Stock Alert
                </h3>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                The following products are running low on stock and may need to be reordered.
              </p>
            </div>
            <DataTable
              columns={levelsColumns}
              data={lowStockData?.data?.data || []}
              loading={levelsLoading}
              emptyMessage="No low stock alerts"
            />
          </div>
        )}

        {/* Record Movement Modal */}
        <Modal
          isOpen={isMovementModalOpen}
          onClose={() => setIsMovementModalOpen(false)}
          title="Record Stock Movement"
          size="lg"
        >
          <Form
            schema={movementSchema}
            defaultValues={{
              product: '',
              movementType: 'in',
              quantity: 1,
              unitCost: 0,
              reference: '',
              referenceType: 'manual',
              reason: '',
              supplier: '',
              notes: '',
            }}
            onSubmit={async (values) => {
              const payload: any = {
                ...values,
                totalCost: values.quantity * values.unitCost,
              };
              if (!payload.reference) delete payload.reference;
              if (!payload.reason) delete payload.reason;
              if (!payload.supplier) delete payload.supplier;
              if (!payload.notes) delete payload.notes;
              await createMovementMutation.mutateAsync(payload);
              setIsMovementModalOpen(false);
            }}
            loading={createMovementMutation.isLoading}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Movement Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Product" required error={methods.formState.errors.product?.message as string}>
                    <Select
                      options={[{ value: '', label: 'Select product', disabled: true }, ...productOptions]}
                      value={methods.watch('product')}
                      onChange={(e) => methods.setValue('product', e.target.value)}
                      fullWidth
                    />
                  </FormField>
                  <FormField label="Movement Type" required error={methods.formState.errors.movementType?.message as string}>
                    <Select
                      options={movementTypeOptionsForForm}
                      value={methods.watch('movementType')}
                      onChange={(e) => methods.setValue('movementType', e.target.value as any)}
                      fullWidth
                    />
                  </FormField>
                  <FormField label="Quantity" required error={methods.formState.errors.quantity?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('quantity')} fullWidth />
                  </FormField>
                  <FormField label="Unit Cost" required error={methods.formState.errors.unitCost?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('unitCost')} fullWidth />
                  </FormField>
                  <FormField label="Reference" error={methods.formState.errors.reference?.message as string}>
                    <Input {...methods.register('reference')} placeholder="Optional reference" fullWidth />
                  </FormField>
                  <FormField label="Reason" error={methods.formState.errors.reason?.message as string}>
                    <Input {...methods.register('reason')} placeholder="Optional reason" fullWidth />
                  </FormField>
                  <FormField label="Supplier ID" error={methods.formState.errors.supplier?.message as string}>
                    <Input {...methods.register('supplier')} placeholder="Optional supplier id" fullWidth />
                  </FormField>
                  <FormField label="Notes" error={methods.formState.errors.notes?.message as string}>
                    <Input {...methods.register('notes')} placeholder="Optional notes" fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormActions
                onCancel={() => setIsMovementModalOpen(false)}
                submitText={createMovementMutation.isLoading ? 'Recording...' : 'Record Movement'}
                loading={createMovementMutation.isLoading}
              />
            </div>
          )}</Form>
        </Modal>

        {/* Stock Adjustment Modal */}
        <Modal
          isOpen={isAdjustmentModalOpen}
          onClose={() => setIsAdjustmentModalOpen(false)}
          title="Stock Adjustment"
          size="lg"
        >
          <Form
            schema={adjustmentSchema}
            defaultValues={{
              productId: '',
              newQuantity: 0,
              reason: '',
              notes: '',
            }}
            onSubmit={async (values) => {
              const payload: any = { ...values };
              if (!payload.reason) delete payload.reason;
              if (!payload.notes) delete payload.notes;
              await adjustmentMutation.mutateAsync(payload);
              setIsAdjustmentModalOpen(false);
            }}
            loading={adjustmentMutation.isLoading}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Adjustment Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Product" required error={methods.formState.errors.productId?.message as string}>
                    <Select
                      options={[{ value: '', label: 'Select product', disabled: true }, ...productOptions]}
                      value={methods.watch('productId')}
                      onChange={(e) => methods.setValue('productId', e.target.value)}
                      fullWidth
                    />
                  </FormField>
                  <FormField label="New Quantity" required error={methods.formState.errors.newQuantity?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('newQuantity')} fullWidth />
                  </FormField>
                  <FormField label="Reason" error={methods.formState.errors.reason?.message as string}>
                    <Input {...methods.register('reason')} placeholder="Optional reason" fullWidth />
                  </FormField>
                  <FormField label="Notes" error={methods.formState.errors.notes?.message as string}>
                    <Input {...methods.register('notes')} placeholder="Optional notes" fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormActions
                onCancel={() => setIsAdjustmentModalOpen(false)}
                submitText={adjustmentMutation.isLoading ? 'Adjusting...' : 'Adjust Stock'}
                loading={adjustmentMutation.isLoading}
              />
            </div>
          )}</Form>
        </Modal>
      </div>
    </Layout>
  );
};

export default InventoryPage;
