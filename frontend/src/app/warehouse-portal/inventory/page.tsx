'use client';

import React, { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import WarehousePortalLayout from '../layout';
import { useQuery } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  BuildingOfficeIcon,
  EyeIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warehouse Inventory</h1>
            <p className="text-gray-600">Manage inventory in this warehouse</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
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
          <div className="bg-white p-6 rounded-lg shadow">
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
          <div className="bg-white p-6 rounded-lg shadow">
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
          <div className="bg-white p-6 rounded-lg shadow">
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

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
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
        <div className="bg-white rounded-lg shadow">
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Product Information</h3>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Inventory Information</h3>
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
      </div>
    </WarehousePortalLayout>
  );
};

export default WarehouseInventory;
