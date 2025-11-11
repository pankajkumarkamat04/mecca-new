'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { inventoryAPI, productsAPI, enhancedInventoryAPI, warehouseAPI, stockAlertAPI } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { StockMovement, Product } from '@/types';
import toast from 'react-hot-toast';
import { z } from 'zod';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import ProductSelector from '@/components/ui/ProductSelector';
import FormProductSelector from '@/components/ui/FormProductSelector';
import {
  PlusIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowPathIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ChartBarIcon,
  BuildingOfficeIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  PaperAirplaneIcon,
  MapPinIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { generateReportPDF, generateReportCSV, generateReportExcel, createReportData } from '@/lib/reportUtils';

// Stock Taking Modal Component
const StockTakingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [stockItems, setStockItems] = useState<Array<{ productId: string; actualQuantity: number }>>([]);
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [actualQuantity, setActualQuantity] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [reviewResults, setReviewResults] = useState<any>(null);

  const queryClient = useQueryClient();
  const { data: productsList, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 }),
    staleTime: 60_000
  });

  const { data: warehousesList, isLoading: warehousesLoading, error: warehousesError } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseAPI.getWarehouses({ limit: 100 }),
    staleTime: 60_000
  });

  const stockTakingMutation = useMutation({
    mutationFn: (data: any) => enhancedInventoryAPI.performStockTaking(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      queryClient.invalidateQueries({ queryKey: ['stock-take-sessions'] });
      // Show review results
      setReviewResults(response?.data?.data || response?.data);
      setShowReview(true);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete stock taking');
    }
  });

  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addStockItem = () => {
    if (selectedProduct && actualQuantity >= 0) {
      setStockItems([...stockItems, { productId: selectedProduct._id, actualQuantity }]);
      setSelectedProduct(null);
      setActualQuantity(0);
    }
  };

  const removeStockItem = (index: number) => {
    setStockItems(stockItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!warehouseId || stockItems.length === 0) {
      toast.error('Please select warehouse and add stock items');
      return;
    }

    stockTakingMutation.mutate({
      warehouseId,
      products: stockItems,
      notes
    });
  };

  // Calculate preview differences before submission
  const getPreviewDifferences = () => {
    return stockItems.map(item => {
      const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
      if (!product) return null;
      const recordedStock = product.inventory?.currentStock || 0;
      const actualStock = item.actualQuantity;
      const difference = actualStock - recordedStock;
      return {
        product: product.name,
        sku: product.sku,
        recordedStock,
        actualStock,
        difference,
        adjusted: difference !== 0
      };
    }).filter(Boolean);
  };

  const previewDifferences = getPreviewDifferences();

  // If showing review results, display them
  if (showReview && reviewResults) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">Stock Taking Completed Successfully</h3>
          </div>
          <p className="text-sm text-green-700">
            Warehouse: {reviewResults.warehouse} | 
            Products Checked: {reviewResults.totalProductsChecked} | 
            Adjustments Made: {reviewResults.adjustmentsMade}
          </p>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Review Differences</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recorded Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual Stock</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reviewResults.stockTakingResults?.map((result: any, index: number) => (
                  <tr key={index} className={result.difference !== 0 ? 'bg-yellow-50' : ''}>
                    <td className="px-4 py-3 text-sm text-gray-900">{result.product}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{result.sku}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{result.recordedStock}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{result.actualStock}</td>
                    <td className={`px-4 py-3 text-sm font-medium text-right ${
                      result.difference > 0 ? 'text-green-600' : result.difference < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {result.difference > 0 ? '+' : ''}{result.difference}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {result.adjusted ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Adjusted
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          No Change
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button onClick={() => {
            setShowReview(false);
            setReviewResults(null);
            onClose();
          }}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Loading States */}
      {productsLoading || warehousesLoading ? (
        <div className="text-center py-4">
          <div className="text-gray-500">Loading products and warehouses...</div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
          <Select
            options={[{ value: '', label: 'Select warehouse', disabled: true }, ...warehouseOptions]}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            fullWidth
            disabled={warehousesLoading}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            fullWidth
          />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Add Stock Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <ProductSelector
            selectedProduct={selectedProduct}
            onProductSelect={(product) => setSelectedProduct(product)}
            placeholder="Select product..."
          />
          <Input
            type="number"
            step="1"
            min="0"
            value={actualQuantity}
            onChange={(e) => setActualQuantity(Number(e.target.value))}
            placeholder="Actual quantity"
            fullWidth
          />
          <Button 
            onClick={addStockItem} 
            disabled={!selectedProduct || actualQuantity < 0}
          >
            Add Item
          </Button>
        </div>

        {stockItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Stock Items to Count:</h4>
            {stockItems.map((item, index) => {
              const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
              const recordedStock = product?.inventory?.currentStock || 0;
              const difference = item.actualQuantity - recordedStock;
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <span className="font-medium">{product?.name || 'Product not found'}</span>
                    <div className="text-xs text-gray-600 mt-1">
                      Recorded: {recordedStock} | Actual: {item.actualQuantity} | 
                      <span className={difference !== 0 ? difference > 0 ? 'text-green-600' : 'text-red-600' : 'text-gray-600'}>
                        {' '}Diff: {difference > 0 ? '+' : ''}{difference}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="danger" onClick={() => removeStockItem(index)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Preview Differences Table */}
        {previewDifferences.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="font-medium mb-3">Preview of Differences:</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Recorded</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewDifferences.map((diff: any, index: number) => (
                    <tr key={index} className={diff.difference !== 0 ? 'bg-yellow-50' : ''}>
                      <td className="px-3 py-2 text-sm text-gray-900">{diff.product}</td>
                      <td className="px-3 py-2 text-sm text-gray-600 text-right">{diff.recordedStock}</td>
                      <td className="px-3 py-2 text-sm text-gray-900 text-right">{diff.actualStock}</td>
                      <td className={`px-3 py-2 text-sm font-medium text-right ${
                        diff.difference > 0 ? 'text-green-600' : diff.difference < 0 ? 'text-red-600' : 'text-gray-600'
                      }`}>
                        {diff.difference > 0 ? '+' : ''}{diff.difference}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between gap-2">
        <div>
          {stockItems.length > 0 && (
            <Button 
              variant="outline"
              onClick={() => {
                // Forward to management functionality
                if (confirm('Forward stock take results to management?')) {
                  // TODO: Implement forward to management API call
                  toast.success('Stock take results will be forwarded to management upon completion');
                }
              }}
              leftIcon={<PaperAirplaneIcon className="h-4 w-4" />}
            >
              Forward to Management
            </Button>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            loading={stockTakingMutation.isPending}
            disabled={!warehouseId || stockItems.length === 0}
          >
            Complete Stock Taking
          </Button>
        </div>
      </div>
    </div>
  );
};

// Receiving Modal Component
const ReceivingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [receivedItems, setReceivedItems] = useState<Array<{ 
    productId: string; 
    quantity: number; 
    unitCost: number; 
    batchNumber?: string;
    location?: string;
  }>>([]);
  const [purchaseOrderId, setPurchaseOrderId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [batchNumber, setBatchNumber] = useState('');
  const [location, setLocation] = useState('');

  const queryClient = useQueryClient();
  const { data: productsList, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 }),
    staleTime: 60_000
  });

  const { data: warehousesList, isLoading: warehousesLoading, error: warehousesError } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseAPI.getWarehouses({ limit: 100 }),
    staleTime: 60_000
  });

  const receivingMutation = useMutation({
    mutationFn: (data: any) => enhancedInventoryAPI.processReceiving(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Goods received successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process receiving');
    }
  });

  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addReceivedItem = () => {
    if (selectedProduct && quantity > 0) {
      setReceivedItems([...receivedItems, { 
        productId: selectedProduct._id, 
        quantity, 
        unitCost,
        batchNumber: batchNumber || undefined,
        location: location || undefined
      }]);
      setSelectedProduct(null);
      setQuantity(0);
      setUnitCost(0);
      setBatchNumber('');
      setLocation('');
    }
  };

  const removeReceivedItem = (index: number) => {
    setReceivedItems(receivedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!warehouseId || receivedItems.length === 0) {
      toast.error('Please select warehouse and add received items');
      return;
    }

    receivingMutation.mutate({
      warehouseId,
      receivedItems,
      purchaseOrderId: purchaseOrderId || undefined,
      notes
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
          <Select
            options={[{ value: '', label: 'Select warehouse', disabled: true }, ...warehouseOptions]}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            fullWidth
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Order ID</label>
          <Input
            value={purchaseOrderId}
            onChange={(e) => setPurchaseOrderId(e.target.value)}
            placeholder="Optional PO reference"
            fullWidth
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            fullWidth
          />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Add Received Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <ProductSelector
            selectedProduct={selectedProduct}
            onProductSelect={(product) => {
              setSelectedProduct(product);
              // Auto-fill unit cost if product has cost price
              if (product && product.pricing?.costPrice && unitCost === 0) {
                setUnitCost(product.pricing.costPrice);
              }
            }}
            placeholder="Select product..."
          />
          <Input
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Quantity received"
            fullWidth
          />
          <Input
            type="number"
            step="0.01"
            min="0"
            value={unitCost}
            onChange={(e) => setUnitCost(Number(e.target.value))}
            placeholder="Unit cost"
            fullWidth
          />
          <Input
            value={batchNumber}
            onChange={(e) => setBatchNumber(e.target.value)}
            placeholder="Batch number (optional)"
            fullWidth
          />
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Location (optional)"
            fullWidth
          />
          <Button onClick={addReceivedItem} disabled={!selectedProduct || quantity <= 0}>
            Add Item
          </Button>
        </div>

        {receivedItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Received Items:</h4>
            {receivedItems.map((item, index) => {
              const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{product?.name || 'Product not found'} - Qty: {item.quantity}, Cost: ${item.unitCost}</span>
                  <Button size="sm" variant="danger" onClick={() => removeReceivedItem(index)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          loading={receivingMutation.isPending}
          disabled={!warehouseId || receivedItems.length === 0}
        >
          Process Receiving
        </Button>
      </div>
    </div>
  );
};

// Picking Modal Component
const PickingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [pickedItems, setPickedItems] = useState<Array<{ 
    productId: string; 
    quantity: number; 
  }>>([]);
  const [orderReference, setOrderReference] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);

  const queryClient = useQueryClient();
  const { data: productsList, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 }),
    staleTime: 60_000
  });

  const { data: warehousesList, isLoading: warehousesLoading, error: warehousesError } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseAPI.getWarehouses({ limit: 100 }),
    staleTime: 60_000
  });

  const pickingMutation = useMutation({
    mutationFn: (data: any) => enhancedInventoryAPI.processPicking(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Picking completed successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete picking');
    }
  });

  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addPickedItem = () => {
    if (selectedProduct && quantity > 0) {
      setPickedItems([...pickedItems, { productId: selectedProduct._id, quantity }]);
      setSelectedProduct(null);
      setQuantity(0);
    }
  };

  const removePickedItem = (index: number) => {
    setPickedItems(pickedItems.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!warehouseId || pickedItems.length === 0) {
      toast.error('Please select warehouse and add picked items');
      return;
    }

    pickingMutation.mutate({
      warehouseId,
      pickedItems,
      orderReference: orderReference || undefined,
      notes
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
          <Select
            options={[{ value: '', label: 'Select warehouse', disabled: true }, ...warehouseOptions]}
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            fullWidth
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Order Reference</label>
          <Input
            value={orderReference}
            onChange={(e) => setOrderReference(e.target.value)}
            placeholder="Optional order reference"
            fullWidth
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            fullWidth
          />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Add Picked Items</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <ProductSelector
            selectedProduct={selectedProduct}
            onProductSelect={(product) => setSelectedProduct(product)}
            placeholder="Select product..."
          />
          <Input
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Quantity picked"
            fullWidth
          />
          <Button onClick={addPickedItem} disabled={!selectedProduct || quantity <= 0}>
            Add Item
          </Button>
        </div>

        {pickedItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Picked Items:</h4>
            {pickedItems.map((item, index) => {
              const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{product?.name || 'Product not found'} - Qty: {item.quantity}</span>
                  <Button size="sm" variant="danger" onClick={() => removePickedItem(index)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          loading={pickingMutation.isPending}
          disabled={!warehouseId || pickedItems.length === 0}
        >
          Complete Picking
        </Button>
      </div>
    </div>
  );
};

// Move Stock Modal Component
const MoveStockModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [moveItems, setMoveItems] = useState<Array<{ 
    productId: string; 
    quantity: number; 
  }>>([]);
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(0);

  const queryClient = useQueryClient();
  const { data: productsList } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 }),
    staleTime: 60_000
  });

  const { data: warehousesList } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseAPI.getWarehouses({ limit: 100 }),
    staleTime: 60_000
  });

  const moveStockMutation = useMutation({
    mutationFn: (data: any) => inventoryAPI.createStockMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock moved successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to move stock');
    }
  });

  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addMoveItem = () => {
    if (selectedProduct && quantity > 0) {
      setMoveItems([...moveItems, { productId: selectedProduct._id, quantity }]);
      setSelectedProduct(null);
      setQuantity(0);
    }
  };

  const removeMoveItem = (index: number) => {
    setMoveItems(moveItems.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!fromWarehouseId || !toWarehouseId || moveItems.length === 0) {
      toast.error('Please select warehouses and add items to move');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      toast.error('Source and destination warehouses must be different');
      return;
    }

    // Process each item move
    for (const item of moveItems) {
      const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
      if (!product) continue;

      // Create stock out movement from source warehouse
      await moveStockMutation.mutateAsync({
        product: item.productId,
        movementType: 'transfer',
        quantity: item.quantity,
        unitCost: product.pricing.costPrice,
        totalCost: item.quantity * product.pricing.costPrice,
        reference: `Transfer from ${fromWarehouseId} to ${toWarehouseId}`,
        referenceType: 'transfer',
        reason: 'Stock transfer',
        notes: notes,
        warehouse: fromWarehouseId,
        toWarehouse: toWarehouseId
      });
    }

    onClose();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">From Warehouse</label>
          <Select
            options={[{ value: '', label: 'Select source warehouse', disabled: true }, ...warehouseOptions]}
            value={fromWarehouseId}
            onChange={(e) => setFromWarehouseId(e.target.value)}
            fullWidth
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">To Warehouse</label>
          <Select
            options={[{ value: '', label: 'Select destination warehouse', disabled: true }, ...warehouseOptions]}
            value={toWarehouseId}
            onChange={(e) => setToWarehouseId(e.target.value)}
            fullWidth
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes"
            fullWidth
          />
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h3 className="text-lg font-medium mb-4">Add Items to Move</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <ProductSelector
            selectedProduct={selectedProduct}
            onProductSelect={(product) => setSelectedProduct(product)}
            placeholder="Select product..."
          />
          <Input
            type="number"
            step="1"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Quantity to move"
            fullWidth
          />
          <Button onClick={addMoveItem} disabled={!selectedProduct || quantity <= 0}>
            Add Item
          </Button>
        </div>

        {moveItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Items to Move:</h4>
            {moveItems.map((item, index) => {
              const product = productsList?.data?.data?.find((p: any) => p._id === item.productId);
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{product?.name} - Qty: {item.quantity}</span>
                  <Button size="sm" variant="danger" onClick={() => removeMoveItem(index)}>
                    Remove
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSubmit} 
          loading={moveStockMutation.isPending}
          disabled={!fromWarehouseId || !toWarehouseId || moveItems.length === 0 || fromWarehouseId === toWarehouseId}
        >
          Move Stock
        </Button>
      </div>
    </div>
  );
};

const InventoryPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isStockTakingModalOpen, setIsStockTakingModalOpen] = useState(false);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [isPickingModalOpen, setIsPickingModalOpen] = useState(false);
  const [isMoveStockModalOpen, setIsMoveStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Stock Alerts state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [movementType, setMovementType] = useState('all');
  
  // Stock Take Sessions state
  const [stockTakeSessionsPage, setStockTakeSessionsPage] = useState(1);
  const [stockTakeSessionsPageSize] = useState(10);
  const [selectedStockTakeSession, setSelectedStockTakeSession] = useState<any>(null);
  const [showStockTakeSessionDetails, setShowStockTakeSessionDetails] = useState(false);
  const [showStockTakeExportMenu, setShowStockTakeExportMenu] = useState(false);

  const queryClient = useQueryClient();



  // Fetch inventory levels
  const { data: inventoryLevels, isPending: levelsLoading } = useQuery({
    queryKey: ['inventory-levels', searchTerm],
    queryFn: () => inventoryAPI.getInventoryLevels(),
    enabled: activeTab === 'levels' || activeTab === 'overview'
  });

  // Fetch stock movements
  const { data: movementsData, isPending: movementsLoading } = useQuery({
    queryKey: ['stock-movements', currentPage, pageSize, movementType],
    queryFn: () => inventoryAPI.getStockMovements({
      page: currentPage,
      limit: pageSize,
      type: movementType === 'all' ? undefined : movementType,
    }),
    enabled: activeTab === 'movements'
  });

  // Fetch low stock products
  const { data: lowStockData } = useQuery({
    queryKey: ['low-stock-products'],
    queryFn: () => productsAPI.getLowStockProducts(),
    enabled: activeTab === 'alerts'
  });

  // Fetch warehouse dashboard
  const { data: warehouseDashboard, isPending: dashboardLoading } = useQuery({
    queryKey: ['warehouse-dashboard'],
    queryFn: () => enhancedInventoryAPI.getWarehouseDashboard(),
    enabled: activeTab === 'warehouse'
  });

  // Stock Alert stats (only for overview card)
  const { data: alertStatsData } = useQuery({
    queryKey: ['stock-alert-stats'],
    queryFn: () => stockAlertAPI.getStockAlertStats(),
    enabled: activeTab === 'overview',
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Stock Alerts data (for recent alerts display in overview)
  const { data: alertsData } = useQuery({
    queryKey: ['stock-alerts', { limit: 5 }],
    queryFn: () => stockAlertAPI.getStockAlerts({ limit: 5, page: 1 }),
    enabled: activeTab === 'overview',
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });

  // Stock Taking data (fetch when tab is active)
  const { data: stockTakingData } = useQuery({
    queryKey: ['stock-taking-data'],
    queryFn: () => enhancedInventoryAPI.getWarehouseDashboard(),
    enabled: activeTab === 'stock-taking'
  });

  // Fetch stock take sessions
  const { data: stockTakeSessionsData, isPending: stockTakeSessionsLoading, refetch: refetchStockTakeSessions } = useQuery({
    queryKey: ['stock-take-sessions', stockTakeSessionsPage, stockTakeSessionsPageSize],
    queryFn: () => enhancedInventoryAPI.getStockTakeSessions({
      page: stockTakeSessionsPage,
      limit: stockTakeSessionsPageSize
    }),
    enabled: activeTab === 'stock-taking'
  });

  // Fetch stock take session details
  const { data: stockTakeSessionDetailsData, isPending: stockTakeSessionDetailsLoading, error: stockTakeSessionDetailsError } = useQuery({
    queryKey: ['stock-take-session-details', selectedStockTakeSession?.sessionParams],
    queryFn: async () => {
      if (!selectedStockTakeSession?.sessionParams) {
        throw new Error('Session parameters not available');
      }
      console.log('Fetching session details with params:', selectedStockTakeSession.sessionParams);
      const response = await enhancedInventoryAPI.getStockTakeSessionDetails(selectedStockTakeSession.sessionParams);
      console.log('Session details response:', response);
      return response;
    },
    enabled: showStockTakeSessionDetails && !!selectedStockTakeSession?.sessionParams
  });

  // Receiving data (fetch when tab is active)
  const { data: receivingData } = useQuery({
    queryKey: ['receiving-data'],
    queryFn: () => enhancedInventoryAPI.getWarehouseDashboard(),
    enabled: activeTab === 'receiving'
  });

  // Picking data (fetch when tab is active)
  const { data: pickingData } = useQuery({
    queryKey: ['picking-data'],
    queryFn: () => enhancedInventoryAPI.getWarehouseDashboard(),
    enabled: activeTab === 'picking'
  });

  // Create stock movement mutation
  const createMovementMutation = useMutation({
    mutationFn: (movementData: any) => inventoryAPI.createStockMovement(movementData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock movement recorded successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to record movement');
    }
  });

  // Stock adjustment mutation
  const adjustmentMutation = useMutation({
    mutationFn: (adjustmentData: any) => inventoryAPI.performStockAdjustment(adjustmentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock adjustment completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to adjust stock');
    }
  });

  // Stock taking mutation
  const stockTakingMutation = useMutation({
    mutationFn: (stockTakingData: any) => enhancedInventoryAPI.performStockTaking(stockTakingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock taking completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete stock taking');
    }
  });

  // Receiving mutation
  const receivingMutation = useMutation({
    mutationFn: (receivingData: any) => enhancedInventoryAPI.processReceiving(receivingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Goods received successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to process receiving');
    }
  });

  // Picking mutation
  const pickingMutation = useMutation({
    mutationFn: (pickingData: any) => enhancedInventoryAPI.processPicking(pickingData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Picking completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete picking');
    }
  });

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
  const { data: productsList } = useQuery({
    queryKey: ['products-list'],
    queryFn: () => productsAPI.getProducts({ limit: 100, page: 1 }),
    staleTime: 60_000
  });

  // Warehouses for selects
  const { data: warehousesList } = useQuery({
    queryKey: ['warehouses-list'],
    queryFn: () => warehouseAPI.getWarehouses({ limit: 100 }),
    staleTime: 60_000
  });

  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));
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
      case 'receiving':
      case 'return':
        return <ArrowUpIcon className="h-4 w-4 text-green-600" />;
      case 'out':
      case 'picking':
      case 'damage':
      case 'expired':
        return <ArrowDownIcon className="h-4 w-4 text-red-600" />;
      case 'transfer':
        return <ArrowPathIcon className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
      case 'stock_take':
      case 'cycle_count':
        return <CubeIcon className="h-4 w-4 text-gray-600" />;
      default:
        return <CubeIcon className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'in':
      case 'receiving':
      case 'return':
        return 'text-green-600';
      case 'out':
      case 'picking':
      case 'damage':
      case 'expired':
        return 'text-red-600';
      case 'transfer':
        return 'text-blue-600';
      case 'adjustment':
      case 'stock_take':
      case 'cycle_count':
        return 'text-gray-600';
      default:
        return 'text-gray-600';
    }
  };

  // Utility function to safely render values
  const safeRender = (value: any, fallback: string = '-'): string => {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    if (typeof value === 'object' && value !== null) {
      // If it's an object with name property, return the name
      if (value.name) return String(value.name);
      // If it's an object with firstName and lastName, combine them
      if (value.firstName && value.lastName) return `${value.firstName} ${value.lastName}`;
      // Otherwise return fallback
      return fallback;
    }
    return fallback;
  };

  // State for location modal
  const [selectedProductLocation, setSelectedProductLocation] = useState<any>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Function to format location
  const formatLocation = (location: any) => {
    if (!location) return 'N/A';
    const parts = [];
    if (location.zone) parts.push(`Zone: ${location.zone}`);
    if (location.aisle) parts.push(`Aisle: ${location.aisle}`);
    if (location.shelf) parts.push(`Shelf: ${location.shelf}`);
    if (location.bin) parts.push(`Bin: ${location.bin}`);
    if (location.locationCode) parts.push(`Code: ${location.locationCode}`);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  // Function to get location display (short format)
  const getLocationDisplay = (location: any) => {
    if (!location) return 'N/A';
    if (location.locationCode) return location.locationCode;
    const parts = [];
    if (location.zone) parts.push(location.zone);
    if (location.aisle) parts.push(location.aisle);
    if (location.shelf) parts.push(location.shelf);
    if (location.bin) parts.push(location.bin);
    return parts.length > 0 ? parts.join('-') : 'N/A';
  };

  // Handle show location
  const handleShowLocation = (row: any) => {
    const product = row?.product || row;
    setSelectedProductLocation({
      product: product.name,
      sku: product.sku,
      location: product.inventory?.warehouseLocation || null
    });
    setShowLocationModal(true);
  };

  // Handle view stock take session details
  const handleViewStockTakeSession = (session: any) => {
    console.log('Viewing stock take session:', session);
    console.log('Session params:', session.sessionParams);
    setSelectedStockTakeSession(session);
    setShowStockTakeSessionDetails(true);
  };

  // Handle download stock take session
  const handleDownloadStockTakeSession = async (format: 'pdf' | 'csv' | 'excel', session?: any) => {
    try {
      const sessionData = session || selectedStockTakeSession;
      if (!sessionData) {
        toast.error('No stock take session selected');
        return;
      }

      // Fetch full session details if not already loaded
      let details = stockTakeSessionDetailsData?.data?.data;
      if (!details || details.sessionId !== sessionData.sessionId) {
        const response = await enhancedInventoryAPI.getStockTakeSessionDetails(sessionData.sessionParams);
        details = response?.data?.data;
      }

      if (!details) {
        toast.error('Failed to load session details');
        return;
      }

      const exportColumns = [
        { key: 'product', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'recordedStock', label: 'Recorded Stock' },
        { key: 'actualStock', label: 'Actual Stock' },
        { key: 'difference', label: 'Difference' },
        { key: 'adjusted', label: 'Adjusted' },
        { key: 'unitCost', label: 'Unit Cost' },
        { key: 'totalCost', label: 'Total Cost' },
      ];

      const exportData = details.movements.map((movement: any) => ({
        product: movement.product?.name || 'N/A',
        sku: movement.sku || 'N/A',
        recordedStock: movement.recordedStock || 0,
        actualStock: movement.actualStock || 0,
        difference: movement.difference || 0,
        adjusted: movement.adjusted ? 'Yes' : 'No',
        unitCost: formatCurrency(movement.unitCost || 0),
        totalCost: formatCurrency(movement.totalCost || 0),
      }));

      const reportData = {
        summary: {
          warehouse: details.warehouse,
          createdBy: `${details.createdBy?.firstName || ''} ${details.createdBy?.lastName || ''}`.trim(),
          createdAt: new Date(details.createdAt).toLocaleString(),
          notes: details.notes || 'N/A',
          totalProducts: details.totalProducts,
          totalAdjustments: details.totalAdjustments,
        },
        items: exportData,
      };

      const exportColumnsForReport = exportColumns.map(col => ({
        key: col.key,
        label: col.label,
        render: (row: any) => String(row[col.key] || 'N/A')
      }));

      const filename = `stock_take_${details.warehouse?.replace(/\s+/g, '_')}_${new Date(details.createdAt).toISOString().split('T')[0]}`;

      if (format === 'pdf') {
        await generateReportPDF(`Stock Take Report - ${details.warehouse}`, reportData, exportColumnsForReport, `${filename}.pdf`);
        toast.success('PDF report downloaded successfully');
      } else if (format === 'excel') {
        generateReportExcel(`Stock Take Report - ${details.warehouse}`, reportData, exportColumnsForReport, `${filename}.xlsx`);
        toast.success('Excel report downloaded successfully');
      } else {
        generateReportCSV(`Stock Take Report - ${details.warehouse}`, reportData, exportColumnsForReport, `${filename}.csv`);
        toast.success('CSV report downloaded successfully');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  // Handle download all stock take sessions
  const handleDownloadAllStockTakeSessions = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const sessions = stockTakeSessionsData?.data?.data || [];
      if (sessions.length === 0) {
        toast.error('No stock take sessions to download');
        return;
      }

      const exportColumns = [
        { key: 'warehouse', label: 'Warehouse' },
        { key: 'createdBy', label: 'Created By' },
        { key: 'createdAt', label: 'Date' },
        { key: 'totalProducts', label: 'Total Products' },
        { key: 'totalAdjustments', label: 'Adjustments' },
        { key: 'notes', label: 'Notes' },
      ];

      const exportData = sessions.map((session: any) => ({
        warehouse: session.warehouseName || 'N/A',
        createdBy: `${session.createdBy?.firstName || ''} ${session.createdBy?.lastName || ''}`.trim() || 'N/A',
        createdAt: new Date(session.createdAt).toLocaleString(),
        totalProducts: session.totalProducts || 0,
        totalAdjustments: session.totalAdjustments || 0,
        notes: session.notes || 'N/A',
      }));

      const reportData = {
        summary: {
          totalSessions: sessions.length,
          totalProducts: sessions.reduce((sum: number, s: any) => sum + (s.totalProducts || 0), 0),
          totalAdjustments: sessions.reduce((sum: number, s: any) => sum + (s.totalAdjustments || 0), 0),
        },
        items: exportData,
      };

      const exportColumnsForReport = exportColumns.map(col => ({
        key: col.key,
        label: col.label,
        render: (row: any) => String(row[col.key] || 'N/A')
      }));

      const filename = `stock_take_sessions_${new Date().toISOString().split('T')[0]}`;

      if (format === 'pdf') {
        await generateReportPDF('Stock Take Sessions Report', reportData, exportColumnsForReport, `${filename}.pdf`);
        toast.success('PDF report downloaded successfully');
      } else if (format === 'excel') {
        generateReportExcel('Stock Take Sessions Report', reportData, exportColumnsForReport, `${filename}.xlsx`);
        toast.success('Excel report downloaded successfully');
      } else {
        generateReportCSV('Stock Take Sessions Report', reportData, exportColumnsForReport, `${filename}.csv`);
        toast.success('CSV report downloaded successfully');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  // Handle download report
  const handleDownloadReport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const inventoryData = Array.isArray(inventoryLevels?.data?.data) ? inventoryLevels.data.data : [];
      
      // Prepare columns for export
      const exportColumns = [
        { key: 'product', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'currentStock', label: 'Current Stock' },
        { key: 'minStock', label: 'Min Stock' },
        { key: 'maxStock', label: 'Max Stock' },
        { key: 'stockValue', label: 'Stock Value' },
        { key: 'status', label: 'Status' },
        { key: 'location', label: 'Location Code' },
        { key: 'locationDetails', label: 'Location Details (Zone, Aisle, Shelf, Bin)' },
      ];

      // Prepare data for export
      const exportData = inventoryData.map((row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const pricing = product?.pricing || {};
        const location = inv.warehouseLocation || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        const min = typeof inv.minStock === 'number' ? inv.minStock : 0;
        const max = typeof inv.maxStock === 'number' ? inv.maxStock : 0;
        const cost = typeof pricing.costPrice === 'number' ? pricing.costPrice : 0;
        const currency = pricing.currency || 'USD';
        const stockStatus = getStockStatus(current, min);
        
        return {
          product: product.name || 'N/A',
          sku: product.sku || 'N/A',
          currentStock: `${current} ${inv.unit || ''}`,
          minStock: `${min} ${inv.unit || ''}`,
          maxStock: `${max} ${inv.unit || ''}`,
          stockValue: formatCurrency(current * cost, currency),
          status: stockStatus.label,
          location: getLocationDisplay(location),
          locationDetails: formatLocation(location),
        };
      });

      // Calculate summary
      const totalProducts = inventoryData.length;
      const totalStockValue = inventoryData.reduce((sum: number, row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const pricing = product?.pricing || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        const cost = typeof pricing.costPrice === 'number' ? pricing.costPrice : 0;
        return sum + (current * cost);
      }, 0);
      
      const lowStockCount = inventoryData.filter((row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        const min = typeof inv.minStock === 'number' ? inv.minStock : 0;
        return current <= min && current > 0;
      }).length;
      
      const outOfStockCount = inventoryData.filter((row: any) => {
        const product = row?.product || row;
        const inv = product?.inventory || {};
        const current = typeof inv.currentStock === 'number' ? inv.currentStock : 0;
        return current === 0;
      }).length;

      const reportData = {
        summary: {
          totalProducts,
          totalStockValue: formatCurrency(totalStockValue),
          lowStockCount,
          outOfStockCount,
        },
        items: exportData,
      };

      const exportColumnsForReport = exportColumns.map(col => ({
        key: col.key,
        label: col.label,
        render: (row: any) => String(row[col.key] || 'N/A')
      }));

      const filename = `stock_levels_inventory_${new Date().toISOString().split('T')[0]}`;

      if (format === 'pdf') {
        await generateReportPDF('Stock Levels Inventory Report', reportData, exportColumnsForReport, `${filename}.pdf`);
        toast.success('PDF report downloaded successfully');
      } else if (format === 'excel') {
        generateReportExcel('Stock Levels Inventory Report', reportData, exportColumnsForReport, `${filename}.xlsx`);
        toast.success('Excel report downloaded successfully');
      } else {
        generateReportCSV('Stock Levels Inventory Report', reportData, exportColumnsForReport, `${filename}.csv`);
        toast.success('CSV report downloaded successfully');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download report');
    }
  };

  // Inventory Levels Columns
  const levelsColumns = [
    {
      key: 'name',
      label: 'Product',
      sortable: true,
      render: (row: any) => {
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
      render: (row: any) => {
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
      render: (row: any) => {
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
      render: (row: any) => {
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
      render: (row: any) => {
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
      key: 'location',
      label: 'Location',
      sortable: true,
      render: (row: any) => {
        const product = row?.product || row;
        const location = product?.inventory?.warehouseLocation;
        const locationDisplay = getLocationDisplay(location);
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-900">{locationDisplay}</span>
            <button
              onClick={() => handleShowLocation(row)}
              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
              title="View location details"
            >
              <MapPinIcon className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => {
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
      render: (row: StockMovement) => (
        <div className="text-sm font-medium text-gray-900">
          {safeRender(row.product, 'Unknown Product')}
        </div>
      ),
    },
    {
      key: 'movementType',
      label: 'Type',
      sortable: true,
      render: (row: StockMovement) => {
        const movementType = typeof row.movementType === 'string' ? row.movementType : 'unknown';
        return (
        <div className="flex items-center">
            {getMovementIcon(movementType)}
            <span className={`ml-2 text-sm font-medium capitalize ${getMovementColor(movementType)}`}>
              {movementType}
          </span>
        </div>
        );
      },
    },
    {
      key: 'quantity',
      label: 'Quantity',
      sortable: true,
      render: (row: StockMovement) => {
        const movementType = typeof row.movementType === 'string' ? row.movementType : 'unknown';
        const quantity = typeof row.quantity === 'number' ? row.quantity : 0;
        const isIn = movementType === 'in' || movementType === 'receiving' || movementType === 'return';
        return (
          <div className={`text-sm font-medium ${isIn ? 'text-green-600' : 'text-red-600'}`}>
            {isIn ? '+' : '-'}{formatNumber(Math.abs(quantity))}
        </div>
        );
      },
    },
    {
      key: 'reason',
      label: 'Reason',
      sortable: true,
      render: (row: StockMovement) => (
        <div className="text-sm text-gray-900">{safeRender(row.reason)}</div>
      ),
    },
    {
      key: 'movedBy',
      label: 'Moved By',
      sortable: true,
      render: (row: StockMovement) => (
        <div className="text-sm text-gray-900">
          {safeRender(row.movedBy || row.createdBy)}
        </div>
      ),
    },
    {
      key: 'movementDate',
      label: 'Date',
      sortable: true,
      render: (row: StockMovement) => {
        const dateValue = row.movementDate || row.createdAt;
        return (
          <div className="text-sm text-gray-900">
            {typeof dateValue === 'string' ? formatDate(dateValue) : '-'}
          </div>
        );
      },
    },
  ];

  const movementTypeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'in', label: 'Stock In' },
    { value: 'out', label: 'Stock Out' },
    { value: 'transfer', label: 'Transfer' },
    { value: 'adjustment', label: 'Adjustment' },
  ];

  // Stock Alert utility functions
  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'bg-blue-100 text-blue-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[severity as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getAlertTypeColor = (alertType: string) => {
    const colors = {
      low_stock: 'bg-yellow-100 text-yellow-800',
      out_of_stock: 'bg-red-100 text-red-800',
      overstock: 'bg-blue-100 text-blue-800',
      expiring_soon: 'bg-orange-100 text-orange-800',
      expired: 'bg-red-100 text-red-800',
      reorder_point: 'bg-purple-100 text-purple-800',
    };
    return colors[alertType as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'levels', name: 'Stock Levels', icon: CubeIcon },
    { id: 'movements', name: 'Stock Movements', icon: ArrowPathIcon },
    { id: 'stock-taking', name: 'Stock Take', icon: ClipboardDocumentListIcon },
  ];

  return (
    <ConditionalLayout title="Inventory Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Inventory Management</h1>
            <p className="text-sm text-gray-600 sm:text-base">Track stock levels, movements, and manage inventory</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex flex-wrap gap-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 border-b-2 py-2 px-1 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total Products */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <CubeIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Products</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {inventoryLevels?.data?.data?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Low Stock Alerts */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {alertStatsData?.data?.data?.totalAlerts || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Critical Alerts */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-500" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {alertStatsData?.data?.data?.criticalAlerts || 0}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Movements */}
              <div className="bg-white p-6 rounded-lg shadow-sm border">
                <div className="flex items-center">
                  <ArrowPathIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Recent Movements</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {movementsData?.data?.length || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>


            {/* Recent Alerts */}
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
                <Button
                  onClick={() => setActiveTab('alerts')}
                  variant="secondary"
                  size="sm"
                >
                  View All
                </Button>
              </div>
              <div className="space-y-3">
                {alertsData?.data?.data?.slice(0, 5).map((alert: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900">{alert.productName}</p>
                        <p className="text-sm text-gray-500">{alert.sku}</p>
                        <p className="text-xs text-gray-400 mt-1">{alert.message}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity?.charAt(0).toUpperCase() + alert.severity?.slice(1)}
                      </span>
                      <p className="text-sm text-gray-500 mt-1">{alert.currentStock} units</p>
                    </div>
                  </div>
                ))}
                {(!alertsData?.data?.data || (alertsData.data.data && alertsData.data.data.length === 0)) && (
                  <p className="text-gray-500 text-center py-4">No recent alerts</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Inventory Levels Tab */}
        {activeTab === 'levels' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  fullWidth
                  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                  className="w-full sm:max-w-md"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  >
                    Export
                  </Button>
                  {showExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleDownloadReport('pdf');
                              setShowExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download as PDF
                          </button>
                          <button
                            onClick={() => {
                              handleDownloadReport('excel');
                              setShowExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download as Excel
                          </button>
                          <button
                            onClick={() => {
                              handleDownloadReport('csv');
                              setShowExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download as CSV
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <DataTable
              columns={levelsColumns}
              data={Array.isArray(inventoryLevels?.data?.data) ? inventoryLevels.data.data : []}
              loading={levelsLoading}
              emptyMessage="No inventory data found"
            />
          </div>
        )}


        {/* Stock Movements Tab */}
        {activeTab === 'movements' && (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <Input
                  placeholder="Search movements..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
                  className="w-full sm:max-w-md"
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                <Select
                  options={movementTypeOptions}
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="min-w-[150px]"
                />
              </div>
            </div>

            <DataTable
              columns={movementsColumns}
              data={Array.isArray(movementsData?.data?.data) ? movementsData.data.data : []}
              loading={movementsLoading}
              pagination={movementsData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No stock movements found"
            />
          </div>
        )}


        {/* Stock Take Tab */}
        {activeTab === 'stock-taking' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Stock Taking / Cycle Count</h2>
                  <p className="text-sm text-gray-600 mt-1">
                    Perform physical inventory counts and adjust stock levels based on actual quantities
                  </p>
                </div>
                <Button
                  onClick={() => setIsStockTakingModalOpen(true)}
                  leftIcon={<ClipboardDocumentListIcon className="h-5 w-5" />}
                  className="w-full sm:w-auto"
                >
                  Start Stock Take
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ClipboardDocumentListIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Stock Take Process</p>
                      <p className="text-lg font-semibold text-gray-900">Physical Count</p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Accuracy</p>
                      <p className="text-lg font-semibold text-gray-900">Verified</p>
                    </div>
                  </div>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <ArrowPathIcon className="h-8 w-8 text-purple-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Auto Adjustment</p>
                      <p className="text-lg font-semibold text-gray-900">Enabled</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">How to Perform Stock Take</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
                  <li>Click "Start Stock Take" button above</li>
                  <li>Select the warehouse you want to count</li>
                  <li>Add products and enter the actual quantities found</li>
                  <li>Review the differences between recorded and actual stock</li>
                  <li>Complete the stock take to automatically adjust inventory levels</li>
                </ol>
              </div>
            </div>

            {/* Past Stock Takes Table */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Past Stock Takes</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    View and download past stock take sessions
                  </p>
                </div>
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setShowStockTakeExportMenu(!showStockTakeExportMenu)}
                    leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}
                  >
                    Export All
                  </Button>
                  {showStockTakeExportMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowStockTakeExportMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                        <div className="py-1">
                          <button
                            onClick={() => {
                              handleDownloadAllStockTakeSessions('pdf');
                              setShowStockTakeExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download as PDF
                          </button>
                          <button
                            onClick={() => {
                              handleDownloadAllStockTakeSessions('excel');
                              setShowStockTakeExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download as Excel
                          </button>
                          <button
                            onClick={() => {
                              handleDownloadAllStockTakeSessions('csv');
                              setShowStockTakeExportMenu(false);
                            }}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                          >
                            Download as CSV
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <DataTable
                data={stockTakeSessionsData?.data?.data || []}
                columns={[
                  {
                    key: 'warehouseName',
                    label: 'Warehouse',
                    render: (row: any) => (
                      <div className="text-sm font-medium text-gray-900">
                        {row.warehouseName || 'N/A'}
                      </div>
                    ),
                  },
                  {
                    key: 'createdBy',
                    label: 'Created By',
                    render: (row: any) => (
                      <div className="text-sm text-gray-900">
                        {row.createdBy?.firstName && row.createdBy?.lastName
                          ? `${row.createdBy.firstName} ${row.createdBy.lastName}`
                          : 'N/A'}
                      </div>
                    ),
                  },
                  {
                    key: 'createdAt',
                    label: 'Date',
                    render: (row: any) => (
                      <div className="text-sm text-gray-900">
                        {new Date(row.createdAt).toLocaleString()}
                      </div>
                    ),
                  },
                  {
                    key: 'totalProducts',
                    label: 'Products',
                    render: (row: any) => (
                      <div className="text-sm text-gray-900">
                        {row.totalProducts || 0}
                      </div>
                    ),
                  },
                  {
                    key: 'totalAdjustments',
                    label: 'Adjustments',
                    render: (row: any) => (
                      <div className="text-sm text-gray-900">
                        {row.totalAdjustments || 0}
                      </div>
                    ),
                  },
                  {
                    key: 'notes',
                    label: 'Notes',
                    render: (row: any) => (
                      <div className="text-sm text-gray-600 truncate max-w-xs">
                        {row.notes || 'N/A'}
                      </div>
                    ),
                  },
                  {
                    key: 'actions',
                    label: 'Actions',
                    render: (row: any) => (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewStockTakeSession(row)}
                          className="text-blue-600 hover:text-blue-800"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadStockTakeSession('pdf', row);
                          }}
                          className="text-green-600 hover:text-green-800"
                          title="Download PDF"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        </button>
                      </div>
                    ),
                  },
                ]}
                loading={stockTakeSessionsLoading}
                pagination={stockTakeSessionsData?.data?.pagination}
                onPageChange={setStockTakeSessionsPage}
                emptyMessage="No stock take sessions found"
              />
            </div>
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
            loading={createMovementMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Movement Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Product" required error={methods.formState.errors.product?.message as string}>
                    <FormProductSelector
                      value={methods.watch('product')}
                      onChange={(value) => methods.setValue('product', value)}
                      placeholder="Select product..."
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
                    <Input type="number" step="1" min="0" {...methods.register('quantity')} fullWidth />
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
                onSubmit={async () => {
                  const isValid = await methods.trigger();
                  if (isValid) {
                    const values = methods.getValues();
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
                  } else {
                    toast.error('Please fill in all required fields');
                  }
                }}
                submitText={createMovementMutation.isPending ? 'Recording...' : 'Record Movement'}
                loading={createMovementMutation.isPending}
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
            loading={adjustmentMutation.isPending}
          >{(methods) => (
            <div className="space-y-6">
              <FormSection title="Adjustment Details">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField label="Product" required error={methods.formState.errors.productId?.message as string}>
                    <FormProductSelector
                      value={methods.watch('productId')}
                      onChange={(value) => methods.setValue('productId', value)}
                      placeholder="Select product..."
                    />
                  </FormField>
                  <FormField label="New Quantity" required error={methods.formState.errors.newQuantity?.message as string}>
                    <Input type="number" step="1" min="0" {...methods.register('newQuantity')} fullWidth />
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
                onSubmit={async () => {
                  const isValid = await methods.trigger();
                  if (isValid) {
                    const values = methods.getValues();
                    const payload: any = { ...values };
                    if (!payload.reason) delete payload.reason;
                    if (!payload.notes) delete payload.notes;
                    await adjustmentMutation.mutateAsync(payload);
                    setIsAdjustmentModalOpen(false);
                  } else {
                    toast.error('Please fill in all required fields');
                  }
                }}
                submitText={adjustmentMutation.isPending ? 'Adjusting...' : 'Adjust Stock'}
                loading={adjustmentMutation.isPending}
              />
            </div>
          )}</Form>
        </Modal>

        {/* Stock Taking Modal */}
        <Modal
          isOpen={isStockTakingModalOpen}
          onClose={() => setIsStockTakingModalOpen(false)}
          title="Stock Taking / Cycle Count"
          size="xl"
        >
          <StockTakingModal onClose={() => setIsStockTakingModalOpen(false)} />
        </Modal>

        {/* Receiving Modal */}
        <Modal
          isOpen={isReceivingModalOpen}
          onClose={() => setIsReceivingModalOpen(false)}
          title="Goods Receiving"
          size="xl"
        >
          <ReceivingModal onClose={() => setIsReceivingModalOpen(false)} />
        </Modal>

        {/* Picking Modal */}
        <Modal
          isOpen={isPickingModalOpen}
          onClose={() => setIsPickingModalOpen(false)}
          title="Order Picking"
          size="xl"
        >
          <PickingModal onClose={() => setIsPickingModalOpen(false)} />
        </Modal>

        {/* Move Stock Modal */}
        <Modal
          isOpen={isMoveStockModalOpen}
          onClose={() => setIsMoveStockModalOpen(false)}
          title="Move Stock"
          size="xl"
        >
          <MoveStockModal onClose={() => setIsMoveStockModalOpen(false)} />
        </Modal>

        {/* Product Location Modal */}
        <Modal
          isOpen={showLocationModal}
          onClose={() => setShowLocationModal(false)}
          title="Product Location Details"
          size="md"
        >
          {selectedProductLocation && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                <p className="text-sm text-gray-900">{selectedProductLocation.product}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                <p className="text-sm text-gray-900">{selectedProductLocation.sku}</p>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-3">Warehouse Location</label>
                {selectedProductLocation.location ? (
                  <div className="space-y-3">
                    {selectedProductLocation.location.zone && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Zone:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.zone}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.aisle && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Aisle:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.aisle}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.shelf && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Shelf:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.shelf}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.bin && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Bin:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.bin}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.locationCode && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Location Code:</span>
                        <span className="text-sm font-semibold text-blue-600">{selectedProductLocation.location.locationCode}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.floor && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Floor:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.floor}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.section && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Section:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.section}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.coordinates && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm font-medium text-gray-700 mb-2">Coordinates:</p>
                        <div className="text-sm text-gray-600">
                          {selectedProductLocation.location.coordinates.x !== undefined && (
                            <div>X: {selectedProductLocation.location.coordinates.x}</div>
                          )}
                          {selectedProductLocation.location.coordinates.y !== undefined && (
                            <div>Y: {selectedProductLocation.location.coordinates.y}</div>
                          )}
                          {selectedProductLocation.location.coordinates.z !== undefined && (
                            <div>Z: {selectedProductLocation.location.coordinates.z}</div>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedProductLocation.location.capacity && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Capacity:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.capacity}</span>
                      </div>
                    )}
                    {selectedProductLocation.location.currentOccupancy !== undefined && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-sm font-medium text-gray-600">Current Occupancy:</span>
                        <span className="text-sm text-gray-900">{selectedProductLocation.location.currentOccupancy}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MapPinIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-600">No location information available for this product</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => setShowLocationModal(false)}>Close</Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Stock Take Session Details Modal */}
        <Modal
          isOpen={showStockTakeSessionDetails}
          onClose={() => {
            setShowStockTakeSessionDetails(false);
            setSelectedStockTakeSession(null);
          }}
          title="Stock Take Session Details"
          size="xl"
        >
          {stockTakeSessionDetailsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading session details...</div>
            </div>
          ) : stockTakeSessionDetailsError ? (
            <div className="text-center py-8">
              <p className="text-red-500">Error loading session details: {stockTakeSessionDetailsError.message || 'Unknown error'}</p>
              <p className="text-sm text-gray-500 mt-2">Session params: {JSON.stringify(selectedStockTakeSession?.sessionParams)}</p>
            </div>
          ) : stockTakeSessionDetailsData?.data?.data ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Warehouse</label>
                  <p className="text-sm text-gray-900">{stockTakeSessionDetailsData.data.data.warehouse}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Created By</label>
                  <p className="text-sm text-gray-900">
                    {stockTakeSessionDetailsData.data.data.createdBy?.firstName && stockTakeSessionDetailsData.data.data.createdBy?.lastName
                      ? `${stockTakeSessionDetailsData.data.data.createdBy.firstName} ${stockTakeSessionDetailsData.data.data.createdBy.lastName}`
                      : 'N/A'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(stockTakeSessionDetailsData.data.data.createdAt).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <p className="text-sm text-gray-900">{stockTakeSessionDetailsData.data.data.notes || 'N/A'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Products</label>
                  <p className="text-sm text-gray-900">{stockTakeSessionDetailsData.data.data.totalProducts}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adjustments Made</label>
                  <p className="text-sm text-gray-900">{stockTakeSessionDetailsData.data.data.totalAdjustments}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Products</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadStockTakeSession('pdf')}
                    >
                      Download PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadStockTakeSession('excel')}
                    >
                      Download Excel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadStockTakeSession('csv')}
                    >
                      Download CSV
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Recorded</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actual</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Difference</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Adjusted</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total Cost</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockTakeSessionDetailsData.data.data.movements.map((movement: any, index: number) => (
                        <tr key={index} className={movement.adjusted ? 'bg-yellow-50' : ''}>
                          <td className="px-4 py-3 text-sm text-gray-900">{movement.product?.name || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{movement.sku || 'N/A'}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(movement.recordedStock || 0)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatNumber(movement.actualStock || 0)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            (movement.difference || 0) > 0 ? 'text-green-600' : (movement.difference || 0) < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            {movement.difference > 0 ? '+' : ''}{formatNumber(movement.difference || 0)}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            {movement.adjusted ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Yes
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                No
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(movement.unitCost || 0)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(movement.totalCost || 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t">
                <Button onClick={() => {
                  setShowStockTakeSessionDetails(false);
                  setSelectedStockTakeSession(null);
                }}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No session details available</p>
            </div>
          )}
        </Modal>
      </div>
    </ConditionalLayout>
  );
};

export default InventoryPage;
