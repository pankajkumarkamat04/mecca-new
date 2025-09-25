'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

const CustomerDashboardPage: React.FC = () => {
  const { user, isLoading, isAuthenticated, hasRole } = useAuth();

  if (isLoading) {
    return (
      <Layout title="My Dashboard">
        <div className="bg-white shadow rounded-lg p-6">
          <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
        </div>
      </Layout>
    );
  }

  if (!isAuthenticated) {
    return null; // Layout will handle redirect to login
  }

  if (!hasRole('customer')) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return null;
  }

  return (
    <Layout title="My Dashboard">
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName}</h1>
          <p className="text-gray-600">Here is a quick overview of your account.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Wallet Balance</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {new Intl.NumberFormat(undefined, { style: 'currency', currency: user?.wallet?.currency || 'USD' }).format(user?.wallet?.balance || 0)}
            </p>
            <div className="mt-4">
              <Link href="/support" className="text-sm text-blue-600 hover:text-blue-800">View transactions →</Link>
            </div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Loyalty Points</h3>
            <p className="mt-2 text-3xl font-bold text-green-600">{user?.preferences ? (user as any).loyalty?.points ?? 0 : 0}</p>
            <div className="mt-4 text-sm text-gray-500">Tier: {(user as any).loyalty?.tier || 'bronze'}</div>
          </div>

          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-sm font-medium text-gray-500">Support</h3>
            <p className="mt-2 text-gray-900">Open and track your support tickets.</p>
            <div className="mt-4">
              <Link href="/support" className="text-sm text-blue-600 hover:text-blue-800">Go to Support →</Link>
            </div>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/invoices" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-medium text-gray-900">My Invoices</div>
                <div className="text-xs text-gray-500">View billing history</div>
              </div>
            </Link>

            <Link href="/profile" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">👤</div>
                <div className="text-sm font-medium text-gray-900">My Profile</div>
                <div className="text-xs text-gray-500">Update your details</div>
              </div>
            </Link>

            <Link href="/support" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🛟</div>
                <div className="text-sm font-medium text-gray-900">Support Tickets</div>
                <div className="text-xs text-gray-500">Create or view tickets</div>
              </div>
            </Link>

            <Link href="/products" className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🛍️</div>
                <div className="text-sm font-medium text-gray-900">Browse Products</div>
                <div className="text-xs text-gray-500">Explore catalog</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerDashboardPage;


