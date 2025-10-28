'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { invoicesAPI, customersAPI, supportAPI } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  DocumentTextIcon, 
  TicketIcon, 
  ShoppingBagIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const CustomerDashboardPage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);

  // Fetch customer data
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-details', user?._id],
    queryFn: () => customersAPI.getCustomerById(user?._id || ''),
    enabled: !!user?._id,
  });

  // Fetch recent invoices (filtered by customer ID on backend)
  const { data: recentInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['customer-recent-invoices', user?._id],
    queryFn: () => invoicesAPI.getInvoices({
      page: 1,
      limit: 5,
      // No customerPhone needed - backend handles customer filtering automatically
    }),
    enabled: !!user,
  });

  // Fetch recent support tickets
  const { data: recentTickets, isLoading: ticketsLoading } = useQuery({
    queryKey: ['customer-recent-tickets', user?._id],
    queryFn: () => supportAPI.getSupportTickets({
      page: 1,
      limit: 3,
      customerId: user?._id,
    }),
    enabled: !!user?._id,
  });



  if (isLoading) {
    return (
      <Layout title="My Dashboard">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 w-40 bg-gray-200 rounded" />
            <div className="h-4 w-60 bg-gray-200 rounded" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null; // Layout will handle redirect to login
  }

  const totalSpent = customerData?.data?.totalPurchases?.amount || 0;
  const visitCount = customerData?.data?.totalPurchases?.count || 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-100';
      case 'partial':
        return 'text-yellow-600 bg-yellow-100';
      case 'overdue':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTicketStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'text-blue-600 bg-blue-100';
      case 'in_progress':
        return 'text-yellow-600 bg-yellow-100';
      case 'resolved':
        return 'text-green-600 bg-green-100';
      case 'closed':
        return 'text-gray-600 bg-gray-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  // Normalize recent tickets response to an array
  const tickets: any[] = Array.isArray(recentTickets?.data?.data)
    ? recentTickets.data.data
    : Array.isArray(recentTickets?.data)
      ? recentTickets.data
      : [];


  return (
    <Layout title="My Dashboard">
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.firstName}!</h1>
              <p className="text-blue-100 mt-1">Here's what's happening with your account</p>
            </div>
            <div className="text-right">
              <p className="text-blue-100 text-sm">Member since</p>
                <p className="text-lg font-semibold">
                  {formatDate(customerData?.data?.createdAt || new Date().toISOString())}
                </p>
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ArrowTrendingUpIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Spent</h3>
                <p className="mt-2 text-3xl font-bold text-green-600">
                  {formatCurrency(totalSpent)}
                </p>
                <div className="mt-4">
                  <Link href="/customer/invoices" className="text-sm text-green-600 hover:text-green-800 flex items-center">
                    View invoices <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShoppingBagIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Total Visits</h3>
                <p className="mt-2 text-3xl font-bold text-purple-600">{visitCount}</p>
                <div className="mt-4">
                  <Link href="/customer/purchases" className="text-sm text-purple-600 hover:text-purple-800 flex items-center">
                    View purchases <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TicketIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <h3 className="text-sm font-medium text-gray-500">Open Tickets</h3>
                <p className="mt-2 text-3xl font-bold text-orange-600">
                  {tickets.filter((t: any) => t.status !== 'closed' && t.status !== 'resolved').length}
                </p>
                <div className="mt-4">
                  <Link href="/customer/support" className="text-sm text-orange-600 hover:text-orange-800 flex items-center">
                    View support <ArrowRightIcon className="h-4 w-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Invoices */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Recent Invoices</h3>
                </div>
                <Link href="/customer/invoices" className="text-sm text-blue-600 hover:text-blue-800">
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {invoicesLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : recentInvoices?.data?.data && recentInvoices.data.data.length > 0 ? (
                <div className="space-y-3">
                  {recentInvoices.data.data.slice(0, 3).map((invoice: any) => (
                    <div key={invoice?._id || Math.random()} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">#{invoice?.invoiceNumber || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">{invoice?.invoiceDate ? formatDate(invoice.invoiceDate) : 'Unknown Date'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{invoice?.total ? formatCurrency(invoice.total) : '$0.00'}</p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice?.status || 'unknown')}`}>
                          {invoice?.status || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No recent invoices found</p>
                  {!user?.phone ? (
                    <p className="text-gray-400 text-xs mt-1">Add phone number to view invoices</p>
                  ) : (
                    <p className="text-gray-400 text-xs mt-1">Your invoices will appear here when available</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Recent Support Tickets */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <TicketIcon className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Recent Support Tickets</h3>
                </div>
                <Link href="/customer/support" className="text-sm text-blue-600 hover:text-blue-800">
                  View all
                </Link>
              </div>
            </div>
            <div className="p-6">
              {ticketsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse flex space-x-4">
                      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    </div>
                  ))}
                </div>
              ) : tickets.length > 0 ? (
                <div className="space-y-3">
                  {tickets.slice(0, 3).map((ticket: any) => (
                    <div key={ticket._id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate">{ticket.subject}</p>
                          <p className="text-xs text-gray-500">{formatDate(ticket.createdAt)}</p>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTicketStatusColor(ticket.status)}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <TicketIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No support tickets found</p>
                  <p className="text-gray-400 text-xs mt-1">You haven't created any support tickets yet</p>
                  <Link href="/customer/support" className="text-blue-600 text-xs hover:text-blue-800 mt-2 inline-block">
                    Create your first ticket
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>


        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/customer/inquiries" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">💬</div>
                <div className="text-sm font-medium text-gray-900">My Inquiries</div>
                <div className="text-xs text-gray-500">Track requests</div>
              </div>
            </Link>

            <Link href="/customer/quotations" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📋</div>
                <div className="text-sm font-medium text-gray-900">My Quotations</div>
                <div className="text-xs text-gray-500">View quotes</div>
              </div>
            </Link>

            <Link href="/customer/orders" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🛍️</div>
                <div className="text-sm font-medium text-gray-900">My Orders</div>
                <div className="text-xs text-gray-500">Track orders</div>
              </div>
            </Link>

            <Link href="/customer/invoices" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-medium text-gray-900">My Invoices</div>
                <div className="text-xs text-gray-500">View billing history</div>
              </div>
            </Link>


            <Link href="/customer/support" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-red-500 hover:bg-red-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🛟</div>
                <div className="text-sm font-medium text-gray-900">Support Tickets</div>
                <div className="text-xs text-gray-500">Get help</div>
              </div>
            </Link>

            <Link href="/customer/purchases" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🛒</div>
                <div className="text-sm font-medium text-gray-900">My Purchases</div>
                <div className="text-xs text-gray-500">Purchase history</div>
              </div>
            </Link>

            <Link href="/profile" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm font-medium text-gray-900">My Profile</div>
                <div className="text-xs text-gray-500">Update details</div>
              </div>
            </Link>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default CustomerDashboardPage;