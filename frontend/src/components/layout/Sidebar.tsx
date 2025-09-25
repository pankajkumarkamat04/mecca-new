'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn } from '@/lib/utils';
import {
  HomeIcon,
  UserGroupIcon,
  CubeIcon,
  UsersIcon,
  UserIcon,
  TruckIcon,
  DocumentTextIcon,
  ArchiveBoxIcon,
  CreditCardIcon,
  ChartBarIcon,
  FolderIcon,
  LifebuoyIcon,
  CalculatorIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
} from '@heroicons/react/24/outline';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: {
    module: string;
    action: string;
  };
  badge?: string;
  children?: SidebarItem[];
}

const sidebarItems: SidebarItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
  },
  {
    name: 'POS',
    href: '/pos',
    icon: CreditCardIcon,
    permission: { module: 'pos', action: 'read' },
  },
  {
    name: 'Workshop',
    href: '/workshop',
    icon: ClipboardDocumentListIcon,
    permission: { module: 'workshop', action: 'read' },
  },
  {
    name: 'Users',
    href: '/users',
    icon: UserGroupIcon,
    permission: { module: 'users', action: 'read' },
  },
  {
    name: 'Products',
    href: '/products',
    icon: CubeIcon,
    permission: { module: 'products', action: 'read' },
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: UsersIcon,
    permission: { module: 'customers', action: 'read' },
  },
  {
    name: 'Suppliers',
    href: '/suppliers',
    icon: TruckIcon,
    permission: { module: 'suppliers', action: 'read' },
  },
  {
    name: 'Invoices',
    href: '/invoices',
    icon: DocumentTextIcon,
    permission: { module: 'invoices', action: 'read' },
  },
  {
    name: 'Quotations',
    href: '/quotations',
    icon: DocumentTextIcon,
    permission: { module: 'quotations', action: 'read' },
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingBagIcon,
    permission: { module: 'orders', action: 'read' },
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: ArchiveBoxIcon,
    permission: { module: 'inventory', action: 'read' },
  },

  {
    name: 'Support',
    href: '/support',
    icon: LifebuoyIcon,
    permission: { module: 'support', action: 'read' },
  },
  {
    name: 'Transactions',
    href: '/transactions',
    icon: BanknotesIcon,
    permission: { module: 'transactions', action: 'read' },
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: ChartBarIcon,
    permission: { module: 'reports', action: 'read' },
  },
  {
    name: 'Profile',
    href: '/profile',
    icon: UserIcon,
  },
  {
    name: 'Settings',
    href: '/settings',
    icon: CogIcon,
    permission: { module: 'settings', action: 'read' },
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const { company } = useSettings();

  const handleLogout = async () => {
    await logout();
    // Layout component will handle redirect when isAuthenticated becomes false
  };

  const filteredItems = sidebarItems.filter((item) => {
    if (!item.permission) return true;
    return hasPermission(item.permission.module, item.permission.action);
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            {company?.logo?.url ? (
              <div className="flex items-center space-x-3">
                <img
                  src={company.logo.url}
                  alt={company.name || 'Company Logo'}
                  className="h-8 w-8 object-contain"
                />
                <h1 className="text-xl font-bold text-white">
                  {company.name || 'POS System'}
                </h1>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-white">
                {company?.name || 'POS System'}
              </h1>
            )}
          </div>

          {/* User Info */}
          {user && (
            <div className="px-4 py-3 border-b border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {user.avatar ? (
                    <img
                      className="w-8 h-8 rounded-full"
                      src={user.avatar}
                      alt={`${user.firstName} ${user.lastName}`}
                    />
                  ) : (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{user.role}</p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={onClose}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    )}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto bg-red-100 text-red-600 text-xs font-medium px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
                <div className="p-4 border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="group flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 rounded-md hover:bg-gray-50 hover:text-gray-900"
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                    Logout
                  </button>
                </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
