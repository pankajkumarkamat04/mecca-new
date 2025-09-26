'use client';

import React from 'react';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface InventoryCheckModalProps {
  quotation: any;
  onClose: () => void;
}

const InventoryCheckModal: React.FC<InventoryCheckModalProps> = ({ quotation, onClose }) => {
  if (!quotation?.inventoryCheck) {
    return (
      <div className="text-center py-8">
        <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No inventory data</h3>
        <p className="mt-1 text-sm text-gray-500">Inventory check data not available</p>
        <div className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const { inventoryStatus, summary } = quotation.inventoryCheck;
  const { totalItems, availableItems, unavailableItems, lowStockItems } = summary;

  const getAvailabilityBadge = (item: any) => {
    if (!item.isAvailable) {
      return <Badge color="red" icon={XCircleIcon}>Out of Stock</Badge>;
    }
    if (item.isLowStock) {
      return <Badge color="yellow" icon={ExclamationTriangleIcon}>Low Stock</Badge>;
    }
    if (item.needsReorder) {
      return <Badge color="orange" icon={ExclamationTriangleIcon}>Needs Reorder</Badge>;
    }
    return <Badge color="green" icon={CheckCircleIcon}>Available</Badge>;
  };

  const getPriorityBadge = (item: any) => {
    if (item.requestedQuantity > item.availableQuantity) {
      return <Badge color="red">Critical</Badge>;
    }
    if (item.isLowStock) {
      return <Badge color="yellow">High</Badge>;
    }
    return <Badge color="green">Normal</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm font-medium text-gray-500">Total Items</div>
          <div className="text-2xl font-bold text-gray-900">{totalItems}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm font-medium text-gray-500">Available</div>
          <div className="text-2xl font-bold text-green-600">{availableItems}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm font-medium text-gray-500">Unavailable</div>
          <div className="text-2xl font-bold text-red-600">{unavailableItems}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm font-medium text-gray-500">Low Stock</div>
          <div className="text-2xl font-bold text-yellow-600">{lowStockItems}</div>
        </div>
      </div>

      {/* Inventory Status Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Available
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventoryStatus.map((item: any, index: number) => (
              <tr key={index} className={!item.isAvailable ? 'bg-red-50' : item.isLowStock ? 'bg-yellow-50' : ''}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                    <div className="text-sm text-gray-500">{item.sku}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.requestedQuantity}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.availableQuantity} / {item.currentStock}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getAvailabilityBadge(item)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getPriorityBadge(item)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Unavailable Items Alert */}
      {unavailableItems > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <XCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                {unavailableItems} item(s) are not available
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>The following items need to be restocked before this quotation can be fulfilled:</p>
                <ul className="list-disc list-inside mt-2">
                  {inventoryStatus
                    .filter((item: any) => !item.isAvailable)
                    .map((item: any, index: number) => (
                      <li key={index}>
                        {item.productName} - Need {item.requestedQuantity}, Available {item.availableQuantity}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Low Stock Warning */}
      {lowStockItems > 0 && unavailableItems === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                {lowStockItems} item(s) are running low
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>These items are available but may need reordering soon:</p>
                <ul className="list-disc list-inside mt-2">
                  {inventoryStatus
                    .filter((item: any) => item.isLowStock && item.isAvailable)
                    .map((item: any, index: number) => (
                      <li key={index}>
                        {item.productName} - Stock: {item.currentStock}, Min: {item.minStock}
                      </li>
                    ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* All Available Success */}
      {unavailableItems === 0 && lowStockItems === 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <CheckCircleIcon className="h-5 w-5 text-green-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                All items are available in stock
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>This quotation can be fulfilled immediately. You can proceed to generate a picking list.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {unavailableItems === 0 && (
          <Button
            onClick={() => {
              // Generate picking list
              onClose();
            }}
          >
            Generate Picking List
          </Button>
        )}
      </div>
    </div>
  );
};

export default InventoryCheckModal;
