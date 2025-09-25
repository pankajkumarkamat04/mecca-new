'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/contexts/AuthContext';

const CustomerWalletPage: React.FC = () => {
  const { user } = useAuth();
  return (
    <Layout title="My Wallet">
      <div className="space-y-6">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900">Wallet</h2>
          <p className="mt-2 text-gray-600">Balance and recent transactions.</p>
          <p className="mt-4 text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: user?.wallet?.currency || 'USD' }).format(user?.wallet?.balance || 0)}
          </p>
        </div>
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900">Recent Transactions</h3>
          <p className="text-gray-600 mt-2">Transactions will be listed here.</p>
        </div>
      </div>
    </Layout>
  );
};

export default CustomerWalletPage;


