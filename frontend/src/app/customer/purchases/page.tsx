'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useQuery } from 'react-query';
import { invoicesAPI, workshopAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import DataTable from '@/components/ui/DataTable';
import { useAuth } from '@/contexts/AuthContext';
import { DocumentTextIcon, EyeIcon, WrenchScrewdriverIcon } from '@heroicons/react/24/outline';

const CustomerPurchasesPage: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  // Fetch customer's invoices/purchases
  const { data: purchasesData, isLoading: purchasesLoading } = useQuery(
    ['customer-purchases', currentPage, pageSize],
    () => invoicesAPI.getInvoices({
      page: currentPage,
      limit: pageSize,
      customerPhone: user?.phone, // Filter by customer's phone
    }),
    {
      enabled: !!user?.phone,
    }
  );

  // Fetch customer's workshop jobs
  const { data: workshopData, isLoading: workshopLoading } = useQuery(
    ['customer-workshop', user?.phone],
    () => workshopAPI.getJobs({ customerPhone: user?.phone }),
    {
      enabled: !!user?.phone,
    }
  );

  const invoiceColumns = [
    {
      key: 'invoiceNumber',
      label: 'Invoice #',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm font-mono text-gray-900">{value}</span>
      ),
    },
    {
      key: 'invoiceDate',
      label: 'Date',
      sortable: true,
      render: (value: string) => (
        <span className="text-sm text-gray-900">{formatDate(value)}</span>
      ),
    },
    {
      key: 'totalAmount',
      label: 'Total',
      sortable: true,
      render: (value: number) => (
        <span className="text-sm font-medium text-gray-900">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'paid' ? 'bg-green-100 text-green-800' :
          value === 'partial' ? 'bg-yellow-100 text-yellow-800' :
          value === 'overdue' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              // Open invoice details modal or navigate to invoice page
              console.log('View invoice:', row._id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="View Invoice"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  const workshopColumns = [
    {
      key: 'title',
      label: 'Job Title',
      sortable: true,
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
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value === 'completed' ? 'bg-green-100 text-green-800' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          value === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
          value === 'cancelled' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1).replace('_', ' ')}
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
      key: 'actions',
      label: 'Actions',
      render: (_: any, row: any) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              // Open workshop job details modal
              console.log('View workshop job:', row._id);
            }}
            className="text-blue-600 hover:text-blue-900"
            title="View Job Details"
          >
            <EyeIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout title="My Purchases">
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Purchase History</h2>
              <p className="text-gray-600">All your purchases linked to phone number: {user?.phone || 'Not available'}</p>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              {purchasesData?.data?.pagination?.total || 0} total purchases
            </div>
          </div>
        </div>

        {/* Purchases Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Purchase History</h3>
              </div>
              <div className="text-sm text-gray-500">
                {purchasesData?.data?.pagination?.total || 0} total purchases
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={invoiceColumns}
              data={purchasesData?.data?.data || []}
              loading={purchasesLoading}
              pagination={purchasesData?.data?.pagination}
              onPageChange={setCurrentPage}
              emptyMessage="No purchases found. Your purchases will appear here when linked to your phone number."
            />
          </div>
        </div>

        {/* Workshop Jobs Section */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900">Workshop Jobs</h3>
              </div>
              <div className="text-sm text-gray-500">
                {workshopData?.data?.data?.length || 0} total jobs
              </div>
            </div>
          </div>
          <div className="p-6">
            <DataTable
              columns={workshopColumns}
              data={workshopData?.data?.data || []}
              loading={workshopLoading}
              emptyMessage="No workshop jobs found. Your jobs will appear here when linked to your phone number."
            />
          </div>
        </div>

        {!user?.phone && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800">
                  Phone Number Required
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>To view your purchase history, please add a phone number to your profile. 
                  Your purchases will be automatically linked when you provide your phone number at checkout.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CustomerPurchasesPage;
