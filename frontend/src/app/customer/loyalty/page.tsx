'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';

const CustomerLoyaltyPage: React.FC = () => {
  return (
    <Layout title="Loyalty">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-bold text-gray-900">Loyalty Program</h2>
        <p className="mt-2 text-gray-600">Your points and tier will be shown here.</p>
      </div>
    </Layout>
  );
};

export default CustomerLoyaltyPage;


