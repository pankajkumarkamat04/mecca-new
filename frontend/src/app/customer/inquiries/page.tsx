'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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

const CustomerInquiriesPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch customer inquiries
  const { data: inquiriesData, isLoading, error } = useQuery({
    queryKey: ['customerInquiries', user?._id],
    queryFn: () => customerInquiriesAPI.getCustomerInquiries({
      customer: user?._id
    }),
    enabled: !!user?._id,
  });

  const inquiries = inquiriesData?.data || [];

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Inquiries</h1>
            <p className="text-gray-600">Track your product inquiries and requests</p>
          </div>
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Inquiry
          </Button>
        </div>

        {/* Inquiries List */}
        <div className="bg-white rounded-lg border">
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
                <div key={inquiry._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          {inquiry.subject}
                        </h3>
                        {getStatusBadge(inquiry.status)}
                        {getPriorityBadge(inquiry.priority)}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        {inquiry.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Inquiry #{inquiry.inquiryNumber}</span>
                        <span>Created: {formatDate(inquiry.inquiryDate)}</span>
                        {inquiry.assignedTo && (
                          <span>Assigned to: {inquiry.assignedTo.firstName} {inquiry.assignedTo.lastName}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
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
            <div className="text-center py-12">
              <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No inquiries found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You haven't submitted any inquiries yet.
              </p>
              <div className="mt-6">
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
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

              {selectedInquiry.productsOfInterest && selectedInquiry.productsOfInterest.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Products of Interest</label>
                  <div className="space-y-2">
                    {selectedInquiry.productsOfInterest.map((item: any, index: number) => (
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

              {selectedInquiry.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedInquiry.notes}</p>
                </div>
              )}

              {selectedInquiry.assignedTo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {selectedInquiry.assignedTo.firstName} {selectedInquiry.assignedTo.lastName}
                  </p>
                </div>
              )}

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
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
