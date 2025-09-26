'use client';

import React, { useState } from 'react';
import { PrinterIcon, DocumentArrowDownIcon, CheckIcon } from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';

interface PickingListModalProps {
  quotation: any;
  onClose: () => void;
}

const PickingListModal: React.FC<PickingListModalProps> = ({ quotation, onClose }) => {
  const [pickedItems, setPickedItems] = useState<Set<string>>(new Set());

  if (!quotation?.pickingList) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500">No picking list data available</div>
        <div className="mt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  const { items, totalItems, estimatedPickTime, orderInfo } = quotation.pickingList;

  const togglePicked = (itemId: string) => {
    const newPickedItems = new Set(pickedItems);
    if (newPickedItems.has(itemId)) {
      newPickedItems.delete(itemId);
    } else {
      newPickedItems.add(itemId);
    }
    setPickedItems(newPickedItems);
  };

  const markAllPicked = () => {
    setPickedItems(new Set(items.map((item: any) => item.productId)));
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      high: { color: 'red', text: 'High Priority' },
      normal: { color: 'green', text: 'Normal' },
      low: { color: 'gray', text: 'Low Priority' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return <Badge color={config.color as any}>{config.text}</Badge>;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExport = () => {
    // Create CSV content
    const csvContent = [
      ['Product Name', 'SKU', 'Quantity', 'Location', 'Priority', 'Status'],
      ...items.map((item: any) => [
        item.productName,
        item.sku,
        item.quantity,
        item.location ? `${item.location.zone}-${item.location.aisle}-${item.location.shelf}-${item.location.bin}` : 'No Location',
        item.priority,
        pickedItems.has(item.productId) ? 'Picked' : 'Pending'
      ])
    ].map(row => row.join(',')).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `picking-list-${quotation.quotationNumber || 'quotation'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Picking List</h3>
          <p className="text-sm text-gray-500">
            {quotation.quotationNumber} - {quotation.customerName}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-blue-600">Total Items</div>
          <div className="text-2xl font-bold text-blue-900">{totalItems}</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-green-600">Estimated Time</div>
          <div className="text-2xl font-bold text-green-900">
            {Math.ceil(estimatedPickTime)} min
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-sm font-medium text-purple-600">Progress</div>
          <div className="text-2xl font-bold text-purple-900">
            {Math.round((pickedItems.size / items.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(pickedItems.size / items.length) * 100}%` }}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          {pickedItems.size} of {items.length} items picked
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPickedItems(new Set())}
            disabled={pickedItems.size === 0}
          >
            Clear All
          </Button>
          <Button
            variant="outline"
            onClick={markAllPicked}
            disabled={pickedItems.size === items.length}
          >
            Mark All Picked
          </Button>
        </div>
      </div>

      {/* Picking List Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Priority
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item: any, index: number) => {
              const isPicked = pickedItems.has(item.productId);
              return (
                <tr
                  key={index}
                  className={isPicked ? 'bg-green-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                      <div className="text-sm text-gray-500">SKU: {item.sku}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {item.location ? (
                      <div>
                        <div className="font-medium">
                          {item.location.zone}-{item.location.aisle}-{item.location.shelf}-{item.location.bin}
                        </div>
                        {item.location.locationCode && (
                          <div className="text-xs text-gray-500">{item.location.locationCode}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">No Location</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(item.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isPicked ? (
                      <Badge color="green" icon={CheckIcon}>Picked</Badge>
                    ) : (
                      <Badge color="gray">Pending</Badge>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Button
                      variant={isPicked ? "outline" : "primary"}
                      size="sm"
                      onClick={() => togglePicked(item.productId)}
                    >
                      {isPicked ? 'Undo' : 'Pick'}
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        {pickedItems.size === items.length && (
          <Button
            onClick={() => {
              // Complete picking process
              alert('All items picked successfully!');
              onClose();
            }}
          >
            Complete Picking
          </Button>
        )}
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PickingListModal;
