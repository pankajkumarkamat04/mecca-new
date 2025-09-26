'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Table from '@/components/ui/Table';
import Badge from '@/components/ui/Badge';
import { customerInquiriesAPI } from '@/lib/api';
import CreateCustomerInquiryForm from '@/components/customer-inquiries/CreateCustomerInquiryForm';
import { CustomerInquiry } from '@/types/customerInquiry';

const CustomerInquiriesPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertType, setConvertType] = useState<'quotation' | 'order'>('quotation');

  const queryClient = useQueryClient();

  // Fetch customer inquiries
  const { data: inquiriesData, isLoading, error } = useQuery({
    queryKey: ['customerInquiries', searchTerm, statusFilter, priorityFilter],
    queryFn: () => customerInquiriesAPI.getCustomerInquiries({
      search: searchTerm,
      status: statusFilter,
      priority: priorityFilter
    }),
  });

  // Fetch inquiry statistics
  const { data: statsData } = useQuery({
    queryKey: ['customerInquiryStats'],
    queryFn: customerInquiriesAPI.getCustomerInquiryStats,
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      customerInquiriesAPI.updateCustomerInquiryStatus(id, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['customerInquiryStats'] });
      setShowStatusModal(false);
    },
  });

  // Assign inquiry mutation
  const assignMutation = useMutation({
    mutationFn: ({ id, assignedTo }: { id: string; assignedTo: string }) =>
      customerInquiriesAPI.assignCustomerInquiry(id, { assignedTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInquiries'] });
      setShowAssignModal(false);
    },
  });

  // Convert inquiry mutation
  const convertMutation = useMutation({
    mutationFn: ({ id, type }: { id: string; type: 'quotation' | 'order' }) =>
      type === 'quotation' 
        ? customerInquiriesAPI.convertInquiryToQuotation(id)
        : customerInquiriesAPI.convertInquiryToOrder(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customerInquiries'] });
      queryClient.invalidateQueries({ queryKey: ['customerInquiryStats'] });
      setShowConvertModal(false);
    },
  });

  const inquiries = inquiriesData?.data || [];
  const stats = statsData?.data || {};

  const handleViewDetails = (inquiry: CustomerInquiry) => {
    setSelectedInquiry(inquiry);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = (inquiry: CustomerInquiry) => {
    setSelectedInquiry(inquiry);
    setShowStatusModal(true);
  };

  const handleAssign = (inquiry: CustomerInquiry) => {
    setSelectedInquiry(inquiry);
    setShowAssignModal(true);
  };

  const handleConvert = (inquiry: CustomerInquiry, type: 'quotation' | 'order') => {
    setSelectedInquiry(inquiry);
    setConvertType(type);
    setShowConvertModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'blue', icon: ClockIcon },
      pending: { color: 'yellow', icon: ClockIcon },
      in_progress: { color: 'purple', icon: PencilIcon },
      resolved: { color: 'green', icon: CheckCircleIcon },
      closed: { color: 'gray', icon: XCircleIcon },
      cancelled: { color: 'red', icon: XCircleIcon },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.new;
    const Icon = config.icon;

    return (
      <Badge color={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ')}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'gray', icon: CheckCircleIcon },
      normal: { color: 'blue', icon: ClockIcon },
      high: { color: 'orange', icon: ExclamationTriangleIcon },
      urgent: { color: 'red', icon: ExclamationTriangleIcon },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    const Icon = config.icon;

    return (
      <Badge color={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {priority}
      </Badge>
    );
  };

  const columns = [
    {
      key: 'inquiryNumber',
      header: 'Inquiry #',
      render: (inquiry: CustomerInquiry) => (
        <div className="font-medium text-gray-900">{inquiry.inquiryNumber}</div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (inquiry: CustomerInquiry) => (
        <div>
          <div className="font-medium text-gray-900">{inquiry.customerName}</div>
          <div className="text-sm text-gray-500">{inquiry.customerEmail}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (inquiry: CustomerInquiry) => (
        <div className="max-w-xs truncate" title={inquiry.subject}>
          {inquiry.subject}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inquiry: CustomerInquiry) => getStatusBadge(inquiry.status),
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (inquiry: CustomerInquiry) => getPriorityBadge(inquiry.priority),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (inquiry: CustomerInquiry) => (
        <div className="text-sm text-gray-500">
          {new Date(inquiry.createdAt).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (inquiry: CustomerInquiry) => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleViewDetails(inquiry)}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUpdateStatus(inquiry)}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (error) {
    return (
      <Layout title="Customer Inquiries">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading inquiries</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Customer Inquiries">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customer Inquiries</h1>
            <p className="text-gray-600">Manage customer inquiries and convert them to quotations or orders</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Inquiry
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">Total Inquiries</div>
              <div className="text-2xl font-bold text-gray-900">{stats.total || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">New</div>
              <div className="text-2xl font-bold text-blue-600">{stats.byStatus?.new || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">In Progress</div>
              <div className="text-2xl font-bold text-purple-600">{stats.byStatus?.in_progress || 0}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <div className="text-sm font-medium text-gray-500">Conversion Rate</div>
              <div className="text-2xl font-bold text-green-600">{stats.conversionRate || 0}%</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <Input
                placeholder="Search inquiries..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<MagnifyingGlassIcon className="h-4 w-4" />}
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="new">New</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
        </div>

        {/* Inquiries Table */}
        <div className="bg-white rounded-lg border">
          <Table
            data={inquiries}
            columns={columns}
            loading={isLoading}
            emptyMessage="No inquiries found"
          />
        </div>

        {/* Create/Edit Inquiry Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Customer Inquiry"
          size="lg"
        >
          <CreateCustomerInquiryForm
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['customerInquiries'] });
              queryClient.invalidateQueries({ queryKey: ['customerInquiryStats'] });
              setShowCreateModal(false);
            }}
          />
        </Modal>

        {/* Inquiry Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Inquiry Details"
          size="lg"
        >
          {selectedInquiry && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Inquiry Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInquiry.inquiryNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedInquiry.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Priority</label>
                  <div className="mt-1">{getPriorityBadge(selectedInquiry.priority)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(selectedInquiry.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <div className="mt-1">
                  <p className="text-sm text-gray-900">{selectedInquiry.customerName}</p>
                  <p className="text-sm text-gray-500">{selectedInquiry.customerEmail}</p>
                  {selectedInquiry.customerPhone && (
                    <p className="text-sm text-gray-500">{selectedInquiry.customerPhone}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <p className="mt-1 text-sm text-gray-900">{selectedInquiry.subject}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Message</label>
                <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {selectedInquiry.message}
                </p>
              </div>

              {selectedInquiry.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInquiry.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleUpdateStatus(selectedInquiry);
                  }}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Status Update Modal */}
        <Modal
          isOpen={showStatusModal}
          onClose={() => setShowStatusModal(false)}
          title="Update Status"
        >
          {selectedInquiry && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <select
                  defaultValue={selectedInquiry.status}
                  onChange={(e) => {
                    // Handle status change
                  }}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="new">New</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Notes</label>
                <textarea
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  rows={3}
                  placeholder="Add notes..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowStatusModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Handle status update
                  }}
                  loading={updateStatusMutation.isPending}
                >
                  Update Status
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerInquiriesPage;