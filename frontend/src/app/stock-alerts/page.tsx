'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stockAlertAPI } from '@/lib/api';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  ExclamationTriangleIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  BellIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface StockAlert {
  _id: string;
  product: {
    _id: string;
    name: string;
    sku: string;
  };
  productName: string;
  sku: string;
  alertType: 'low_stock' | 'out_of_stock' | 'overstock' | 'expiring_soon' | 'expired' | 'reorder_point';
  severity: 'low' | 'medium' | 'high' | 'critical';
  currentStock: number;
  threshold: number;
  message: string;
  warehouse?: {
    _id: string;
    name: string;
    code: string;
  };
  supplier?: {
    _id: string;
    name: string;
  };
  isRead: boolean;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  resolutionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

const StockAlertsPage: React.FC = () => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showBulkResolveModal, setShowBulkResolveModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<StockAlert | null>(null);
  const [selectedAlerts, setSelectedAlerts] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [alertTypeFilter, setAlertTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('unresolved');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const queryClient = useQueryClient();

  // Fetch stock alerts
  const { data: alertsData, isLoading } = useQuery({
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
  });

  // Fetch stock alert stats
  const { data: statsData } = useQuery({
    queryKey: ['stock-alert-stats'],
    queryFn: () => stockAlertAPI.getStockAlertStats(),
  });

  // Mark alert as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => stockAlertAPI.markAlertAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
    },
  });

  // Resolve alert mutation
  const resolveAlertMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => stockAlertAPI.resolveAlert(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
    },
  });

  // Bulk resolve alerts mutation
  const bulkResolveMutation = useMutation({
    mutationFn: (data: any) => stockAlertAPI.bulkResolveAlerts(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
      setSelectedAlerts([]);
    },
  });

  // Check low stock mutation
  const checkLowStockMutation = useMutation({
    mutationFn: (data: any) => stockAlertAPI.checkLowStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
      queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
    },
  });

  const alerts = alertsData?.data?.data || alertsData?.data || [];
  const pagination = alertsData?.data?.pagination || alertsData?.data?.pagination || {};
  const stats = statsData?.data;

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

  const columns = [
    {
      key: 'product',
      label: 'Product',
      render: (value: any, row: StockAlert) => (
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
      render: (value: string, row: StockAlert) => (
        <div className="flex flex-col space-y-1">
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getAlertTypeColor(value)}`}>
            {value.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(row.severity)}`}>
            {row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}
          </span>
        </div>
      ),
    },
    {
      key: 'currentStock',
      label: 'Stock Level',
      render: (value: number, row: StockAlert) => (
        <div className="text-sm">
          <div className="text-gray-900">{value} units</div>
          <div className="text-gray-500">Threshold: {row.threshold}</div>
        </div>
      ),
    },
    {
      key: 'warehouse',
      label: 'Warehouse',
      render: (value: any, row: StockAlert) => (
        <div className="text-sm text-gray-900">
          {row.warehouse?.name || 'No warehouse'}
        </div>
      ),
    },
    {
      key: 'message',
      label: 'Message',
      render: (value: string) => (
        <div className="text-sm text-gray-900 max-w-xs truncate">
          {value}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: any, row: StockAlert) => (
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
      render: (value: string) => (
        <div className="text-sm text-gray-900">
          {new Date(value).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, row: StockAlert) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedAlert(row);
              setShowViewModal(true);
            }}
            className="text-blue-600 hover:text-blue-800"
            title="View Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
          {!row.isRead && (
            <button
              onClick={() => markAsReadMutation.mutate(row._id)}
              className="text-green-600 hover:text-green-800"
              title="Mark as Read"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </button>
          )}
          {!row.isResolved && (
            <button
              onClick={() => {
                setSelectedAlert(row);
                setShowResolveModal(true);
              }}
              className="text-purple-600 hover:text-purple-800"
              title="Resolve Alert"
            >
              <XCircleIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleAlertTypeFilter = (value: string) => {
    setAlertTypeFilter(value);
    setCurrentPage(1);
  };

  const handleSeverityFilter = (value: string) => {
    setSeverityFilter(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleBulkResolve = () => {
    if (selectedAlerts.length === 0) return;
    
    const resolutionNotes = prompt('Enter resolution notes (optional):');
    bulkResolveMutation.mutate({
      alertIds: selectedAlerts,
      resolutionNotes: resolutionNotes || ''
    });
  };

  const handleCheckLowStock = () => {
    checkLowStockMutation.mutate({});
  };

  return (
    <Layout title="Stock Alerts">
      <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stock Alerts</h1>
          <p className="text-gray-600">Monitor and manage stock alerts</p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleCheckLowStock}
            variant="secondary"
            className="flex items-center"
            disabled={checkLowStockMutation.isPending}
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Check Low Stock
          </Button>
          {selectedAlerts.length > 0 && (
            <Button
              onClick={handleBulkResolve}
              className="flex items-center"
              disabled={bulkResolveMutation.isPending}
            >
              <XCircleIcon className="h-5 w-5 mr-2" />
              Resolve Selected ({selectedAlerts.length})
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <BellIcon className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">!</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unresolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.unresolvedAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">!</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Critical</p>
                <p className="text-2xl font-bold text-gray-900">{stats.criticalAlerts}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <span className="text-yellow-600 font-bold">!</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Low Stock</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockAlerts}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search alerts..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={alertTypeFilter}
              onChange={(e) => handleAlertTypeFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Types' },
                { value: 'low_stock', label: 'Low Stock' },
                { value: 'out_of_stock', label: 'Out of Stock' },
                { value: 'overstock', label: 'Overstock' },
                { value: 'expiring_soon', label: 'Expiring Soon' },
                { value: 'expired', label: 'Expired' },
                { value: 'reorder_point', label: 'Reorder Point' },
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={severityFilter}
              onChange={(e) => handleSeverityFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Severity' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'critical', label: 'Critical' },
              ]}
            />
          </div>
          <div className="w-full sm:w-48">
            <Select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Status' },
                { value: 'unresolved', label: 'Unresolved' },
                { value: 'resolved', label: 'Resolved' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow">
        <DataTable
          data={alerts}
          columns={columns}
          loading={isLoading}
          pagination={{
            page: currentPage,
            limit: pageSize,
            total: pagination?.total || 0,
            pages: pagination?.pages || 0,
          }}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* View Alert Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Alert Details"
      >
        {selectedAlert && (
          <ViewAlertDetails alert={selectedAlert} />
        )}
      </Modal>

      {/* Resolve Alert Modal */}
      <Modal
        isOpen={showResolveModal}
        onClose={() => setShowResolveModal(false)}
        title="Resolve Alert"
      >
        {selectedAlert && (
          <ResolveAlertForm
            alert={selectedAlert}
            onSuccess={() => {
              setShowResolveModal(false);
              queryClient.invalidateQueries({ queryKey: ['stock-alerts'] });
              queryClient.invalidateQueries({ queryKey: ['stock-alert-stats'] });
            }}
            onCancel={() => setShowResolveModal(false)}
          />
        )}
      </Modal>
      </div>
    </Layout>
  );
};

// View Alert Details Component
const ViewAlertDetails: React.FC<{ alert: StockAlert }> = ({ alert }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Alert Information</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Product</dt>
              <dd className="text-sm text-gray-900">{alert.productName} ({alert.sku})</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Alert Type</dt>
              <dd className="text-sm text-gray-900">{alert.alertType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Severity</dt>
              <dd className="text-sm text-gray-900">{alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Current Stock</dt>
              <dd className="text-sm text-gray-900">{alert.currentStock} units</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Threshold</dt>
              <dd className="text-sm text-gray-900">{alert.threshold}</dd>
            </div>
          </dl>
        </div>
        <div>
          <h3 className="text-lg font-medium text-gray-900">Status</h3>
          <dl className="mt-2 space-y-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="text-sm text-gray-900">{new Date(alert.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Read Status</dt>
              <dd className="text-sm text-gray-900">{alert.isRead ? 'Read' : 'Unread'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Resolution Status</dt>
              <dd className="text-sm text-gray-900">{alert.isResolved ? 'Resolved' : 'Open'}</dd>
            </div>
            {alert.isResolved && alert.resolvedAt && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolved At</dt>
                <dd className="text-sm text-gray-900">{new Date(alert.resolvedAt).toLocaleString()}</dd>
              </div>
            )}
            {alert.isResolved && alert.resolvedBy && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Resolved By</dt>
                <dd className="text-sm text-gray-900">{alert.resolvedBy.firstName} {alert.resolvedBy.lastName}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-medium text-gray-900">Message</h3>
        <p className="mt-2 text-sm text-gray-900">{alert.message}</p>
      </div>

      {alert.resolutionNotes && (
        <div>
          <h3 className="text-lg font-medium text-gray-900">Resolution Notes</h3>
          <p className="mt-2 text-sm text-gray-900">{alert.resolutionNotes}</p>
        </div>
      )}
    </div>
  );
};

// Resolve Alert Form Component
const ResolveAlertForm: React.FC<{
  alert: StockAlert;
  onSuccess: () => void;
  onCancel: () => void;
}> = ({ alert, onSuccess, onCancel }) => {
  const [resolutionNotes, setResolutionNotes] = useState('');

  const resolveAlertMutation = useMutation({
    mutationFn: (data: any) => stockAlertAPI.resolveAlert(alert._id, data),
    onSuccess: onSuccess,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resolveAlertMutation.mutate({ resolutionNotes });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Alert Details</h3>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-900"><strong>Product:</strong> {alert.productName} ({alert.sku})</p>
          <p className="text-sm text-gray-900"><strong>Alert:</strong> {alert.message}</p>
          <p className="text-sm text-gray-900"><strong>Current Stock:</strong> {alert.currentStock} units</p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Resolution Notes
        </label>
        <textarea
          value={resolutionNotes}
          onChange={(e) => setResolutionNotes(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={4}
          placeholder="Describe how this alert was resolved..."
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={resolveAlertMutation.isPending}>
          {resolveAlertMutation.isPending ? 'Resolving...' : 'Resolve Alert'}
        </Button>
      </div>
    </form>
  );
};

export default StockAlertsPage;
