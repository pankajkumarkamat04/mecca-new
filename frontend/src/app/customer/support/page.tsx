'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { SupportTicket } from '@/types';
import { supportAPI, customersAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import DataTable from '@/components/ui/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  TicketIcon, 
  PlusIcon, 
  EyeIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';

const CustomerSupportPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    category: 'general'
  });
  const [newMessage, setNewMessage] = useState('');

  // Fetch customer record by email
  const { data: customerData, isLoading: customerLoading, error: customerError } = useQuery({
    queryKey: ['customer-by-email', user?.email],
    queryFn: async () => {
      try {
        // Try to get customer by searching
        const response = await customersAPI.getCustomers({ 
          page: 1, 
          limit: 100, // Get more results to ensure we find the customer
          search: user?.email 
        });
        // Find customer by exact email match
        const customers = response?.data?.data || [];
        const customer = customers.find((c: any) => c.email === user?.email);
        
        return customer || null;
      } catch (error) {
        return null;
      }
    },
    enabled: !!user?.email,
    retry: 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Fetch customer's support tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['customer-support-tickets', currentPage, pageSize, statusFilter, priorityFilter],
    queryFn: () => supportAPI.getSupportTickets({
      page: currentPage,
      limit: pageSize,
      customerId: customerData?._id,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    }),
    enabled: !!customerData?._id
  });

  // Create new ticket mutation
  const createTicketMutation = useMutation({
    mutationFn: (ticketData: any) => supportAPI.createSupportTicket(ticketData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-support-tickets'] });
      setShowCreateModal(false);
      setNewTicket({ subject: '', description: '', priority: 'medium', category: 'general' });
    }
  });

  // Add conversation mutation
  const addConversationMutation = useMutation({
    mutationFn: ({ ticketId, message }: { ticketId: string; message: string }) => 
      supportAPI.addConversation(ticketId, { message, isInternal: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-support-tickets'] });
      setNewMessage('');
    }
  });

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) return;
    
    if (customerLoading) {
      return;
    }
    
    if (!customerData?._id) {
      alert('Unable to find your customer account. Please contact support.');
      return;
    }

    // Create clean ticket data with only required fields
    const ticketData = {
      subject: newTicket.subject,
      description: newTicket.description,
      priority: newTicket.priority,
      category: newTicket.category,
      customer: customerData._id, // Use actual customer ID
      type: 'customer'
    };

    await createTicketMutation.mutateAsync(ticketData);
  };

  const handleAddMessage = async () => {
    if (!newMessage || !selectedTicket) return;

    await addConversationMutation.mutateAsync({
      ticketId: selectedTicket._id,
      message: newMessage,
    });
  };

  const handleViewTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />;
      case 'high':
        return <ExclamationTriangleIcon className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <ClockIcon className="h-4 w-4 text-blue-500" />;
      case 'in_progress':
        return <ClockIcon className="h-4 w-4 text-yellow-500" />;
      case 'resolved':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'closed':
        return <XCircleIcon className="h-4 w-4 text-gray-500" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const ticketColumns = [
    {
      key: 'ticketNumber',
      label: 'Ticket #',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-gray-900">#{value}</span>
      ),
    },
    {
      key: 'subject',
      label: 'Subject',
      render: (value: string) => (
        <span className="text-sm font-medium text-gray-900">{value}</span>
      ),
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'urgent' ? 'bg-red-100 text-red-800' :
          value === 'high' ? 'bg-orange-100 text-orange-800' :
          value === 'medium' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getPriorityIcon(value)}
          <span className="ml-1">{value.charAt(0).toUpperCase() + value.slice(1)}</span>
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'open' ? 'bg-blue-100 text-blue-800' :
          value === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
          value === 'resolved' ? 'bg-green-100 text-green-800' :
          value === 'closed' ? 'bg-gray-100 text-gray-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getStatusIcon(value)}
          <span className="ml-1">{value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')}</span>
        </span>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'lastUpdated',
      label: 'Last Updated',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleViewTicket(row)}
            className="text-blue-600 hover:text-blue-900"
            title="View Ticket"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const getStatusCounts = () => {
    if (!ticketsData?.data?.data) return {};
    
    const tickets = ticketsData.data.data;
    return {
      total: tickets.length,
      open: tickets.filter((t: any) => t.status === 'open').length,
      inProgress: tickets.filter((t: any) => t.status === 'in_progress').length,
      resolved: tickets.filter((t: any) => t.status === 'resolved').length,
      closed: tickets.filter((t: any) => t.status === 'closed').length,
    };
  };

  const statusCounts = getStatusCounts();

  return (
    <Layout title="Support Tickets">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Support Tickets</h2>
              <p className="text-gray-600">Manage and track your support requests</p>
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2"
            >
              <PlusIcon className="h-5 w-5" />
              New Ticket
            </Button>
          </div>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TicketIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total</p>
                <p className="text-2xl font-bold text-gray-900">{statusCounts.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Open</p>
                <p className="text-2xl font-bold text-blue-600">{statusCounts.open}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClockIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-bold text-yellow-600">{statusCounts.inProgress}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{statusCounts.resolved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white shadow rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircleIcon className="h-8 w-8 text-gray-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Closed</p>
                <p className="text-2xl font-bold text-gray-600">{statusCounts.closed}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="sm:w-48">
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={priorityFilter}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriorityFilter(e.target.value)}
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tickets Table */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TicketIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Your Tickets</h3>
              </div>
              <div className="text-sm text-gray-500">
                {ticketsData?.data?.pagination?.total || 0} total tickets
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={ticketColumns}
              data={ticketsData?.data?.data || []}
              loading={isLoading}
              pagination={ticketsData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No support tickets found. Create your first ticket to get started."
            />
          </div>
        </div>

        {/* Create Ticket Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create New Support Ticket"
          size="lg"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subject
              </label>
              <Input
                type="text"
                value={newTicket.subject}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTicket({ ...newTicket, subject: e.target.value })}
                placeholder="Brief description of your issue"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTicket.priority}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTicket({ ...newTicket, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={newTicket.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewTicket({ ...newTicket, category: e.target.value })}
              >
                <option value="general">General</option>
                <option value="billing">Billing</option>
                <option value="technical">Technical</option>
                <option value="feature_request">Feature Request</option>
                <option value="bug_report">Bug Report</option>
                <option value="complaint">Complaint</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                value={newTicket.description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewTicket({ ...newTicket, description: e.target.value })}
                placeholder="Please provide detailed information about your issue..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTicket}
                disabled={
                  !newTicket.subject || 
                  !newTicket.description || 
                  createTicketMutation.isPending || 
                  customerLoading ||
                  !customerData?._id
                }
              >
                {createTicketMutation.isPending 
                  ? 'Creating...' 
                  : customerLoading 
                  ? 'Loading...' 
                  : !customerData?._id 
                  ? 'Customer Account Not Found' 
                  : 'Create Ticket'
                }
              </Button>
            </div>
          </div>
        </Modal>

        {/* Ticket Details Modal */}
        <Modal
          isOpen={showTicketModal}
          onClose={() => setShowTicketModal(false)}
          title={`Ticket #${selectedTicket?.ticketNumber || ''}`}
          size="lg"
        >
          {selectedTicket && (
            <div className="space-y-6">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Ticket Details</h4>
                  <p className="text-sm text-gray-600">Subject: {selectedTicket.subject}</p>
                  <p className="text-sm text-gray-600">Category: {selectedTicket.category}</p>
                  <p className="text-sm text-gray-600">Created: {formatDate(selectedTicket.createdAt)}</p>
                </div>
                <div className="text-right">
                  <div className="mb-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedTicket.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                      selectedTicket.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      selectedTicket.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Priority: {selectedTicket.priority}
                    </span>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      selectedTicket.status === 'open' ? 'bg-blue-100 text-blue-800' :
                      selectedTicket.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      selectedTicket.status === 'resolved' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      Status: {selectedTicket.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded">{selectedTicket.description}</p>
              </div>

              {/* Conversations */}
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Conversation</h4>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {selectedTicket.conversations?.map((conv: any, index: number) => (
                    <div key={index} className={`p-3 rounded-lg ${
                      conv.sender === 'customer' ? 'bg-blue-50 ml-8' : 'bg-gray-50 mr-8'
                    }`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="text-sm text-gray-900">{conv.message}</p>
                        </div>
                        <div className="text-xs text-gray-500 ml-2">
                          {formatDate(conv.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Message */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2">Add Response</h4>
                <div className="space-y-3">
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    value={newMessage}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                  />
                  <div className="flex justify-end">
                    <Button
                      onClick={handleAddMessage}
                      disabled={!newMessage || addConversationMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <ChatBubbleLeftRightIcon className="h-4 w-4" />
                      {addConversationMutation.isPending ? 'Sending...' : 'Send Message'}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerSupportPage;