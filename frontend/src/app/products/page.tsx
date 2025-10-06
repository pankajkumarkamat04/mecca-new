'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { productsAPI, categoriesAPI, warehouseAPI } from '@/lib/api';
import { formatCurrency, formatNumber, getStatusColor } from '@/lib/utils';
import { Product } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const ProductsPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);

  const queryClient = useQueryClient();

  // Fetch products
  const { data: productsData, isPending } = useQuery({
    queryKey: ['products', currentPage, pageSize, searchTerm, filterStatus],
    queryFn: () => productsAPI.getProducts({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: filterStatus === 'all' ? undefined : filterStatus,
    })
  });

  // Fetch categories for selection
  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoriesAPI.getCategories({ isActive: true }),
    staleTime: 5 * 60 * 1000
  });

  // Fetch warehouses for selection
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getWarehouses({ isActive: true }),
    staleTime: 5 * 60 * 1000
  });

  // Generate unique SKU function
  const generateSKU = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `PRD-${timestamp}-${random}`;
  };

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: (data: any) => productsAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsCreateModalOpen(false);
      toast.success('Product created successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to create product';
      if (errorMessage.includes('already exists')) {
        toast.error('A product with this SKU already exists. Please use a different SKU.');
      } else {
        toast.error(errorMessage);
      }
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => productsAPI.updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setIsEditModalOpen(false);
      setSelectedProduct(null);
      toast.success('Product updated successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || 'Failed to update product';
      if (errorMessage.includes('already exists')) {
        toast.error('A product with this SKU already exists. Please use a different SKU.');
      } else {
        toast.error(errorMessage);
      }
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: (productId: string) => productsAPI.deleteProduct(productId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete product');
    }
  });

  const handleDeleteProduct = (product: Product) => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      deleteProductMutation.mutate(product._id);
    }
  };

  const handleViewProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsViewModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setIsEditModalOpen(true);
  };

  const getStockStatus = (currentStock: number, minStock: number) => {
    if (currentStock <= 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-100' };
    if (currentStock <= minStock) return { status: 'low', color: 'text-yellow-600', bg: 'bg-yellow-100' };
    return { status: 'in', color: 'text-green-600', bg: 'bg-green-100' };
  };

  const columns = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (row: Product) => (
        <div className="flex items-center">
          {row.images && row.images.length > 0 ? (
            <img
              className="h-10 w-10 rounded-lg mr-3 object-cover"
              src={row.images[0].url}
              alt={row.name}
            />
          ) : (
            <div className="h-10 w-10 bg-gray-300 rounded-lg mr-3 flex items-center justify-center">
              <CubeIcon className="h-5 w-5 text-gray-500" />
            </div>
          )}
          <div>
            <div className="text-sm font-medium text-gray-900">{row.name}</div>
            <div className="text-sm text-gray-500">SKU: {row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'pricing.sellingPrice',
      label: 'Price',
      sortable: true,
      render: (row: Product) => (
        <div>
          <div className="text-sm font-medium text-gray-900">
            {formatCurrency(row.pricing.sellingPrice, row.pricing.currency)}
          </div>
          <div className="text-sm text-gray-500">
            Cost: {formatCurrency(row.pricing.costPrice, row.pricing.currency)}
          </div>
        </div>
      ),
    },
    {
      key: 'inventory.currentStock',
      label: 'Stock',
      sortable: true,
      render: (row: Product) => {
        const stockStatus = getStockStatus(row.inventory.currentStock, row.inventory.minStock);
        return (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {formatNumber(row.inventory.currentStock)} {row.inventory.unit}
            </div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stockStatus.bg} ${stockStatus.color}`}>
              {stockStatus.status === 'out' && <ExclamationTriangleIcon className="h-3 w-3 mr-1" />}
              {stockStatus.status === 'out' ? 'Out of Stock' : 
               stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
            </span>
          </div>
        );
      },
    },
    {
      key: 'pricing.markup',
      label: 'Markup',
      sortable: true,
      render: (row: Product) => {
        const computed = (row?.pricing?.costPrice || row?.pricing?.costPrice === 0)
            ? ((row.pricing.sellingPrice - row.pricing.costPrice) / (row.pricing.costPrice || 1)) * 100
            : 0;
        const safe = Number.isFinite(computed) ? computed : 0;
        return (
          <span className="text-sm text-gray-900">{safe.toFixed(1)}%</span>
        );
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (row: Product) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          row.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (row: Product) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: Product) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewProduct(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Product"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditProduct(row)}
            className="text-gray-600 hover:text-gray-900"
            title="Edit Product"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteProduct(row)}
            className="text-red-600 hover:text-red-900"
            title="Delete Product"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'inactive', label: 'Inactive' },
  ];

  // Form schema and helpers
  const productSchema = useMemo(() => z.object({
    name: z.string().min(2),
    sku: z.string().min(2),
    barcode: z.string().min(8).max(20).optional().or(z.literal('')),
    description: z.string().max(1000).optional().or(z.literal('')),
    category: z.string().min(1, 'Category is required'),
    pricing: z.object({
      costPrice: z.coerce.number().min(0),
      sellingPrice: z.coerce.number().min(0),
      markup: z.coerce.number().min(0).max(100).optional().default(0),
      taxRate: z.coerce.number().min(0).max(100).optional().default(0),
      currency: z.string().min(1),
    }),
    inventory: z.object({
      currentStock: z.coerce.number().min(0).default(0),
      minStock: z.coerce.number().min(0).default(0),
      maxStock: z.coerce.number().min(0).default(0),
      reorderPoint: z.coerce.number().min(0).default(0),
      unit: z.string().min(1),
      location: z.string().optional().or(z.literal('')),
      warehouse: z.string().min(1, 'Warehouse is required'),
      warehouseLocation: z.object({
        zone: z.string().min(1).default('A'),
        aisle: z.string().min(1).default('01'),
        shelf: z.string().min(1).default('01'),
        bin: z.string().min(1).default('01'),
      }).optional(),
    }),
    isActive: z.boolean().default(true),
  }), []);

  const currencyOptions = [
    { value: 'USD', label: 'USD' },
    { value: 'EUR', label: 'EUR' },
    { value: 'INR', label: 'INR' },
  ];

  const unitOptions = [
    { value: 'pcs', label: 'Pieces' },
    { value: 'kg', label: 'Kilograms' },
    { value: 'ltr', label: 'Liters' },
    { value: 'box', label: 'Box' },
  ];

  return (
    <Layout title="Products">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Products</h1>
            <p className="text-gray-600">Manage your product catalog and inventory</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsManageCategoriesOpen(true)}
            >
              Manage Categories
            </Button>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<PlusIcon className="h-4 w-4" />}
            >
              Add Product
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search products by name, SKU, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                fullWidth
              />
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
                <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                Low Stock
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Products Table */}
        <DataTable
          columns={columns}
          data={Array.isArray(productsData?.data?.data) ? productsData.data.data : []}
          loading={isPending}
          pagination={productsData?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage="No products found"
        />

        {/* Create Product Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Add New Product"
          size="xl"
        >
          <Form
            schema={productSchema}
            defaultValues={{
              name: '',
              sku: '',
              barcode: '',
              description: '',
              category: '',
              pricing: { costPrice: 0, sellingPrice: 0, markup: 0, taxRate: 0, currency: 'USD' },
              inventory: { 
                currentStock: 0, 
                minStock: 0, 
                maxStock: 0, 
                reorderPoint: 0, 
                unit: 'pcs', 
                location: '',
                warehouse: '',
                warehouseLocation: {
                  zone: 'A',
                  aisle: '01',
                  shelf: '01',
                  bin: '01'
                }
              },
              isActive: true,
            }}
            loading={createProductMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Basic Information">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Product Name" required error={methods.formState.errors.name?.message as string}>
                    <Input {...methods.register('name')} placeholder="e.g., Wireless Mouse" fullWidth />
                  </FormField>
                  <FormField label="SKU" required error={methods.formState.errors.sku?.message as string}>
                    <div className="flex gap-2">
                      <Input {...methods.register('sku')} placeholder="e.g., WM-1001" fullWidth />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => methods.setValue('sku', generateSKU())}
                      >
                        Generate
                      </Button>
                    </div>
                  </FormField>
                  <FormField label="Barcode" error={methods.formState.errors.barcode?.message as string}>
                    <Input {...methods.register('barcode')} placeholder="Optional" fullWidth />
                  </FormField>
                  <FormField label="Category" required error={methods.formState.errors.category?.message as string}>
                    <Select
                      {...methods.register('category')}
                      options={(categoriesData?.data?.data || []).map((c: any) => ({ value: c._id, label: c.name }))}
                      placeholder="Select category"
                      fullWidth
                    />
                  </FormField>
                  <FormField label="Description" error={methods.formState.errors.description?.message as string} className="md:col-span-2">
                    <Input {...methods.register('description')} placeholder="Short description" fullWidth />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Pricing">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <FormField label="Cost Price" required error={methods.formState.errors.pricing?.costPrice?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('pricing.costPrice')} fullWidth />
                  </FormField>
                  <FormField label="Selling Price" required error={methods.formState.errors.pricing?.sellingPrice?.message as string}>
                    <Input type="number" step="0.01" {...methods.register('pricing.sellingPrice')} fullWidth />
                  </FormField>
                  <FormField label="Markup %" error={methods.formState.errors.pricing?.markup?.message as string}>
                    <Input type="number" step="0.1" {...methods.register('pricing.markup')} fullWidth />
                  </FormField>
                  <FormField label="Tax Rate %" error={methods.formState.errors.pricing?.taxRate?.message as string}>
                    <Input type="number" step="0.1" {...methods.register('pricing.taxRate')} fullWidth />
                  </FormField>
                  <FormField label="Currency" required error={methods.formState.errors.pricing?.currency?.message as string}>
                    <Select
                      {...methods.register('pricing.currency')}
                      options={currencyOptions}
                      placeholder="Select currency"
                      fullWidth
                    />
                  </FormField>
                </div>
              </FormSection>

              <FormSection title="Inventory">
                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                  <FormField label="Current Stock" error={methods.formState.errors.inventory?.currentStock?.message as string}>
                    <Input type="number" {...methods.register('inventory.currentStock')} fullWidth />
                  </FormField>
                  <FormField label="Min Stock" error={methods.formState.errors.inventory?.minStock?.message as string}>
                    <Input type="number" {...methods.register('inventory.minStock')} fullWidth />
                  </FormField>
                  <FormField label="Max Stock" error={methods.formState.errors.inventory?.maxStock?.message as string}>
                    <Input type="number" {...methods.register('inventory.maxStock')} fullWidth />
                  </FormField>
                  <FormField label="Reorder Point" error={methods.formState.errors.inventory?.reorderPoint?.message as string}>
                    <Input type="number" {...methods.register('inventory.reorderPoint')} fullWidth />
                  </FormField>
                  <FormField label="Unit" required error={methods.formState.errors.inventory?.unit?.message as string}>
                    <Select
                      {...methods.register('inventory.unit')}
                      options={unitOptions}
                      placeholder="Select unit"
                      fullWidth
                    />
                  </FormField>
                  <FormField label="Location" error={methods.formState.errors.inventory?.location?.message as string}>
                    <Input {...methods.register('inventory.location')} placeholder="e.g., Aisle 3" fullWidth />
                  </FormField>
                </div>
                
                {/* Warehouse Selection */}
                <div className="mt-4">
                  <FormField label="Warehouse *" error={methods.formState.errors.inventory?.warehouse?.message as string}>
                    <Select
                      {...methods.register('inventory.warehouse')}
                      options={(
                        Array.isArray(warehousesData?.data?.data)
                          ? warehousesData.data.data
                          : Array.isArray(warehousesData?.data)
                            ? warehousesData.data
                            : []
                      ).map((warehouse: any) => ({
                        value: warehouse._id,
                        label: `${warehouse.name} (${warehouse.code})`
                      }))}
                      placeholder="Select a warehouse"
                      fullWidth
                    />
                  </FormField>
                </div>

                {/* Warehouse Location */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Warehouse Location</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FormField label="Zone" error={methods.formState.errors.inventory?.warehouseLocation?.zone?.message as string}>
                      <Input 
                        {...methods.register('inventory.warehouseLocation.zone')} 
                        placeholder="A" 
                        defaultValue="A"
                        fullWidth 
                      />
                    </FormField>
                    <FormField label="Aisle" error={methods.formState.errors.inventory?.warehouseLocation?.aisle?.message as string}>
                      <Input 
                        {...methods.register('inventory.warehouseLocation.aisle')} 
                        placeholder="01" 
                        defaultValue="01"
                        fullWidth 
                      />
                    </FormField>
                    <FormField label="Shelf" error={methods.formState.errors.inventory?.warehouseLocation?.shelf?.message as string}>
                      <Input 
                        {...methods.register('inventory.warehouseLocation.shelf')} 
                        placeholder="01" 
                        defaultValue="01"
                        fullWidth 
                      />
                    </FormField>
                    <FormField label="Bin" error={methods.formState.errors.inventory?.warehouseLocation?.bin?.message as string}>
                      <Input 
                        {...methods.register('inventory.warehouseLocation.bin')} 
                        placeholder="01" 
                        defaultValue="01"
                        fullWidth 
                      />
                    </FormField>
                  </div>
                </div>
              </FormSection>

              <FormActions
                onCancel={() => setIsCreateModalOpen(false)}
                onSubmit={async () => {
                  const isValid = await methods.trigger();
                  if (isValid) {
                    const values = methods.getValues();
                    const payload = {
                      ...values,
                      // Clean optional empty strings
                      barcode: values.barcode || undefined,
                      description: values.description || undefined,
                      inventory: {
                        ...values.inventory,
                        location: values.inventory.location || undefined,
                      },
                    };
                    await createProductMutation.mutateAsync(payload);
                  } else {
                    toast.error('Please fill in all required fields');
                  }
                }}
                submitText={createProductMutation.isPending ? 'Creating...' : 'Create Product'}
                loading={createProductMutation.isPending}
              />
            </div>
          )}</Form>
        </Modal>
        {/* Manage Categories Modal */}
        <Modal
          isOpen={isManageCategoriesOpen}
          onClose={() => setIsManageCategoriesOpen(false)}
          title="Manage Categories"
          size="lg"
        >
          <div className="space-y-4">
            <Form
              schema={z.object({ name: z.string().min(2), description: z.string().optional().or(z.literal('')) })}
              defaultValues={{ name: '', description: '' }}
              onSubmit={async (values) => {
                await categoriesAPI.createCategory({
                  name: values.name,
                  description: values.description || undefined,
                });
                await queryClient.invalidateQueries({ queryKey: ['categories'] });
              }}
            >{(methods) => (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                  <FormField label="New Category Name" required error={methods.formState.errors.name?.message as string}>
                    <Input {...methods.register('name')} fullWidth />
                  </FormField>
                  <FormField label="Description" error={methods.formState.errors.description?.message as string}>
                    <Input {...methods.register('description')} fullWidth />
                  </FormField>
                  <Button type="submit">Add Category</Button>
                </div>
              </div>
            )}</Form>

            <div className="max-h-80 overflow-y-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(categoriesData?.data?.data || []).map((c: any) => (
                    <tr key={c._id}>
                      <td className="px-3 py-2 text-sm text-gray-900">
                        <input
                          defaultValue={c.name}
                          className="input h-8"
                          onBlur={async (e) => {
                            const newName = e.target.value.trim();
                            if (newName && newName !== c.name) {
                              await categoriesAPI.updateCategory(c._id, { name: newName });
                              await queryClient.invalidateQueries({ queryKey: ['categories'] });
                              toast.success('Category updated');
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">
                        <input
                          defaultValue={c.description || ''}
                          className="input h-8"
                          onBlur={async (e) => {
                            const newDesc = e.target.value.trim();
                            if ((newDesc || c.description) && newDesc !== (c.description || '')) {
                              await categoriesAPI.updateCategory(c._id, { description: newDesc || undefined });
                              await queryClient.invalidateQueries({ queryKey: ['categories'] });
                              toast.success('Category updated');
                            }
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-sm text-right">
                        <Button
                          variant="outline"
                          onClick={async () => {
                            if (window.confirm(`Delete category "${c.name}"?`)) {
                              await categoriesAPI.deleteCategory(c._id);
                              await queryClient.invalidateQueries({ queryKey: ['categories'] });
                              toast.success('Category deleted');
                            }
                          }}
                        >
                          Delete
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>

        {/* Edit Product Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Product"
          size="xl"
        >
          {selectedProduct && (
            <Form
              schema={productSchema}
              defaultValues={{
                name: selectedProduct.name,
                sku: selectedProduct.sku,
                barcode: selectedProduct.barcode || '',
                description: selectedProduct.description || '',
                category: typeof selectedProduct.category === 'string' ? selectedProduct.category : (selectedProduct.category as any)?._id || '',
                pricing: {
                  costPrice: selectedProduct.pricing.costPrice,
                  sellingPrice: selectedProduct.pricing.sellingPrice,
                  markup: selectedProduct.pricing.markup,
                  currency: selectedProduct.pricing.currency,
                },
                inventory: {
                  currentStock: selectedProduct.inventory.currentStock,
                  minStock: selectedProduct.inventory.minStock,
                  maxStock: selectedProduct.inventory.maxStock,
                  reorderPoint: selectedProduct.inventory.reorderPoint,
                  unit: selectedProduct.inventory.unit,
                  location: selectedProduct.inventory.location || '',
                  warehouse: selectedProduct.inventory.warehouse || '',
                  warehouseLocation: {
                    zone: selectedProduct.inventory.warehouseLocation?.zone || 'A',
                    aisle: selectedProduct.inventory.warehouseLocation?.aisle || '01',
                    shelf: selectedProduct.inventory.warehouseLocation?.shelf || '01',
                    bin: selectedProduct.inventory.warehouseLocation?.bin || '01',
                  },
                },
                isActive: selectedProduct.isActive,
              }}
              loading={updateProductMutation.isPending}
            >{(methods) => (
              <div className="space-y-6">
                <FormSection title="Basic Information">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField label="Product Name" required error={methods.formState.errors.name?.message as string}>
                      <Input {...methods.register('name')} fullWidth />
                    </FormField>
                    <FormField label="SKU" required error={methods.formState.errors.sku?.message as string}>
                      <div className="flex gap-2">
                        <Input {...methods.register('sku')} fullWidth />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => methods.setValue('sku', generateSKU())}
                        >
                          Generate
                        </Button>
                      </div>
                    </FormField>
                    <FormField label="Barcode" error={methods.formState.errors.barcode?.message as string}>
                      <Input {...methods.register('barcode')} fullWidth />
                    </FormField>
                    <FormField label="Category" required error={methods.formState.errors.category?.message as string}>
                      <Select
                        {...methods.register('category')}
                        options={(categoriesData?.data?.data || []).map((c: any) => ({ value: c._id, label: c.name }))}
                        placeholder="Select category"
                        fullWidth
                      />
                    </FormField>
                    <FormField label="Description" error={methods.formState.errors.description?.message as string} className="md:col-span-2">
                      <Input {...methods.register('description')} fullWidth />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Pricing">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                    <FormField label="Cost Price" required error={methods.formState.errors.pricing?.costPrice?.message as string}>
                      <Input type="number" step="0.01" {...methods.register('pricing.costPrice')} fullWidth />
                    </FormField>
                    <FormField label="Selling Price" required error={methods.formState.errors.pricing?.sellingPrice?.message as string}>
                      <Input type="number" step="0.01" {...methods.register('pricing.sellingPrice')} fullWidth />
                    </FormField>
                    <FormField label="Markup %" error={methods.formState.errors.pricing?.markup?.message as string}>
                      <Input type="number" step="0.1" {...methods.register('pricing.markup')} fullWidth />
                    </FormField>
                    <FormField label="Tax Rate %" error={methods.formState.errors.pricing?.taxRate?.message as string}>
                      <Input type="number" step="0.1" {...methods.register('pricing.taxRate')} fullWidth />
                    </FormField>
                    <FormField label="Currency" required error={methods.formState.errors.pricing?.currency?.message as string}>
                      <Select
                        {...methods.register('pricing.currency')}
                        options={currencyOptions}
                        placeholder="Select currency"
                        fullWidth
                      />
                    </FormField>
                  </div>
                </FormSection>

                <FormSection title="Inventory">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <FormField label="Current Stock" error={methods.formState.errors.inventory?.currentStock?.message as string}>
                      <Input type="number" {...methods.register('inventory.currentStock')} fullWidth />
                    </FormField>
                    <FormField label="Min Stock" error={methods.formState.errors.inventory?.minStock?.message as string}>
                      <Input type="number" {...methods.register('inventory.minStock')} fullWidth />
                    </FormField>
                    <FormField label="Max Stock" error={methods.formState.errors.inventory?.maxStock?.message as string}>
                      <Input type="number" {...methods.register('inventory.maxStock')} fullWidth />
                    </FormField>
                    <FormField label="Reorder Point" error={methods.formState.errors.inventory?.reorderPoint?.message as string}>
                      <Input type="number" {...methods.register('inventory.reorderPoint')} fullWidth />
                    </FormField>
                    <FormField label="Unit" required error={methods.formState.errors.inventory?.unit?.message as string}>
                      <Select
                        {...methods.register('inventory.unit')}
                        options={unitOptions}
                        placeholder="Select unit"
                        fullWidth
                      />
                    </FormField>
                    <FormField label="Location" error={methods.formState.errors.inventory?.location?.message as string}>
                      <Input {...methods.register('inventory.location')} fullWidth />
                    </FormField>
                  </div>
                  
                  {/* Warehouse Selection */}
                  <div className="mt-4">
                    <FormField label="Warehouse *" error={methods.formState.errors.inventory?.warehouse?.message as string}>
                      <Select
                        {...methods.register('inventory.warehouse')}
                        options={(
                          Array.isArray(warehousesData?.data?.data)
                            ? warehousesData.data.data
                            : Array.isArray(warehousesData?.data)
                              ? warehousesData.data
                              : []
                        ).map((warehouse: any) => ({
                          value: warehouse._id,
                          label: `${warehouse.name} (${warehouse.code})`
                        }))}
                        placeholder="Select a warehouse"
                        fullWidth
                      />
                    </FormField>
                  </div>

                  {/* Warehouse Location */}
                  <div className="mt-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Warehouse Location</h4>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField label="Zone" error={methods.formState.errors.inventory?.warehouseLocation?.zone?.message as string}>
                        <Input 
                          {...methods.register('inventory.warehouseLocation.zone')} 
                          placeholder="A" 
                          fullWidth 
                        />
                      </FormField>
                      <FormField label="Aisle" error={methods.formState.errors.inventory?.warehouseLocation?.aisle?.message as string}>
                        <Input 
                          {...methods.register('inventory.warehouseLocation.aisle')} 
                          placeholder="01" 
                          fullWidth 
                        />
                      </FormField>
                      <FormField label="Shelf" error={methods.formState.errors.inventory?.warehouseLocation?.shelf?.message as string}>
                        <Input 
                          {...methods.register('inventory.warehouseLocation.shelf')} 
                          placeholder="01" 
                          fullWidth 
                        />
                      </FormField>
                      <FormField label="Bin" error={methods.formState.errors.inventory?.warehouseLocation?.bin?.message as string}>
                        <Input 
                          {...methods.register('inventory.warehouseLocation.bin')} 
                          placeholder="01" 
                          fullWidth 
                        />
                      </FormField>
                    </div>
                  </div>
                </FormSection>

                <FormActions
                  onCancel={() => setIsEditModalOpen(false)}
                  onSubmit={async () => {
                    const isValid = await methods.trigger();
                    if (isValid) {
                      const values = methods.getValues();
                      const payload = {
                        ...values,
                        barcode: values.barcode || undefined,
                        description: values.description || undefined,
                        inventory: {
                          ...values.inventory,
                          location: values.inventory.location || undefined,
                        },
                      };
                      await updateProductMutation.mutateAsync({ id: selectedProduct._id, data: payload });
                    } else {
                      toast.error('Please fill in all required fields');
                    }
                  }}
                  submitText={updateProductMutation.isPending ? 'Saving...' : 'Save Changes'}
                  loading={updateProductMutation.isPending}
                />
              </div>
            )}</Form>
          )}
        </Modal>

        {/* View Product Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Product Details"
          size="lg"
        >
          {selectedProduct && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <p className="text-sm text-gray-900">{selectedProduct.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <p className="text-sm text-gray-900">{selectedProduct.sku}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(selectedProduct.pricing.sellingPrice, selectedProduct.pricing.currency)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(selectedProduct.pricing.costPrice, selectedProduct.pricing.currency)}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <p className="text-sm text-gray-900">
                    {formatNumber(selectedProduct.inventory.currentStock)} {selectedProduct.inventory.unit}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Stock</label>
                  <p className="text-sm text-gray-900">
                    {formatNumber(selectedProduct.inventory.minStock)} {selectedProduct.inventory.unit}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Markup</label>
                  <p className="text-sm text-gray-900">
                    {typeof selectedProduct.pricing.markup === 'number' 
                      ? `${selectedProduct.pricing.markup.toFixed(1)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <p className="text-sm text-gray-900">
                    {selectedProduct.isActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
              </div>
              {selectedProduct.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <p className="text-sm text-gray-900">{selectedProduct.description}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setIsViewModalOpen(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default ProductsPage;
