'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';
import CustomerSidebar from './CustomerSidebar';
import Header from './Header';
import AccessControl from '../auth/AccessControl';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  hideSidebar?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, title, hideSidebar = false }) => {
  const { hasRole } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AccessControl>
      <div className="flex min-h-screen bg-gray-100">
        {/* Sidebar */}
        {!hideSidebar && (
          hasRole('customer') ? (
            <CustomerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          ) : (
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          )
        )}

        {/* Main content */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <Header
            onMenuClick={hideSidebar ? undefined : () => setSidebarOpen(true)}
            title={title}
            hideMenuButton={hideSidebar}
          />

          {/* Page content */}
          <main className="scrollbar-light flex-1 overflow-x-hidden overflow-y-auto bg-gray-50">
            <div className="py-6">
              <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
                {children}
              </div>
            </div>
          </main>
        </div>
      </div>
    </AccessControl>
  );
};

export default Layout;
