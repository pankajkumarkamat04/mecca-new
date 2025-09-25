'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

const CustomerSupportPage: React.FC = () => {
  return (
    <Layout title="Support">
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Support Tickets</h2>
          <Link href="/support" className="text-sm text-blue-600 hover:text-blue-800">Open full support center</Link>
        </div>
        <p className="mt-2 text-gray-600">Your tickets will be listed here.</p>
      </div>
    </Layout>
  );
};

export default CustomerSupportPage;


