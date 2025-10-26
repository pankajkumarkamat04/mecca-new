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
      <div className="h-screen flex overflow-hidden bg-gray-100">
        {/* Sidebar */}
        {!hideSidebar && (
          hasRole('customer') ? (
            <CustomerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          ) : (
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          )
        )}

        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
          {/* Header */}
          <Header 
            onMenuClick={hideSidebar ? undefined : () => setSidebarOpen(true)} 
            title={title}
            hideMenuButton={hideSidebar}
          />

          {/* Page content */}
          <main className="flex-1 overflow-y-auto bg-gray-50 scrollbar-light">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
