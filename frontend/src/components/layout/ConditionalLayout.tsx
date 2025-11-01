'use client';

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Layout from './Layout';
import WarehousePortalLayout from '@/app/warehouse-portal/layout';

interface ConditionalLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const ConditionalLayout: React.FC<ConditionalLayoutProps> = ({ children, title }) => {
  const { user } = useAuth();

  // If user is warehouse manager or warehouse employee, use WarehousePortalLayout
  if (user?.role === 'warehouse_manager' || user?.role === 'warehouse_employee') {
    return <WarehousePortalLayout>{children}</WarehousePortalLayout>;
  }

  // Otherwise use regular Layout
  return <Layout title={title}>{children}</Layout>;
};

export default ConditionalLayout;

