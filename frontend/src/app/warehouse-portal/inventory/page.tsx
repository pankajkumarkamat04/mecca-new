'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import {
  BuildingOfficeIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PencilIcon,
  ClipboardDocumentListIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { productsAPI, enhancedInventoryAPI } from '@/lib/api';
import ProductSelector from '@/components/ui/ProductSelector';
import { Product } from '@/types';

interface InventoryItem {
  product: {
    _id: string;
    name: string;
    sku: string;
    category: {
      name: string;
    };
    supplier: {
      name: string;
    };
  };
  stockStatus: string;
  location: any;
  lastMovement: string;
  currentStock: number;
  costPrice: number;
  totalValue: number;
}

const WarehouseInventory: React.FC = () => {
  const searchParams = useSearchParams();
  const warehouseId = searchParams.get('warehouse');
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockTakeModal, setShowStockTakeModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch warehouse inventory
  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['warehouse-inventory', warehouseId, searchTerm, statusFilter],
    queryFn: () => warehouseAPI.getWarehouseInventory(warehouseId!),
    enabled: !!warehouseId,
  });

  const inventory = inventoryData?.data?.data?.inventory || [];
  const filteredInventory = inventory.filter((item: InventoryItem) => {
    const matchesSearch = item.product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || item.stockStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'in_stock':
        return 'bg-green-100 text-green-800';
      case 'low_stock':
        return 'bg-yellow-100 text-yellow-800';
      case 'out_of_stock':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusIcon = (status: string) => {
    switch (status) {
      case 'in_stock':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'low_stock':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'out_of_stock':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      default:
        return <CheckCircleIcon className="h-4 w-4" />;
    }
  };

  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (row: InventoryItem) => (
        <div>
          <div className="font-medium text-gray-900">{row.product.name}</div>
          <div className="text-sm text-gray-500">SKU: {row.product.sku}</div>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      render: (row: InventoryItem) => (
        <div className="text-sm text-gray-900">
          {row.product.category?.name || 'No category'}
        </div>
      ),
    },
    {
      key: 'currentStock',
      label: 'Stock',
      render: (row: InventoryItem) => (
        <div>
          <div className="font-medium text-gray-900">{row.product.name}</div>
          <div className="text-sm text-gray-500">
            ${(row.costPrice || 0).toFixed(2)} per unit
          </div>
        </div>
      ),
    },
    {
      key: 'stockStatus',
      label: 'Status',
      render: (row: InventoryItem) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(row.stockStatus)}`}>
          {getStockStatusIcon(row.stockStatus)}
          <span className="ml-1">{row.stockStatus.replace('_', ' ')}</span>
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (row: InventoryItem) => (
        <div className="text-sm text-gray-900">
          {row.location && typeof row.location === 'object' 
            ? `${row.location.zone}-${row.location.aisle}-${row.location.shelf}-${row.location.bin}` 
            : row.location || 'No location'}
        </div>
      ),
    },
    {
      key: 'totalValue',
      label: 'Value',
      render: (row: InventoryItem) => (
        <div className="font-medium text-gray-900">
          ${(row.totalValue || 0).toFixed(2)}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: InventoryItem) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedProduct(row);
              setShowProductModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setSelectedProduct(row);
              setShowEditModal(true);
            }}
            className="text-amber-600 hover:text-amber-800"
            title="Edit Inventory"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  return (
    <WarehousePortalLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Warehouse Inventory</h1>
          <p className="text-sm text-gray-600 sm:text-base">Manage inventory in this warehouse</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">📦</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Products</p>
                <p className="text-2xl font-bold text-gray-900">{filteredInventory.length}</p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredInventory.filter((item: InventoryItem) => item.stockStatus === 'in_stock').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredInventory.filter((item: InventoryItem) => item.stockStatus === 'low_stock').length}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Out of Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {filteredInventory.filter((item: InventoryItem) => item.stockStatus === 'out_of_stock').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock Take Section */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Stock Taking / Cycle Count</h2>
              <p className="text-sm text-gray-600 mt-1">
                Perform physical inventory counts and adjust stock levels based on actual quantities
              </p>
            </div>
            <Button
              onClick={() => setShowStockTakeModal(true)}
              leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
              className="w-full sm:w-auto"
            >
              Start Stock Take
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Stock Take Process</p>
                  <p className="text-lg font-semibold text-gray-900">Physical Count</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-green-50 border border-green-200 p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Accuracy</p>
                  <p className="text-lg font-semibold text-gray-900">Verified</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-4">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <ArrowUpIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Auto Adjustment</p>
                  <p className="text-lg font-semibold text-gray-900">Enabled</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-lg bg-white p-4 shadow sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_200px]">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="flex w-full items-center">
              <Select
                value={statusFilter}
                onChange={(e) => handleStatusFilter(e.target.value)}
                options={[
                  { value: 'all', label: 'All Status' },
                  { value: 'in_stock', label: 'In Stock' },
                  { value: 'low_stock', label: 'Low Stock' },
                  { value: 'out_of_stock', label: 'Out of Stock' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="rounded-lg bg-white shadow">
          <DataTable
            data={filteredInventory}
            columns={columns}
            loading={isLoading}
          />
        </div>

        {/* Product Details Modal */}
        <Modal
          isOpen={showProductModal}
          onClose={() => setShowProductModal(false)}
          title={`Product Details - ${selectedProduct?.product.name}`}
        >
          {selectedProduct && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Product Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="text-sm text-gray-900">{selectedProduct.product.name}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">SKU</dt>
                      <dd className="text-sm text-gray-900">{selectedProduct.product.sku}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Category</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedProduct.product.category?.name || 'No category'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Supplier</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedProduct.product.supplier?.name || 'No supplier'}
                      </dd>
                    </div>
                  </dl>
                </div>
                <div>
                  <h3 className="mb-2 text-lg font-medium text-gray-900">Inventory Information</h3>
                  <dl className="space-y-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Current Stock</dt>
                      <dd className="text-sm text-gray-900">{selectedProduct.currentStock}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="text-sm">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(selectedProduct.stockStatus)}`}>
                          {getStockStatusIcon(selectedProduct.stockStatus)}
                          <span className="ml-1">{selectedProduct.stockStatus.replace('_', ' ')}</span>
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Location</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedProduct.location && typeof selectedProduct.location === 'object' 
                          ? `${selectedProduct.location.zone}-${selectedProduct.location.aisle}-${selectedProduct.location.shelf}-${selectedProduct.location.bin}` 
                          : selectedProduct.location || 'No location'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Cost Price</dt>
                      <dd className="text-sm text-gray-900">${(selectedProduct.costPrice || 0).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Total Value</dt>
                      <dd className="text-sm text-gray-900">${(selectedProduct.totalValue || 0).toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Last Movement</dt>
                      <dd className="text-sm text-gray-900">
                        {selectedProduct.lastMovement ? new Date(selectedProduct.lastMovement).toLocaleString() : 'No movements'}
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Edit Inventory Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          title={`Edit Inventory - ${selectedProduct?.product.name}`}
        >
          {selectedProduct && (
            <EditInventoryForm
              product={selectedProduct}
              warehouseId={warehouseId}
              onClose={() => setShowEditModal(false)}
            />
          )}
        </Modal>

        {/* Stock Take Modal */}
        <Modal
          isOpen={showStockTakeModal}
          onClose={() => setShowStockTakeModal(false)}
          title="Stock Taking / Cycle Count"
          size="xl"
        >
          <WarehouseStockTakingModal 
            warehouseId={warehouseId} 
            onClose={() => setShowStockTakeModal(false)} 
          />
        </Modal>
      </div>
    </WarehousePortalLayout>
  );
};

export default WarehouseInventory;

// Edit Inventory Form Component
const EditInventoryForm: React.FC<{
  product: InventoryItem;
  warehouseId: string | null;
  onClose: () => void;
}> = ({ product, warehouseId, onClose }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    currentStock: product.currentStock,
    location: product.location && typeof product.location === 'object' 
      ? {
          zone: product.location.zone || '',
          aisle: product.location.aisle || '',
          shelf: product.location.shelf || '',
          bin: product.location.bin || '',
        }
      : {},
    notes: '',
  });

  const updateInventoryMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!warehouseId) throw new Error('Warehouse ID is required');
      
      // Call warehouse API to update inventory
      return warehouseAPI.updateInventory(warehouseId, product.product._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] });
      toast.success('Inventory updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update inventory');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateInventoryMutation.mutateAsync({
      currentStock: formData.currentStock,
      location: formData.location,
      notes: formData.notes,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-lg bg-gray-50 p-4">
        <h3 className="mb-2 font-medium text-gray-900">Product Information</h3>
        <div className="text-sm text-gray-600">
          <p><strong>Name:</strong> {product.product.name}</p>
          <p><strong>SKU:</strong> {product.product.sku}</p>
          <p><strong>Category:</strong> {product.product.category?.name || 'No category'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Stock *
          </label>
          <Input
            type="number"
            value={formData.currentStock}
            onChange={(e) => setFormData({ ...formData, currentStock: Number(e.target.value) })}
            min="0"
            required
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-3 text-lg font-medium text-gray-900">Location Information</h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Zone
            </label>
            <Input
              value={formData.location.zone || ''}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, zone: e.target.value }
              })}
              placeholder="A1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Aisle
            </label>
            <Input
              value={formData.location.aisle || ''}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, aisle: e.target.value }
              })}
              placeholder="01"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Shelf
            </label>
            <Input
              value={formData.location.shelf || ''}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, shelf: e.target.value }
              })}
              placeholder="A"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bin
            </label>
            <Input
              value={formData.location.bin || ''}
              onChange={(e) => setFormData({
                ...formData,
                location: { ...formData.location, bin: e.target.value }
              })}
              placeholder="01"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          placeholder="Add notes about inventory changes..."
        />
      </div>

      <div className="flex flex-col gap-2 pt-4 sm:flex-row sm:justify-end sm:gap-3">
        <Button type="button" variant="secondary" onClick={onClose} className="w-full sm:w-auto">
          Cancel
        </Button>
        <Button type="submit" disabled={updateInventoryMutation.isPending} className="w-full sm:w-auto">
          {updateInventoryMutation.isPending ? 'Updating...' : 'Update Inventory'}
        </Button>
      </div>
    </form>
  );
};

// Warehouse Stock Taking Modal Component (adapted for warehouse portal)
const WarehouseStockTakingModal: React.FC<{ 
  warehouseId: string | null;
  onClose: () => void;
}> = ({ warehouseId, onClose }) => {
  const queryClient = useQueryClient();
  const [stockItems, setStockItems] = useState<Array<{ productId: string; actualQuantity: number }>>([]);
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actualQuantity, setActualQuantity] = useState(0);

  const { data: productsList, isLoading: productsLoading } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 }),
    staleTime: 60_000
  });

  const stockTakingMutation = useMutation({
    mutationFn: (data: any) => enhancedInventoryAPI.performStockTaking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock taking completed successfully');
      onClose();
      // Reset form
      setStockItems([]);
      setNotes('');
      setSelectedProduct(null);
      setActualQuantity(0);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete stock taking');
    }
  });

  const addStockItem = () => {
    if (selectedProduct && actualQuantity >= 0) {
      // Check if product already exists in the list
      const existingIndex = stockItems.findIndex(item => item.productId === selectedProduct._id);
      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...stockItems];
        updated[existingIndex] = { productId: selectedProduct._id, actualQuantity };
        setStockItems(updated);
      } else {
        // Add new item
        setStockItems([...stockItems, { productId: selectedProduct._id, actualQuantity }]);
      }
      setSelectedProduct(null);
      setActualQuantity(0);
    }
  };

  const removeStockItem = (index: number) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!warehouseId) {
      toast.error('Warehouse ID is required');
      return;
    }
    if (stockItems.length === 0) {
      toast.error('Please add at least one product to count');
      return;
    }

    stockTakingMutation.mutate({
      warehouseId,
      products: stockItems,
      notes
    });
  };

  return (
    <div className="space-y-6">
      {productsLoading ? (
        <div className="text-center py-4">
          <div className="text-gray-500">Loading products...</div>
        </div>
      ) : (
        <>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <p className="text-sm font-medium text-gray-700">Warehouse</p>
                <p className="text-sm text-gray-600">Stock take will be performed for this warehouse</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes about this stock take..."
              fullWidth
            />
          </div>

          <div className="border rounded-lg p-4 bg-gray-50">
            <h3 className="text-lg font-medium mb-4 text-gray-900">Add Products to Count</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <ProductSelector
                selectedProduct={selectedProduct}
                onProductSelect={(product: Product | null) => {
                  if (product) {
                    setSelectedProduct(product);
                    // Check if product already in list and pre-fill quantity
                    const existing = stockItems.find(item => item.productId === product._id);
                    if (existing) {
                      setActualQuantity(existing.actualQuantity);
                    }
                  } else {
                    setSelectedProduct(null);
                  }
                }}
                placeholder="Select product..."
              />
              <Input
                type="number"
                step="1"
                min="0"
                value={actualQuantity}
                onChange={(e) => setActualQuantity(Number(e.target.value))}
                placeholder="Actual quantity found"
                fullWidth
              />
              <Button 
                onClick={addStockItem} 
                disabled={!selectedProduct || actualQuantity < 0}
                className="w-full"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            {stockItems.length > 0 && (
              <div className="space-y-2 mt-4">
                <h4 className="font-medium text-gray-900">Products to Count:</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {stockItems.map((item, index) => {
                    const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
                    const recordedStock = product?.inventory?.currentStock || 0;
                    const difference = item.actualQuantity - recordedStock;
                    return (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product?.name || 'Product not found'}</p>
                          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                            <span>Recorded: <strong>{recordedStock}</strong></span>
                            <span>Actual: <strong className="text-blue-600">{item.actualQuantity}</strong></span>
                            <span className={`font-medium ${difference !== 0 ? difference > 0 ? 'text-green-600' : 'text-red-600' : 'text-gray-600'}`}>
                              {difference > 0 ? `+${difference}` : difference}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeStockItem(index)}
                          className="ml-4 p-1 text-red-600 hover:text-red-800"
                          title="Remove"
                        >
                          <XMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              loading={stockTakingMutation.isPending}
              disabled={!warehouseId || stockItems.length === 0}
              className="w-full sm:w-auto"
            >
              Complete Stock Take
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
