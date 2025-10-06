'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  ClipboardDocumentListIcon,
  EyeIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { Quotation, QuotationItem, Tax } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
import { calculatePrice } from '@/lib/priceCalculator';
import { quotationsAPI } from '@/lib/api';
import PriceSummary from '@/components/ui/PriceSummary';
import { useAuth } from '@/contexts/AuthContext';

const CustomerQuotationsPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Fetch customer quotations
  const { data: quotationsData, isLoading, error } = useQuery({
    queryKey: ['customerQuotations', user?._id],
    queryFn: () => quotationsAPI.getQuotations({
      customer: user?._id
    }),
    enabled: !!user?._id,
  });

  const quotations = quotationsData?.data?.data || [];

  const handleViewDetails = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setShowDetailsModal(true);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'gray', icon: ClockIcon },
      sent: { color: 'blue', icon: ClockIcon },
      viewed: { color: 'yellow', icon: ClockIcon },
      accepted: { color: 'green', icon: CheckCircleIcon },
      rejected: { color: 'red', icon: XCircleIcon },
      expired: { color: 'gray', icon: XCircleIcon },
      converted: { color: 'purple', icon: CheckCircleIcon },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    const Icon = config.icon;

    return (
      <Badge color={config.color as any} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  const isQuotationExpired = (validUntil: string) => {
    return new Date(validUntil) < new Date();
  };

  if (error) {
    return (
      <Layout title="My Quotations">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading quotations</h3>
          <p className="mt-1 text-sm text-gray-500">
            {error instanceof Error ? error.message : 'Something went wrong'}
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Quotations">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Quotations</h1>
          <p className="text-gray-600">View and manage your quotations</p>
        </div>

        {/* Quotations List */}
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
          ) : quotations.length > 0 ? (
            <div className="divide-y divide-gray-200">
              {quotations.map((quotation: Quotation) => (
                <div key={quotation._id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-gray-900">
                          Quotation #{quotation.quotationNumber}
                        </h3>
                        {getStatusBadge(quotation.status)}
                        {isQuotationExpired(quotation.validUntil) && quotation.status !== 'converted' && (
                          <Badge color="red">Expired</Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Total Amount: {formatCurrency(
                          (quotation as any).totalAmount ?? quotation.total ?? ((quotation.subtotal ?? 0) + (quotation.totalTax ?? 0) + (quotation.shippingCost ?? 0))
                        )}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Created: {formatDate(quotation.quotationDate)}</span>
                        <span>Valid Until: {formatDate(quotation.validUntil)}</span>
                        <span>Items: {quotation.items?.length || 0}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(quotation)}
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                      {quotation.status === 'sent' && !isQuotationExpired(quotation.validUntil) && (
                        <Button size="sm">
                          Accept Quotation
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No quotations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                You don't have any quotations yet.
              </p>
            </div>
          )}
        </div>

        {/* Quotation Details Modal */}
        <Modal
          isOpen={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          title="Quotation Details"
          size="lg"
        >
          {selectedQuotation && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quotation Number</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuotation.quotationNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedQuotation.status)}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quotation Date</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedQuotation.quotationDate)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Valid Until</label>
                  <p className="mt-1 text-sm text-gray-900">{formatDate(selectedQuotation.validUntil)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Items</label>
                <div className="border rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedQuotation.items?.map((item: QuotationItem, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Price Summary */}
              <div className="border-t pt-4">
                {(() => {
                  const priceItems = selectedQuotation.items?.map((item: QuotationItem) => ({
                    name: item.name,
                    quantity: item.quantity || 1,
                    unitPrice: item.unitPrice || 0,
                    discount: item.discount || 0,
                    taxRate: item.taxRate || 0
                  })) || [];
                  
                  // Convert additional taxes from quotation
                  const additionalTaxes = selectedQuotation.taxes?.map((tax: Tax) => ({
                    name: tax.name || 'Tax',
                    rate: tax.rate,
                    description: `Additional ${tax.name || 'Tax'} tax`
                  })) || [];
                  
                  const calculation = calculatePrice(priceItems, [], additionalTaxes, {
                    cost: selectedQuotation.shippingCost || 0
                  });
                  
                  return (
                    <PriceSummary 
                      calculation={calculation} 
                      showBreakdown={true}
                      showItems={false}
                      title=""
                      className="bg-transparent p-0"
                    />
                  );
                })()}
              </div>

              {selectedQuotation.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900">{selectedQuotation.notes}</p>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Close
                </Button>
                {selectedQuotation.status === 'sent' && !isQuotationExpired(selectedQuotation.validUntil) && (
                  <Button>
                    Accept Quotation
                  </Button>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </Layout>
  );
};

export default CustomerQuotationsPage;
