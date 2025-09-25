'use client';

import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import CustomerSidebar from './CustomerSidebar';
import Header from './Header';
import { findRequiredPermission } from '@/lib/permissions';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const { isAuthenticated, isLoading, hasRole, hasPermission } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, isLoading, router]);

  // Redirect customers away from main dashboard to their customer dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && hasRole('customer') && pathname === '/dashboard') {
      router.push('/customer');
    }
  }, [isLoading, isAuthenticated, hasRole, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      {hasRole('customer') ? (
        <CustomerSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      ) : (
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Header */}
        <Header 
          onMenuClick={() => setSidebarOpen(true)} 
          title={title}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {(() => {
                const guard = findRequiredPermission(pathname || '/');
                const lacksRole = guard?.roles && !hasRole(guard.roles);
                const lacksPermission = guard?.permission && !hasPermission(guard.permission.module, guard.permission.action);
                if (lacksRole || lacksPermission) {
                  return (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                      <h3 className="text-lg font-medium text-yellow-800 mb-2">Access Restricted</h3>
                      {lacksRole && (
                        <p className="text-sm text-yellow-700">Your role is not permitted to view this section.</p>
                      )}
                      {lacksPermission && (
                        <p className="text-sm text-yellow-700">You do not have permission to access this page.</p>
                      )}
                    </div>
                  );
                }
                return children;
              })()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
