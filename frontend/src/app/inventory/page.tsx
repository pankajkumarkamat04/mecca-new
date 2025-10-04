'use client';

import React, { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
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
} from '@heroicons/react/24/outline';

// Stock Taking Modal Component
const StockTakingModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [warehouseId, setWarehouseId] = useState('');
  const [stockItems, setStockItems] = useState<Array<{ productId: string; actualQuantity: number }>>([]);
  const [notes, setNotes] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  const [actualQuantity, setActualQuantity] = useState(0);

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-levels'] });
      queryClient.invalidateQueries({ queryKey: ['stock-movements'] });
      toast.success('Stock taking completed successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete stock taking');
    }
  });

  const productOptions = (productsList?.data?.data || []).map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));
  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addStockItem = () => {
    if (selectedProduct && actualQuantity >= 0) {
      setStockItems([...stockItems, { productId: selectedProduct, actualQuantity }]);
      setSelectedProduct('');
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
          <Select
            options={[{ value: '', label: 'Select product', disabled: true }, ...productOptions]}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            fullWidth
          />
          <Input
            type="number"
            step="0.01"
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
              return (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{product?.name || 'Product not found'} - {item.actualQuantity}</span>
                  <Button size="sm" variant="danger" onClick={() => removeStockItem(index)}>
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
          loading={stockTakingMutation.isPending}
          disabled={!warehouseId || stockItems.length === 0}
        >
          Complete Stock Taking
        </Button>
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
  const [selectedProduct, setSelectedProduct] = useState('');
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

  const productOptions = (productsList?.data?.data || []).map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));
  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addReceivedItem = () => {
    if (selectedProduct && quantity > 0) {
      setReceivedItems([...receivedItems, { 
        productId: selectedProduct, 
        quantity, 
        unitCost,
        batchNumber: batchNumber || undefined,
        location: location || undefined
      }]);
      setSelectedProduct('');
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
          <Select
            options={[{ value: '', label: 'Select product', disabled: true }, ...productOptions]}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            fullWidth
          />
          <Input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            placeholder="Quantity received"
            fullWidth
          />
          <Input
            type="number"
            step="0.01"
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
  const [selectedProduct, setSelectedProduct] = useState('');
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

  const productOptions = (productsList?.data?.data || []).map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));
  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addPickedItem = () => {
    if (selectedProduct && quantity > 0) {
      setPickedItems([...pickedItems, { productId: selectedProduct, quantity }]);
      setSelectedProduct('');
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
          <Select
            options={[{ value: '', label: 'Select product', disabled: true }, ...productOptions]}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            fullWidth
          />
          <Input
            type="number"
            step="0.01"
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
  const [selectedProduct, setSelectedProduct] = useState('');
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

  const productOptions = (productsList?.data?.data || []).map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));
  const warehouseOptions = (warehousesList?.data?.data || []).map((w: any) => ({ value: w._id, label: w.name }));

  const addMoveItem = () => {
    if (selectedProduct && quantity > 0) {
      setMoveItems([...moveItems, { productId: selectedProduct, quantity }]);
      setSelectedProduct('');
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
          <Select
            options={[{ value: '', label: 'Select product', disabled: true }, ...productOptions]}
            value={selectedProduct}
            onChange={(e) => setSelectedProduct(e.target.value)}
            fullWidth
          />
          <Input
            type="number"
            step="0.01"
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
  const [activeTab, setActiveTab] = useState('levels');
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isStockTakingModalOpen, setIsStockTakingModalOpen] = useState(false);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [isPickingModalOpen, setIsPickingModalOpen] = useState(false);
  const [isMoveStockModalOpen, setIsMoveStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Stock Alerts state
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [isViewAlertModalOpen, setIsViewAlertModalOpen] = useState(false);
  const [isResolveAlertModalOpen, setIsResolveAlertModalOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [movementType, setMovementType] = useState('all');

  const queryClient = useQueryClient();

  // Stock Alert mutations
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => {
      // For real-time alerts, we don't need to mark as read since they're dynamic
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
      toast.success('Alert marked as read');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to mark alert as read');
    },
  });

  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => {
      // For real-time alerts, we don't need to resolve since they're dynamic
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
      toast.success('Alert resolved successfully');
      setIsResolveAlertModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve alert');
    },
  });

  const bulkResolveMutation = useMutation({
    mutationFn: (data: any) => {
      // For real-time alerts, we don't need to bulk resolve since they're dynamic
      return Promise.resolve({ success: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
      setSelectedAlerts([]);
      toast.success('Alerts resolved successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve alerts');
    },
  });

  const checkLowStockMutation = useMutation({
    mutationFn: (data: any) => stockAlertAPI.checkLowStock(data),
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
      toast.success(`Stock check completed. ${response.data.alertsFound} alerts found.`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check low stock');
    },
  });

  // Fetch inventory levels
  const { data: inventoryLevels, isPending: levelsLoading } = useQuery({
    queryKey: ['inventory-levels', searchTerm],
    queryFn: () => inventoryAPI.getInventoryLevels(),
    enabled: activeTab === 'levels'
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

  // Stock Alerts data
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['stock-alerts', { 
      page: currentPage, 
      limit: pageSize, 
      search: searchTerm, 
      alertType: alertTypeFilter === 'all' ? undefined : alertTypeFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      isResolved: statusFilter === 'unresolved' ? false : statusFilter === 'resolved' ? true : undefined
    }],
    queryFn: () => stockAlertAPI.getStockAlerts({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      alertType: alertTypeFilter === 'all' ? undefined : alertTypeFilter,
      severity: severityFilter === 'all' ? undefined : severityFilter,
      isResolved: statusFilter === 'unresolved' ? false : statusFilter === 'resolved' ? true : undefined
    }),
    enabled: activeTab === 'alerts'
  });

  // Stock Alert stats
  const { data: alertStatsData } = useQuery({
    queryKey: ['stock-alert-stats'],
    queryFn: () => stockAlertAPI.getStockAlertStats(),
    enabled: activeTab === 'alerts'
  });

  // Stock Taking data (fetch when tab is active)
  const { data: stockTakingData } = useQuery({
    queryKey: ['stock-taking-data'],
    queryFn: () => enhancedInventoryAPI.getWarehouseDashboard(),
    enabled: activeTab === 'stock-taking'
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

  const productOptions = (productsList?.data?.data || []).map((p: any) => ({ value: p._id, label: `${p.name} (${p.sku})` }));
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

  // Stock Alerts columns
  const alertsColumns = [
    {
      key: 'product',
      label: 'Product',
      render: (row: any) => (
        <div className="flex items-center">
          <ExclamationTriangleIcon className="h-5 w-5 text-gray-400 mr-2" />
          <div>
            <div className="font-medium text-gray-900">{row.productName}</div>
            <div className="text-sm text-gray-500">{row.sku}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'alertType',
      label: 'Alert Type',
      render: (row: any) => (
        <div className="flex flex-col space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertTypeColor(row.alertType)}`}>
            {(row.alertType || 'unknown').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(row.severity)}`}>
            {(row.severity || 'unknown').charAt(0).toUpperCase() + (row.severity || 'unknown').slice(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'currentStock',
      label: 'Stock Level',
      render: (row: any) => (
        <div className="text-sm">
          <div className="text-gray-900">{row.currentStock} units</div>
          <div className="text-gray-500">Threshold: {row.threshold}</div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (row: any) => (
        <div className="text-sm text-gray-900">
          {row.warehouse?.name || 'No warehouse'}
        </div>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (row: any) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {row.message}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => (
        <div className="flex items-center space-x-2">
          {!row.isRead && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              New
            </span>
          )}
          {row.isResolved ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Resolved
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              Open
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (row: any) => (
        <div className="text-sm text-gray-900">
          {new Date(row.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              setSelectedAlert(row);
              setIsViewAlertModalOpen(true);
            }}
          >
            View
          </Button>
          {!row.isRead && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => markAsReadMutation.mutate(row._id)}
            >
              Mark Read
            </Button>
          )}
          {!row.isResolved && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                setSelectedAlert(row);
                setIsResolveAlertModalOpen(true);
              }}
            >
              Resolve
            </Button>
          )}
        </div>
      ),
    },
  ];

  const tabs = [
    { id: 'levels', name: 'Inventory Levels', icon: CubeIcon },
    { id: 'movements', name: 'Stock Movements', icon: ArrowPathIcon },
    { id: 'alerts', name: 'Low Stock Alerts', icon: ExclamationTriangleIcon },
    { id: 'warehouse', name: 'Warehouse Operations', icon: BuildingOfficeIcon },
    { id: 'stock-taking', name: 'Stock Taking', icon: ClipboardDocumentListIcon },
    { id: 'receiving', name: 'Receiving', icon: TruckIcon },
    { id: 'picking', name: 'Picking', icon: ShoppingCartIcon },
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
            {hasPermission('inventory', 'update') && (
              <Button
                onClick={() => setIsStockTakingModalOpen(true)}
                leftIcon={<ClipboardDocumentListIcon className="h-4 w-4" />}
                variant="secondary"
              >
                Stock Taking
              </Button>
            )}
            {hasPermission('inventory', 'create') && (
              <Button
                onClick={() => setIsReceivingModalOpen(true)}
                leftIcon={<TruckIcon className="h-4 w-4" />}
                variant="secondary"
              >
                Receiving
              </Button>
            )}
            {hasPermission('inventory', 'update') && (
              <Button
                onClick={() => setIsPickingModalOpen(true)}
                leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                variant="secondary"
              >
                Picking
              </Button>
            )}
            {hasPermission('inventory', 'update') && (
              <Button
                onClick={() => setIsMoveStockModalOpen(true)}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
                variant="secondary"
              >
                Move Stock
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
              data={Array.isArray(inventoryLevels?.data?.data) ? inventoryLevels.data.data : []}
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
              data={Array.isArray(movementsData?.data?.data) ? movementsData.data.data : []}
              loading={movementsLoading}
              pagination={movementsData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No stock movements found"
            />
          </div>
        )}

        {/* Stock Alerts Tab */}
        {activeTab === 'alerts' && (
          <div className="space-y-6">
            {/* Alert Stats */}
            {alertStatsData && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                      <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.totalAlerts || 0}</p>
              </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-8 w-8 text-orange-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Critical Alerts</p>
                      <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.criticalAlerts || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-8 w-8 text-green-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Resolved Today</p>
                      <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.resolvedToday || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <ClockIcon className="h-8 w-8 text-blue-600" />
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Avg Resolution Time</p>
                      <p className="text-2xl font-bold text-gray-900">{alertStatsData?.data?.avgResolutionTime || 0}h</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters and Actions */}
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="w-full sm:w-64">
                    <Input
                      type="text"
                      placeholder="Search alerts..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      fullWidth
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      options={[
                        { value: 'all', label: 'All Types' },
                        { value: 'low_stock', label: 'Low Stock' },
                        { value: 'out_of_stock', label: 'Out of Stock' },
                        { value: 'overstock', label: 'Overstock' },
                        { value: 'expiring_soon', label: 'Expiring Soon' },
                        { value: 'expired', label: 'Expired' },
                        { value: 'reorder_point', label: 'Reorder Point' },
                      ]}
                      value={alertTypeFilter}
                      onChange={(e) => setAlertTypeFilter(e.target.value)}
                      fullWidth
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      options={[
                        { value: 'all', label: 'All Severities' },
                        { value: 'low', label: 'Low' },
                        { value: 'medium', label: 'Medium' },
                        { value: 'high', label: 'High' },
                        { value: 'critical', label: 'Critical' },
                      ]}
                      value={severityFilter}
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      fullWidth
                    />
                  </div>
                  <div className="w-full sm:w-48">
                    <Select
                      options={[
                        { value: 'unresolved', label: 'Unresolved' },
                        { value: 'resolved', label: 'Resolved' },
                        { value: 'all', label: 'All Status' },
                      ]}
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      fullWidth
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {selectedAlerts.length > 0 && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        bulkResolveMutation.mutate({
                          alertIds: selectedAlerts,
                          resolutionNotes: 'Bulk resolved from inventory page'
                        });
                      }}
                    >
                      Resolve Selected ({selectedAlerts.length})
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    onClick={() => {
                      checkLowStockMutation.mutate({
                        checkAllProducts: true,
                        autoResolve: false
                      });
                    }}
                  >
                    Check Low Stock
                  </Button>
                </div>
              </div>
            </div>

            {/* Alerts Table */}
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Stock Alerts</h3>
            </div>
            <DataTable
                columns={alertsColumns}
                data={alertsData?.data?.data || []}
                loading={alertsLoading}
                pagination={{
                  page: currentPage,
                  limit: pageSize,
                  total: alertsData?.data?.total || 0,
                  pages: alertsData?.data?.totalPages || 1,
                }}
              />
            </div>
          </div>
        )}

        {/* Warehouse Operations Tab */}
        {activeTab === 'warehouse' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <BuildingOfficeIcon className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Warehouses</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {warehouseDashboard?.data?.warehouseStats?.totalWarehouses || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-8 w-8 text-red-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Low Stock Alerts</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {warehouseDashboard?.data?.lowStockAlerts || 0}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center">
                  <ShoppingCartIcon className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Pending Orders</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {warehouseDashboard?.data?.pendingOrders || 0}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Recent Warehouse Movements</h3>
              </div>
              <div className="p-6">
                {warehouseDashboard?.data?.recentMovements?.length > 0 ? (
                  <div className="space-y-3">
                    {warehouseDashboard?.data?.recentMovements?.map((movement: any, index: number) => (
                      <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                        <div className="flex items-center">
                          <div className={`w-2 h-2 rounded-full mr-3 ${
                            movement.movementType === 'in' ? 'bg-green-500' :
                            movement.movementType === 'out' ? 'bg-red-500' :
                            'bg-blue-500'
                          }`} />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {movement.product?.name || 'Unknown Product'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {movement.movementType} - {movement.quantity} units
                            </p>
                          </div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(movement.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent movements</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Taking Tab */}
        {activeTab === 'stock-taking' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center">
                <ClipboardDocumentListIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-sm font-medium text-blue-800">
                  Stock Taking / Cycle Count
                </h3>
              </div>
              <p className="mt-1 text-sm text-blue-700">
                Perform physical inventory counts and adjust stock levels accordingly.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Start Stock Taking</h3>
                <Button
                  onClick={() => setIsStockTakingModalOpen(true)}
                  leftIcon={<ClipboardDocumentListIcon className="h-4 w-4" />}
                  variant="primary"
                >
                  New Stock Taking
                </Button>
              </div>
              
              {/* Stock Taking Statistics */}
              {stockTakingData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Total Products</p>
                        <p className="text-lg font-bold text-blue-900">
                          {stockTakingData?.data?.productStats?.totalProducts || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800">In Stock</p>
                        <p className="text-lg font-bold text-green-900">
                          {stockTakingData?.data?.productStats?.inStockProducts || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-6 w-6 text-orange-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Low Stock</p>
                        <p className="text-lg font-bold text-orange-900">
                          {stockTakingData?.data?.productStats?.lowStockProducts || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            <div className="text-center py-8">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Stock Taking Operations</h3>
                <p className="text-gray-500 mb-4">Click "New Stock Taking" to start a cycle count and adjust inventory levels.</p>
              </div>
            </div>
          </div>
        )}

        {/* Receiving Tab */}
        {activeTab === 'receiving' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center">
                <TruckIcon className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-sm font-medium text-green-800">
                  Goods Receiving
                </h3>
              </div>
              <p className="mt-1 text-sm text-green-700">
                Process incoming goods from suppliers and update inventory levels.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Process Receiving</h3>
                <Button
                  onClick={() => setIsReceivingModalOpen(true)}
                  leftIcon={<TruckIcon className="h-4 w-4" />}
                  variant="primary"
                >
                  New Receiving
                </Button>
              </div>
              
              {/* Receiving Statistics */}
              {receivingData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <BuildingOfficeIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Total Warehouses</p>
                        <p className="text-lg font-bold text-blue-900">
                          {receivingData?.data?.warehouseStats?.totalWarehouses || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ArrowUpIcon className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Recent Receipts</p>
                        <p className="text-lg font-bold text-green-900">
                          {receivingData?.data?.movementStats?.receiptsToday || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="h-6 w-6 text-purple-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-purple-800">Pending Receipts</p>
                        <p className="text-lg font-bold text-purple-900">
                          {receivingData?.data?.movementStats?.pendingReceipts || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            <div className="text-center py-8">
              <TruckIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Receiving Operations</h3>
                <p className="text-gray-500 mb-4">Click "New Receiving" to process incoming goods and update inventory levels.</p>
              </div>
            </div>
          </div>
        )}

        {/* Picking Tab */}
        {activeTab === 'picking' && (
          <div className="space-y-4">
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center">
                <ShoppingCartIcon className="h-5 w-5 text-purple-600 mr-2" />
                <h3 className="text-sm font-medium text-purple-800">
                  Order Picking
                </h3>
              </div>
              <p className="mt-1 text-sm text-purple-700">
                Process order picking operations and update inventory levels.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Start Picking</h3>
                <Button
                  onClick={() => setIsPickingModalOpen(true)}
                  leftIcon={<ShoppingCartIcon className="h-4 w-4" />}
                  variant="primary"
                >
                  New Picking
                </Button>
              </div>
              
              {/* Picking Statistics */}
              {pickingData && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ShoppingCartIcon className="h-6 w-6 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Total Orders</p>
                        <p className="text-lg font-bold text-blue-900">
                          {pickingData?.data?.movementStats?.picksToday || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ArrowDownIcon className="h-6 w-6 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800">Completed Picks</p>
                        <p className="text-lg font-bold text-green-900">
                          {pickingData?.data?.movementStats?.completedPicks || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <ClockIcon className="h-6 w-6 text-orange-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-orange-800">Pending Picks</p>
                        <p className="text-lg font-bold text-orange-900">
                          {pickingData?.data?.movementStats?.pendingPicks || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
            <div className="text-center py-8">
              <ShoppingCartIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Picking Operations</h3>
                <p className="text-gray-500 mb-4">Click "New Picking" to process order picking and update inventory levels.</p>
              </div>
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

        {/* View Alert Modal */}
        <Modal
          isOpen={isViewAlertModalOpen}
          onClose={() => setIsViewAlertModalOpen(false)}
          title="Alert Details"
          size="lg"
        >
          {selectedAlert && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{selectedAlert.productName}</div>
                    <div className="text-gray-500">SKU: {selectedAlert.sku}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Warehouse</label>
                  <div className="text-sm text-gray-900">{selectedAlert.warehouse?.name || 'No warehouse'}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Alert Type</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertTypeColor(selectedAlert.alertType)}`}>
                    {(selectedAlert.alertType || 'unknown').replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(selectedAlert.severity)}`}>
                    {(selectedAlert.severity || 'unknown').charAt(0).toUpperCase() + (selectedAlert.severity || 'unknown').slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock</label>
                  <div className="text-sm text-gray-900">{selectedAlert.currentStock} units</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Threshold</label>
                  <div className="text-sm text-gray-900">{selectedAlert.threshold} units</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="flex items-center space-x-2">
                    {!selectedAlert.isRead && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        New
                      </span>
                    )}
                    {selectedAlert.isResolved ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Resolved
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Open
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Created</label>
                  <div className="text-sm text-gray-900">{new Date(selectedAlert.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                <div className="text-sm text-gray-900 p-3 bg-gray-50 rounded-md">
                  {selectedAlert.message}
                </div>
              </div>
              {selectedAlert.resolutionNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
                  <div className="text-sm text-gray-900 p-3 bg-green-50 rounded-md">
                    {selectedAlert.resolutionNotes}
                  </div>
                </div>
              )}
            </div>
          )}
        </Modal>

        {/* Resolve Alert Modal */}
        <Modal
          isOpen={isResolveAlertModalOpen}
          onClose={() => setIsResolveAlertModalOpen(false)}
          title="Resolve Alert"
          size="lg"
        >
          {selectedAlert && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const resolutionNotes = formData.get('resolutionNotes') as string;
                const action = formData.get('action') as string;
                
                resolveAlertMutation.mutate({
                  id: selectedAlert._id,
                  data: {
                    isResolved: true,
                    resolutionNotes,
                    resolutionAction: action,
                    resolvedAt: new Date().toISOString()
                  }
                });
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Product</label>
                  <div className="text-sm text-gray-900">
                    <div className="font-medium">{selectedAlert.productName}</div>
                    <div className="text-gray-500">SKU: {selectedAlert.sku}</div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Stock</label>
                  <div className="text-sm text-gray-900">{selectedAlert.currentStock} units</div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Action</label>
                <Select
                  options={[
                    { value: 'reordered', label: 'Reordered Stock' },
                    { value: 'adjusted', label: 'Adjusted Stock Levels' },
                    { value: 'discontinued', label: 'Product Discontinued' },
                    { value: 'false_positive', label: 'False Positive' },
                    { value: 'other', label: 'Other' },
                  ]}
                  name="action"
                  required
                  fullWidth
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Resolution Notes</label>
                <textarea
                  name="resolutionNotes"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter resolution notes..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsResolveAlertModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={resolveAlertMutation.isPending}
                >
                  Resolve Alert
                </Button>
              </div>
            </form>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default InventoryPage;
