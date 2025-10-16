'use client';

import React from 'react';
import Layout from '@/components/layout/Layout';
import ServiceTemplateManager from '@/components/workshop/ServiceTemplateManager';

const ServiceTemplatesPage: React.FC = () => {
  return (
    <Layout>
      <div className="p-6">
        <ServiceTemplateManager />
      </div>
    </Layout>
  );
};

export default ServiceTemplatesPage;
