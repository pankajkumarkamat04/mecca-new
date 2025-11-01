'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ConditionalLayout from '@/components/layout/ConditionalLayout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { receivedGoodsAPI, purchaseOrderAPI } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';

const ReceivedGoodsPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isDiscrepancyModalOpen, setIsDiscrepancyModalOpen] = useState(false);
  const [isCombinedInspectionModalOpen, setIsCombinedInspectionModalOpen] = useState(false);
  const [selectedReceivedGoods, setSelectedReceivedGoods] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  
  // State for quality inspection form data
  const [qualityInspectionData, setQualityInspectionData] = useState<any[]>([]);

  const queryClient = useQueryClient();
  
  // Permission checks
  const canCreate = hasPermission('receivedGoods', 'create');
  const canUpdate = hasPermission('receivedGoods', 'update');
  const canDelete = hasPermission('receivedGoods', 'delete');

  // Initialize quality inspection data
  const initializeQualityInspectionData = (receivedGoods: any) => {
    if (receivedGoods?.items) {
      const initialData = receivedGoods.items.map((item: any) => ({
        itemId: item._id,
        qualityStatus: item.qualityStatus || 'pending',
        defectiveQuantity: item.defectiveQuantity || 0,
        damagedQuantity: item.damagedQuantity || 0,
        hasDiscrepancy: item.hasDiscrepancy || false,
        qualityNotes: item.qualityNotes || ''
      }));
      setQualityInspectionData(initialData);
    }
  };
  
  // Fetch received goods
  const { data: receivedGoodsData, isPending } = useQuery({
    queryKey: ['receivedGoods', currentPage, pageSize, searchTerm, filterStatus],
    queryFn: () => receivedGoodsAPI.getReceivedGoods({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: filterStatus === 'all' ? undefined : filterStatus,
    })
  });

  // Approve received goods mutation
  const approveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      receivedGoodsAPI.approveReceivedGoods(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedGoods'] });
      toast.success('Received goods approved successfully');
      setIsViewModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve received goods');
    },
  });

  // Inspect received goods mutation
  const inspectMutation = useMutation({
    mutationFn: ({ id, inspectionResults, notes }: { id: string; inspectionResults: any; notes?: string }) =>
      receivedGoodsAPI.inspectReceivedGoods(id, { inspectionResults, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedGoods'] });
      toast.success('Inspection completed successfully');
      setIsInspectModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete inspection');
    },
  });


  // Resolve discrepancy mutation
  const resolveDiscrepancyMutation = useMutation({
    mutationFn: ({ id, resolutionData }: { id: string; resolutionData: any }) =>
      receivedGoodsAPI.resolveDiscrepancy(id, resolutionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedGoods'] });
      toast.success('Discrepancies resolved successfully');
      setIsDiscrepancyModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve discrepancies');
    },
  });

  // Quality inspection mutation
  const qualityInspectionMutation = useMutation({
    mutationFn: ({ id, inspectionData }: { id: string; inspectionData: any }) =>
      receivedGoodsAPI.performQualityInspection(id, inspectionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['receivedGoods'] });
      toast.success('Quality inspection completed successfully');
      setIsCombinedInspectionModalOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete quality inspection');
    },
  });

  const receivedGoods = receivedGoodsData?.data?.data || [];
  const totalPages = receivedGoodsData?.data?.pagination?.pages || 0;

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'conditional', label: 'Conditional' },
    { value: 'inspected', label: 'Inspected' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const columns = [
    {
      key: 'receiptNumber',
      label: 'Receipt Number',
      render: (row: any) => (
        <div className="font-medium text-gray-900">{row.receiptNumber}</div>
      ),
    },
    {
      key: 'purchaseOrderNumber',
      label: 'Purchase Order',
      render: (row: any) => (
        <div className="text-sm text-gray-600">{row.purchaseOrderNumber}</div>
      ),
    },
    {
      key: 'supplierName',
      label: 'Supplier',
      render: (row: any) => (
        <div className="text-sm text-gray-900">{row.supplierName}</div>
      ),
    },
    {
      key: 'receivedDate',
      label: 'Received Date',
      render: (row: any) => (
        <div className="text-sm text-gray-600">{formatDate(row.receivedDate)}</div>
      ),
    },
    {
      key: 'totalItems',
      label: 'Items',
      render: (row: any) => (
        <div className="text-sm text-gray-600">{row.totalItems} items</div>
      ),
    },
    {
      key: 'totalValue',
      label: 'Value',
      render: (row: any) => (
        <div className="text-sm font-medium text-gray-900">
          {formatCurrency(row.totalValue)}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(row.status)}`}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedReceivedGoods(row);
    setIsViewModalOpen(true);
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          {row.status === 'pending' && canUpdate && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedReceivedGoods(row);
                  setIsInspectModalOpen(true);
                }}
                title="Basic Inspection"
              >
                <ClipboardDocumentListIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedReceivedGoods(row);
                  initializeQualityInspectionData(row);
                  setIsCombinedInspectionModalOpen(true);
                }}
                title="Quality Inspection"
              >
                <MagnifyingGlassIcon className="h-4 w-4" />
              </Button>
            </>
          )}
          {/* Show Quality Inspection button for inspected/conditional status to allow re-inspection */}
          {['inspected', 'conditional'].includes(row.status) && canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedReceivedGoods(row);
                initializeQualityInspectionData(row);
                setIsCombinedInspectionModalOpen(true);
              }}
              title="Re-inspect Quality"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
            </Button>
          )}
          {row.status === 'conditional' && canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedReceivedGoods(row);
                setIsDiscrepancyModalOpen(true);
              }}
              title="Resolve Discrepancies"
            >
              <XCircleIcon className="h-4 w-4" />
            </Button>
          )}
          {['inspected', 'conditional'].includes(row.status) && canUpdate && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to approve these received goods?')) {
                  approveMutation.mutate({ id: row._id });
                }
              }}
              loading={approveMutation.isPending}
              title="Approve & Add to Inventory"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

    return (
    <ConditionalLayout title="Received Goods">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Received Goods</h1>
            <p className="text-gray-600">Manage and inspect received goods from purchase orders</p>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by receipt number, PO number, or supplier..."
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
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          data={receivedGoods}
          columns={columns}
          loading={isPending}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: receivedGoodsData?.data?.pagination?.total || 0,
            pages: totalPages
          }}
          onPageChange={setCurrentPage}
          emptyMessage="No received goods found"
        />

        {/* View Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Received Goods Details"
          size="lg"
        >
          {selectedReceivedGoods && (
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Receipt Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceivedGoods.receiptNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Purchase Order</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceivedGoods.purchaseOrderNumber}</p>
      </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceivedGoods.supplierName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedReceivedGoods.status)}`}>
                    {selectedReceivedGoods.status.charAt(0).toUpperCase() + selectedReceivedGoods.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Received Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReceivedGoods.receivedDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Value</label>
                  <p className="mt-1 text-sm font-medium text-gray-900">{formatCurrency(selectedReceivedGoods.totalValue)}</p>
                </div>
              </div>

              {/* Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Received Items</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ordered</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Received</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Condition</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReceivedGoods.items?.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.productName}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.orderedQuantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.receivedQuantity}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.unitCost)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{formatCurrency(item.totalCost)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{item.condition}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedReceivedGoods.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedReceivedGoods.notes}</p>
            </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                onClick={() => setIsViewModalOpen(false)}
              >
                Close
                </Button>
                {['pending', 'inspected'].includes(selectedReceivedGoods.status) && canUpdate && (
                  <Button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to approve these received goods?')) {
                        approveMutation.mutate({ id: selectedReceivedGoods._id });
                      }
                    }}
                    loading={approveMutation.isPending}
                  >
                    Approve & Add to Inventory
                  </Button>
                          )}
                        </div>
            </div>
          )}
        </Modal>

        {/* Inspect Modal */}
        <Modal
          isOpen={isInspectModalOpen}
          onClose={() => setIsInspectModalOpen(false)}
          title="Inspect Received Goods"
          size="lg"
        >
          {selectedReceivedGoods && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <ClipboardDocumentListIcon className="h-5 w-5 text-yellow-400" />
              </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Quality Inspection Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Please inspect the received items and mark them as passed or failed.</p>
                </div>
                </div>
              </div>
            </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Result</label>
                  <div className="space-y-2">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="inspectionResult"
                        value="passed"
                        className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Passed - All items meet quality standards</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="inspectionResult"
                        value="failed"
                        className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300"
                      />
                      <span className="ml-2 text-sm text-gray-700">Failed - Items do not meet quality standards</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Inspection Notes</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Add inspection notes..."
                  />
        </div>
      </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsInspectModalOpen(false)}
              >
                Cancel
                </Button>
                <Button
                  onClick={() => {
                    const inspectionResult = document.querySelector('input[name="inspectionResult"]:checked') as HTMLInputElement;
                    const notes = (document.querySelector('textarea') as HTMLTextAreaElement).value;
                    
                    if (!inspectionResult) {
                      toast.error('Please select an inspection result');
                      return;
                    }

                    inspectMutation.mutate({
                      id: selectedReceivedGoods._id,
                      inspectionResults: {
                        passed: inspectionResult.value === 'passed',
                        notes: notes
                      },
                      notes: notes
                    });
                  }}
                  loading={inspectMutation.isPending}
                >
                  Complete Inspection
                </Button>
          </div>
        </div>
      )}
        </Modal>



        {/* Discrepancy Resolution Modal */}
        <Modal
          isOpen={isDiscrepancyModalOpen}
          onClose={() => setIsDiscrepancyModalOpen(false)}
          title="Resolve Discrepancies"
          size="lg"
        >
          {selectedReceivedGoods && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <XCircleIcon className="h-5 w-5 text-yellow-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Discrepancy Resolution Required
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>Resolve discrepancies found during inspection before approval.</p>
                    </div>
            </div>
          </div>
        </div>

            <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Discrepancy Resolution</h4>
                {selectedReceivedGoods.items?.filter((item: any) => item.hasDiscrepancy).map((item: any, index: number) => (
                  <div key={index} className="border rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                        <label className="block text-sm font-medium text-gray-700">Product</label>
                        <p className="mt-1 text-sm text-gray-900">{item.productName}</p>
                </div>
                <div>
                        <label className="block text-sm font-medium text-gray-700">Discrepancy Type</label>
                        <p className="mt-1 text-sm text-gray-900">{item.discrepancyType}</p>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700">Resolution Notes</label>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={3}
                          placeholder="Describe how this discrepancy was resolved..."
                        />
                </div>
              </div>
            </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setIsDiscrepancyModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Process discrepancy resolution data
                    const resolutionData = {
                      items: selectedReceivedGoods.items.filter((item: any) => item.hasDiscrepancy).map((item: any, index: number) => ({
                        itemId: item._id,
                        resolutionNotes: (document.querySelectorAll('textarea')[index] as HTMLTextAreaElement).value
                      })),
                      notes: 'Discrepancies resolved'
                    };
                    
                    resolveDiscrepancyMutation.mutate({
                      id: selectedReceivedGoods._id,
                      resolutionData
                    });
                  }}
                  loading={resolveDiscrepancyMutation.isPending}
                >
                  Resolve Discrepancies
                </Button>
          </div>
        </div>
      )}
        </Modal>

        {/* Quality Inspection Modal */}
        <Modal
          isOpen={isCombinedInspectionModalOpen}
          onClose={() => setIsCombinedInspectionModalOpen(false)}
          title="Quality Inspection"
          size="lg"
        >
          {selectedReceivedGoods && (
            <div className="space-y-6">
              {/* Header */}
              <div className="border rounded-md p-4 bg-green-50 border-green-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <MagnifyingGlassIcon className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Comprehensive Quality Inspection
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>
                        Inspect received items and mark quality status for each item.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quality Inspection Content */}
              <div className="space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Item Quality Assessment</h4>
                {selectedReceivedGoods.items?.map((item: any, index: number) => {
                  const inspectionItem = qualityInspectionData[index] || {};
                  return (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Product</label>
                          <p className="mt-1 text-sm text-gray-900">{item.productName}</p>
                </div>
                <div>
                          <label className="block text-sm font-medium text-gray-700">Received Quantity</label>
                          <p className="mt-1 text-sm text-gray-900">{item.receivedQuantity}</p>
                </div>
                <div>
                          <label className="block text-sm font-medium text-gray-700">Defective Quantity</label>
                          <Input
                            type="number"
                            value={inspectionItem.defectiveQuantity || 0}
                            onChange={(e) => {
                              const newData = [...qualityInspectionData];
                              newData[index] = { ...newData[index], defectiveQuantity: parseInt(e.target.value) || 0 };
                              setQualityInspectionData(newData);
                            }}
                            min="0"
                            max={item.receivedQuantity}
                          />
                </div>
                <div>
                          <label className="block text-sm font-medium text-gray-700">Damaged Quantity</label>
                          <Input
                            type="number"
                            value={inspectionItem.damagedQuantity || 0}
                            onChange={(e) => {
                              const newData = [...qualityInspectionData];
                              newData[index] = { ...newData[index], damagedQuantity: parseInt(e.target.value) || 0 };
                              setQualityInspectionData(newData);
                            }}
                            min="0"
                            max={item.receivedQuantity}
                          />
                </div>
                <div>
                          <label className="block text-sm font-medium text-gray-700">Quality Status</label>
                          <Select
                            options={[
                              { value: 'pending', label: 'Pending' },
                              { value: 'passed', label: 'Passed' },
                              { value: 'failed', label: 'Failed' },
                              { value: 'conditional', label: 'Conditional' }
                            ]}
                            value={inspectionItem.qualityStatus || 'pending'}
                            onChange={(e) => {
                              const newData = [...qualityInspectionData];
                              newData[index] = { ...newData[index], qualityStatus: e.target.value };
                              setQualityInspectionData(newData);
                            }}
                          />
              </div>
              <div>
                          <label className="block text-sm font-medium text-gray-700">Quality Notes</label>
                          <textarea
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            rows={2}
                            placeholder="Add quality inspection notes..."
                            value={inspectionItem.qualityNotes || ''}
                            onChange={(e) => {
                              const newData = [...qualityInspectionData];
                              newData[index] = { ...newData[index], qualityNotes: e.target.value };
                              setQualityInspectionData(newData);
                            }}
                          />
                </div>
              </div>
            </div>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button variant="outline" onClick={() => setIsCombinedInspectionModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (!selectedReceivedGoods.items || selectedReceivedGoods.items.length === 0) {
                      toast.error('No items found for inspection');
                      return;
                    }
                    if (qualityInspectionData.length === 0) {
                      toast.error('Please fill in the inspection data');
                      return;
                    }
                    const inspectionData = {
                      items: qualityInspectionData,
                      notes: 'Quality inspection completed'
                    };
                    console.log('🔍 [DEBUG] Frontend sending inspection data:', {
                      id: selectedReceivedGoods._id,
                      inspectionData: inspectionData,
                      qualityInspectionDataLength: qualityInspectionData.length
                    });
                    qualityInspectionMutation.mutate({
                      id: selectedReceivedGoods._id,
                      inspectionData: inspectionData
                    });
                  }}
                  loading={qualityInspectionMutation.isPending}
                >
                  Complete Quality Inspection
                </Button>
          </div>
        </div>
      )}
        </Modal>
      </div>
    </ConditionalLayout>
  );
};

export default ReceivedGoodsPage;
