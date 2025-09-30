'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { supportAPI, customersAPI } from '@/lib/api';
import api from '@/lib/api';
import { formatDate, formatNumber } from '@/lib/utils';
import { SupportTicket } from '@/types';
import { Form, FormActions, FormField, FormSection } from '@/components/ui/Form';
import { useAuth } from '@/contexts/AuthContext';
import { z } from 'zod';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  UserIcon,
  TagIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

const SupportPage: React.FC = () => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');

  const queryClient = useQueryClient();

  // Fetch support tickets
  const { data: ticketsData, isPending } = useQuery({
    queryKey: ['support-tickets', currentPage, pageSize, searchTerm, filterStatus, filterPriority],
    queryFn: () => supportAPI.getSupportTickets({
      page: currentPage,
      limit: pageSize,
      search: searchTerm,
      status: filterStatus === 'all' ? undefined : filterStatus,
      priority: filterPriority === 'all' ? undefined : filterPriority,
    }),
    placeholderData: (previousData) => previousData,
  });

  // Fetch overdue tickets
  const { data: overdueTickets } = useQuery({
    queryKey: ['overdue-tickets'],
    queryFn: () => supportAPI.getOverdueTickets(),
  });

  // Update ticket status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ ticketId, status }: { ticketId: string; status: string }) =>
      supportAPI.updateTicketStatus(ticketId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update ticket status');
    },
  });

  // Assign ticket mutation
  const assignTicketMutation = useMutation({
    mutationFn: ({ ticketId, assignedTo }: { ticketId: string; assignedTo: string }) =>
      supportAPI.assignTicket(ticketId, assignedTo),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Ticket assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign ticket');
    },
  });

  const handleViewTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsViewModalOpen(true);
  };

  const handleReplyTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setIsReplyModalOpen(true);
  };

  const handleUpdateStatus = (ticketId: string, status: string) => {
    updateStatusMutation.mutate({ ticketId, status });
  };

  const handleAssignTicket = (ticketId: string, assignedTo: string) => {
    assignTicketMutation.mutate({ ticketId, assignedTo });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      open: { color: 'bg-red-100 text-red-800', label: 'Open' },
      in_progress: { color: 'bg-blue-100 text-blue-800', label: 'In Progress' },
      waiting_customer: { color: 'bg-yellow-100 text-yellow-800', label: 'Waiting Customer' },
      waiting_support: { color: 'bg-orange-100 text-orange-800', label: 'Waiting Support' },
      resolved: { color: 'bg-green-100 text-green-800', label: 'Resolved' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.open;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      low: { color: 'bg-gray-100 text-gray-800', label: 'Low' },
      medium: { color: 'bg-yellow-100 text-yellow-800', label: 'Medium' },
      high: { color: 'bg-orange-100 text-orange-800', label: 'High' },
      urgent: { color: 'bg-red-100 text-red-800', label: 'Urgent' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const getCategoryIcon = (category: string) => {
    const iconConfig = {
      technical: '🔧',
      billing: '💳',
      general: '❓',
      bug_report: '🐛',
      feature_request: '✨',
      complaint: '😠',
    };

    return iconConfig[category as keyof typeof iconConfig] || '❓';
  };

  const isOverdue = (ticket: SupportTicket) => {
    if (!ticket.sla.resolutionTime || ticket.status === 'closed' || ticket.status === 'resolved') {
      return false;
    }
    
    const createdDate = new Date(ticket.createdAt);
    const resolutionDeadline = new Date(createdDate.getTime() + ticket.sla.resolutionTime * 60 * 60 * 1000);
    
    return new Date() > resolutionDeadline;
  };

  const columns = [
    {
      key: 'ticketNumber',
      label: 'Ticket',
      sortable: true,
      render: (row: SupportTicket) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.ticketNumber}</div>
          <div className="text-sm text-gray-500">{formatDate(row.createdAt)}</div>
        </div>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      sortable: true,
      render: (row: SupportTicket) => (
        <div>
          <div className="text-sm font-medium text-gray-900">{row.ticketNumber}</div>
          <div className="text-sm text-gray-500 flex items-center">
            <span className="mr-2">{getCategoryIcon(row.category)}</span>
            <span className="capitalize">{row.category.replace('_', ' ')}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (row: SupportTicket) => (
        <div className="text-sm text-gray-900">
          {typeof row.customer === 'object' 
            ? `${row.customer.firstName} ${row.customer.lastName}`
            : 'Unknown Customer'
          }
        </div>
      ),
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      sortable: true,
      render: (row: SupportTicket) => (
        <div className="text-sm text-gray-900">
          {row.assignedTo && typeof row.assignedTo === 'object'
            ? `${row.assignedTo.firstName} ${row.assignedTo.lastName}`
            : 'Unassigned'
          }
        </div>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (row: SupportTicket) => (
        <div className="flex flex-col space-y-1">
          {getPriorityBadge(row.priority)}
          {isOverdue(row) && (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
              Overdue
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => getStatusBadge(value),
    },
    {
      key: 'lastUpdate',
      label: 'Last Update',
      sortable: true,
      render: (row: SupportTicket) => (
        <div className="text-sm text-gray-900">
          {row.conversations && row.conversations.length > 0
            ? formatDate(row.conversations[row.conversations.length - 1].createdAt)
            : formatDate(row.createdAt)
          }
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: SupportTicket) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewTicket(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Ticket"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleReplyTicket(row)}
            className="text-green-600 hover:text-green-900"
            title="Reply"
          >
            <ChatBubbleLeftRightIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'waiting_customer', label: 'Waiting Customer' },
    { value: 'waiting_support', label: 'Waiting Support' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'closed', label: 'Closed' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priority' },
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <Layout title="Support Tickets">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
            <p className="text-gray-600">Manage customer support and technical issues</p>
          </div>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            leftIcon={<PlusIcon className="h-4 w-4" />}
          >
            New Ticket
          </Button>
        </div>

        {/* Support Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Open Tickets</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {ticketsData?.data?.data?.filter((t: SupportTicket) => t.status === 'open').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {ticketsData?.data?.data?.filter((t: SupportTicket) => t.status === 'in_progress').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Resolved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {ticketsData?.data?.data?.filter((t: SupportTicket) => t.status === 'resolved').length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {overdueTickets?.data?.data?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search tickets by number, subject, or customer..."
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
            <div className="w-full sm:w-48">
              <Select
                options={priorityOptions}
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                fullWidth
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Overdue
              </Button>
              <Button variant="outline" size="sm">
                Export
              </Button>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <DataTable
          columns={columns}
          data={ticketsData?.data?.data || []}
          loading={isPending}
          pagination={ticketsData?.data?.pagination}
          onPageChange={setCurrentPage}
          emptyMessage="No support tickets found"
        />

        {/* Create Ticket Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Support Ticket"
          size="lg"
        >
          <CreateTicketForm
            onClose={() => setIsCreateModalOpen(false)}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
              setIsCreateModalOpen(false);
            }}
          />
        </Modal>

        {/* View Ticket Modal */}
        <Modal
          isOpen={isViewModalOpen}
          onClose={() => setIsViewModalOpen(false)}
          title="Support Ticket Details"
          size="xl"
        >
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Header */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{selectedTicket.subject}</h3>
                  <p className="text-sm text-gray-500">#{selectedTicket.ticketNumber}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Created: {formatDate(selectedTicket.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex justify-end space-x-2 mb-2">
                    {getStatusBadge(selectedTicket.status)}
                    {getPriorityBadge(selectedTicket.priority)}
                  </div>
                  <div className="text-sm text-gray-600">
                    Category: <span className="capitalize">{selectedTicket.category.replace('_', ' ')}</span>
                  </div>
                </div>
              </div>

              {/* Ticket Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm text-gray-900">{selectedTicket.description}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
                  <p className="text-sm text-gray-900">
                    {typeof selectedTicket.customer === 'object' 
                      ? `${selectedTicket.customer.firstName} ${selectedTicket.customer.lastName}`
                      : 'Unknown Customer'
                    }
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <p className="text-sm text-gray-900">
                    {selectedTicket.assignedTo && typeof selectedTicket.assignedTo === 'object'
                      ? `${selectedTicket.assignedTo.firstName} ${selectedTicket.assignedTo.lastName}`
                      : 'Unassigned'
                    }
                  </p>
                </div>
              </div>

              {/* Conversation History */}
              {selectedTicket.conversations && selectedTicket.conversations.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Conversation History</label>
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {selectedTicket.conversations.map((conversation, index) => (
                      <div key={index} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center">
                            <UserIcon className="h-4 w-4 text-gray-400 mr-2" />
                            <span className="text-sm font-medium text-gray-900">
                              {typeof conversation.user === 'object' 
                                ? `${conversation.user.firstName} ${conversation.user.lastName}`
                                : 'Unknown User'
                              }
                            </span>
                            {conversation.isInternal && (
                              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Internal
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">{formatDate(conversation.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700">{conversation.message}</p>
                        {conversation.attachments && conversation.attachments.length > 0 && (
                          <div className="mt-2 flex space-x-2">
                            {conversation.attachments.map((attachment, attIndex) => (
                              <div key={attIndex} className="flex items-center text-xs text-gray-500">
                                <PaperClipIcon className="h-3 w-3 mr-1" />
                                {attachment.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between">
                <div className="flex space-x-3">
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'in_progress')}
                  >
                    Mark In Progress
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleUpdateStatus(selectedTicket._id, 'resolved')}
                  >
                    Mark Resolved
                  </Button>
                </div>
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

        {/* Reply Ticket Modal */}
        <Modal
          isOpen={isReplyModalOpen}
          onClose={() => setIsReplyModalOpen(false)}
          title="Reply to Ticket"
          size="lg"
        >
          {selectedTicket && (
            <SupportReplyForm 
              ticket={selectedTicket}
              onSuccess={() => setIsReplyModalOpen(false)}
            />
          )}
        </Modal>
      </div>
    </Layout>
  );
};

// Create Ticket Form Component
const CreateTicketForm: React.FC<{ onClose: () => void; onSuccess: () => void }> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    customer: '',
    category: 'general',
    priority: 'medium',
    type: 'customer',
    assignedTo: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers-list'],
    queryFn: () => customersAPI.getCustomers({ limit: 100, page: 1 }),
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  // Fetch users for assignment dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users-list'],
    queryFn: () => api.get('/users', { params: { limit: 100, page: 1 } }),
    staleTime: 5 * 60 * 1000
  });

  const createTicketMutation = useMutation({
    mutationFn: (ticketData: any) => supportAPI.createSupportTicket(ticketData),
    onSuccess: () => {
      toast.success('Support ticket created successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create support ticket');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Only include customer if it's selected
    const ticketData = { ...formData };
    if (!ticketData.customer) {
      delete (ticketData as any).customer;
    }

    await createTicketMutation.mutateAsync(ticketData);
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const customerOptions = (customersData?.data?.data || []).map((customer: any) => ({
    value: customer._id,
    label: `${customer.firstName} ${customer.lastName} (${customer.email})`
  }));

  const userOptions = (usersData?.data?.data || []).map((user: any) => ({
    value: user._id,
    label: `${user.firstName} ${user.lastName} (${user.email})`
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <Input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            placeholder="Brief description of the issue"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Customer
          </label>
          <Select
            options={[
              { value: '', label: 'Select customer (optional)', disabled: false },
              ...customerOptions
            ]}
            value={formData.customer}
            onChange={(e) => setFormData(prev => ({ ...prev, customer: e.target.value }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category
          </label>
          <Select
            options={[
              { value: 'general', label: 'General' },
              { value: 'technical', label: 'Technical' },
              { value: 'billing', label: 'Billing' },
              { value: 'bug_report', label: 'Bug Report' },
              { value: 'feature_request', label: 'Feature Request' },
              { value: 'complaint', label: 'Complaint' }
            ]}
            value={formData.category}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority
          </label>
          <Select
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
            value={formData.priority}
            onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <Select
            options={[
              { value: 'customer', label: 'Customer' },
              { value: 'employee', label: 'Employee' }
            ]}
            value={formData.type}
            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Assigned To
        </label>
        <Select
          options={[
            { value: '', label: 'Unassigned', disabled: false },
            ...userOptions
          ]}
          value={formData.assignedTo}
          onChange={(e) => setFormData(prev => ({ ...prev, assignedTo: e.target.value }))}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Please provide detailed information about the issue..."
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Tags
        </label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              type="text"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddTag}
              disabled={!newTag.trim()}
            >
              Add
            </Button>
          </div>
          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={createTicketMutation.isPending}
        >
          {createTicketMutation.isPending ? 'Creating...' : 'Create Ticket'}
        </Button>
      </div>
    </form>
  );
};

// Support Reply Form Component
const SupportReplyForm: React.FC<{ 
  ticket: SupportTicket | null; 
  onSuccess: () => void; 
}> = ({ ticket, onSuccess }) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const replySchema = useMemo(() => z.object({
    message: z.string().min(1, 'Message is required'),
    isInternal: z.boolean().default(false),
  }), []);

  const replyToTicketMutation = useMutation({
    mutationFn: (data: any) => {
      // This would call a support reply API
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 1000);
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-tickets'] });
      toast.success('Reply sent successfully');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send reply');
    },
  });

  if (!ticket) return null;

  return (
    <Form
      schema={replySchema}
      defaultValues={{ 
        message: '',
        isInternal: false
      }}
      onSubmit={async (values) => {
        await replyToTicketMutation.mutateAsync(values);
      }}
      loading={replyToTicketMutation.isPending}
    >{(methods) => (
      <div className="space-y-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Original Ticket</h4>
          <p className="text-sm text-gray-600 mb-2">
            <strong>Subject:</strong> {ticket.subject}
          </p>
          <p className="text-sm text-gray-600">
            <strong>Description:</strong> {ticket.description}
          </p>
        </div>

        <FormSection title="Reply">
          <div className="space-y-4">
            <FormField label="Message" required error={methods.formState.errors.message?.message as string}>
              <textarea
                {...methods.register('message')}
                className="input"
                rows={4}
                placeholder="Type your reply here..."
              />
            </FormField>
            <FormField label="Internal Note">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  {...methods.register('isInternal')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 text-sm text-gray-700">
                  This is an internal note (not visible to customer)
                </label>
              </div>
            </FormField>
          </div>
        </FormSection>

        <FormActions
          onCancel={onSuccess}
          submitText={replyToTicketMutation.isPending ? 'Sending...' : 'Send Reply'}
          loading={replyToTicketMutation.isPending}
        />
      </div>
    )}</Form>
  );
};

export default SupportPage;
