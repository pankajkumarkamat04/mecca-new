'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CustomerInquiry } from '@/types';
import { 
  ChatBubbleLeftRightIcon,
  PlusIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { customerInquiriesAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import CustomerCreateInquiryForm from '@/components/customer-inquiries/CustomerCreateInquiryForm';

const CustomerInquiriesPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedInquiry, setSelectedInquiry] = useState<CustomerInquiry | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch customer inquiries
  const { data: inquiriesData, isLoading, error, refetch } = useQuery({
    queryKey: ['customerInquiries', user?._id],
    queryFn: () => customerInquiriesAPI.getCustomerInquiries({
      customer: user?._id
    }),
    enabled: !!user?._id,
  });

  const inquiries = inquiriesData?.data?.data || [];

  const handleViewDetails = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      new: { color: 'blue', icon: ClockIcon },
      under_review: { color: 'yellow', icon: ClockIcon },
      quoted: { color: 'green', icon: CheckCircleIcon },
      converted_to_order: { color: 'purple', icon: CheckCircleIcon },
      closed: { color: 'gray', icon: CheckCircleIcon },
      cancelled: { color: 'red', icon: ExclamationTriangleIcon },
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
      low: { color: 'gray' },
      normal: { color: 'blue' },
      high: { color: 'orange' },
      urgent: { color: 'red' },
    };

    const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.normal;
    return <Badge color={config.color as any}>{priority}</Badge>;
  };

  if (error) {
    return (
      <Layout title="My Inquiries">
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
    <Layout title="My Inquiries">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">My Inquiries</h1>
            <p className="text-sm text-gray-600 sm:text-base">Track your product inquiries and requests</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
            <PlusIcon className="mr-2 h-4 w-4" />
            New Inquiry
          </Button>
        </div>

        {/* Inquiries List */}
        <div className="rounded-lg border bg-white">
          {isLoading ? (
            <div className="p-6">
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : inquiries.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {inquiries.map((inquiry: any) => (
                <div key={inquiry._id} className="p-6 transition-colors hover:bg-gray-50">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {inquiry.subject}
                        </h3>
                        {getStatusBadge(inquiry.status)}
                        {getPriorityBadge(inquiry.priority)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {inquiry.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
                        <span>Inquiry #{inquiry.inquiryNumber}</span>
                        <span>Created: {formatDate(inquiry.inquiryDate)}</span>
                        {inquiry.assignedTo && (
                          <span>Assigned to: {inquiry.assignedTo.firstName} {inquiry.assignedTo.lastName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(inquiry)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No inquiries found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't submitted any inquiries yet.
              </p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateModal(true)} className="w-full sm:w-auto">
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Submit Your First Inquiry
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Inquiry Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Inquiry Details"
          size="lg"
        >
          {selectedInquiry && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  <label className="block text-sm font-medium text-gray-700">Created Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedInquiry.inquiryDate)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Subject</label>
                <p className="mt-1 text-sm text-gray-900">{selectedInquiry.subject}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{selectedInquiry.description}</p>
              </div>

              {selectedInquiry.items && selectedInquiry.items.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Products of Interest</label>
                  <div className="space-y-2">
                    {selectedInquiry.items.map((item: any, index: number) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-gray-900">{item.name}</p>
                            <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                          </div>
                          {item.estimatedPrice && (
                            <p className="text-sm text-gray-900">${item.estimatedPrice}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedInquiry.internalNotes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Internal Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInquiry.internalNotes}</p>
                </div>
              )}

              {selectedInquiry.assignedTo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {typeof selectedInquiry.assignedTo === 'string' 
                      ? selectedInquiry.assignedTo 
                      : `${selectedInquiry.assignedTo.firstName} ${selectedInquiry.assignedTo.lastName}`
                    }
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Create Inquiry Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Create Inquiry"
          size="lg"
        >
          <CustomerCreateInquiryForm
            customerId={user?._id}
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              refetch();
            }}
          />
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerInquiriesPage;
