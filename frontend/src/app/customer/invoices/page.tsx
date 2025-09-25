'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

const CustomerInvoicesPage: React.FC = () => {
  return (
    <Layout title="My Invoices">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">My Invoices</h2>
          <Link href="/support" className="text-sm text-blue-600 hover:text-blue-800">Need help?</Link>
        </div>
        <p className="mt-2 text-gray-600">Invoice list for the customer will appear here.</p>
      </div>
    </Layout>
  );
};

export default CustomerInvoicesPage;


