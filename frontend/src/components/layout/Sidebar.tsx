'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { cn, getLogoUrl } from '@/lib/utils';
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
  ChatBubbleLeftRightIcon,
  LifebuoyIcon,
  CalculatorIcon,
  BanknotesIcon,
  ClipboardDocumentListIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  ShoppingBagIcon,
  BuildingOfficeIcon,
  ShoppingCartIcon,
  ExclamationTriangleIcon,
  WrenchScrewdriverIcon,
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  permission?: {
    module: string;
    action: string;
  };
  roles?: string[]; // Specific roles that can see this item
  badge?: string;
  children?: SidebarItem[];
}

// Warehouse-specific sidebar configuration
const getWarehouseSidebarItems = (userRole: string): SidebarItem[] => {
  const groups: SidebarItem[] = [
    {
      name: 'Dashboard',
      href: '/warehouse-portal/dashboard',
      icon: HomeIcon,
    },
    {
      name: 'Products',
      href: '/products',
      icon: CubeIcon,
    },
    {
      name: 'Inventory',
      href: '/inventory',
      icon: ArchiveBoxIcon,
    },
    {
      name: 'Orders',
      href: '/warehouse-portal/orders',
      icon: ShoppingBagIcon,
    },
    {
      name: 'Received Goods',
      href: '/received-goods',
      icon: TruckIcon,
    },
    {
      name: 'Workshop',
      href: '/workshop',
      icon: WrenchScrewdriverIcon,
    },
  ];

  if (userRole === 'warehouse_manager') {
    groups.push({
      name: 'Management',
      href: '#',
      icon: CogIcon,
      children: [
        {
          name: 'Staff',
          href: '/warehouse-portal/employees',
          icon: UserGroupIcon,
        },
        {
          name: 'Settings',
          href: '/warehouse-portal/settings',
          icon: CogIcon,
        },
      ],
    });
  }

  groups.push({
    name: 'Profile',
    href: '/profile',
    icon: UserIcon,
  });

  return groups;
};

// Sales-specific sidebar configuration
const getSalesSidebarItems = (userRole: string): SidebarItem[] => {
  return [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
    },
    {
      name: 'Point of Sale',
      href: '/pos',
      icon: CurrencyDollarIcon,
    },
    {
      name: 'Sales',
      href: '#',
      icon: ShoppingBagIcon,
      children: [
        {
          name: 'Products',
          href: '/products',
          icon: CubeIcon,
        },
        {
          name: 'Customers',
          href: '/customers',
          icon: UserGroupIcon,
        },
        {
          name: 'Invoices',
          href: '/invoices',
          icon: DocumentTextIcon,
        },
        {
          name: 'Customer Inquiries',
          href: '/customer-inquiries',
          icon: ChatBubbleLeftRightIcon,
        },
        {
          name: 'Quotations',
          href: '/quotations',
          icon: ClipboardDocumentListIcon,
        },
        {
          name: 'Orders',
          href: '/orders',
          icon: ShoppingBagIcon,
        },
      ],
    },
    {
      name: 'Support',
      href: '/support',
      icon: LifebuoyIcon,
    },
    {
      name: 'Outlet Sales Report',
      href: '/outlet-sales-report',
      icon: BuildingStorefrontIcon,
      permission: { module: 'sales', action: 'read' },
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
    },
  ];
};

// Workshop-specific sidebar configuration
const getWorkshopSidebarItems = (userRole: string): SidebarItem[] => {
  return [
    {
      name: 'Workshop',
      href: '/workshop',
      icon: WrenchScrewdriverIcon,
    },
    // {
    //   name: 'Service Templates',
    //   href: '/service-templates',
    //   icon: ClipboardDocumentCheckIcon,
    // },
    {
      name: 'Customers',
      href: '/customers',
      icon: UserGroupIcon,
    },
    {
      name: 'Support',
      href: '/support',
      icon: LifebuoyIcon,
    },
    {
      name: 'Profile',
      href: '/profile',
      icon: UserIcon,
    },
  ];
};

// Role-based sidebar configuration
const getSidebarItems = (userRole: string): SidebarItem[] => {
  // Department-specific roles get their own sidebar structure
  if (['warehouse_manager', 'warehouse_employee'].includes(userRole)) {
    return getWarehouseSidebarItems(userRole);
  }
  
  if (userRole === 'sales_person') {
    return getSalesSidebarItems(userRole);
  }
  
  if (userRole === 'workshop_employee') {
    return getWorkshopSidebarItems(userRole);
  }

  const baseItems: SidebarItem[] = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: HomeIcon,
    },
  ];

  // We'll prepare Administration (Admin and Manager) to append last
  let adminGroup: SidebarItem | null = null;
  if (['admin', 'manager'].includes(userRole)) {
    adminGroup = {
      name: 'Administration',
      href: '#',
      icon: CogIcon,
      children: [
        {
          name: 'Users',
          href: '/users',
          icon: UserGroupIcon,
          permission: { module: 'users', action: 'read' },
        },
        {
          name: 'Settings',
          href: '/settings',
          icon: CogIcon,
          permission: { module: 'settings', action: 'read' },
        },
      ],
    };
  }

  // Sales and Operations items
  if (['admin', 'manager'].includes(userRole)) {
    baseItems.push(
      {
        name: 'Sales',
        href: '#',
        icon: CreditCardIcon,
        children: [
          {
            name: 'POS',
            href: '/pos',
            icon: CreditCardIcon,
            permission: { module: 'pos', action: 'read' },
          },
          {
            name: 'Sales Outlets',
            href: '/sales-outlets',
            icon: BuildingStorefrontIcon,
            roles: ['admin', 'manager'],
          },
          {
            name: 'Orders',
            href: '/orders',
            icon: ShoppingBagIcon,
            permission: { module: 'orders', action: 'read' },
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
            icon: ClipboardDocumentCheckIcon,
            permission: { module: 'quotations', action: 'read' },
          },
          {
            name: 'Customers',
            href: '/customers',
            icon: UsersIcon,
            permission: { module: 'customers', action: 'read' },
          }
        ],
      },
      {
        name: 'Inventory',
        href: '#',
        icon: ArchiveBoxIcon,
        children: [
          {
            name: 'Products',
            href: '/products',
            icon: CubeIcon,
            permission: { module: 'products', action: 'read' },
          },
          {
            name: 'Inventory',
            href: '/inventory',
            icon: ArchiveBoxIcon,
            permission: { module: 'inventory', action: 'read' },
          },
          {
            name: 'Purchase Orders',
            href: '/purchase-orders',
            icon: ShoppingCartIcon,
            permission: { module: 'purchaseOrders', action: 'read' },
          },
          {
            name: 'Suppliers',
            href: '/suppliers',
            icon: TruckIcon,
            permission: { module: 'suppliers', action: 'read' },
          }
        ],
      },
      {
        name: 'Customer Service',
        href: '#',
        icon: ChatBubbleLeftRightIcon,
        children: [
          {
            name: 'Customer Inquiries',
            href: '/customer-inquiries',
            icon: ChatBubbleLeftRightIcon,
            permission: { module: 'customerInquiries', action: 'read' },
          },
          {
            name: 'Support',
            href: '/support',
            icon: LifebuoyIcon,
            permission: { module: 'support', action: 'read' },
          }
        ],
      }
    );
  }

  // Received Goods (for warehouse management)
  if (['admin', 'manager', 'warehouse_manager', 'warehouse_employee'].includes(userRole)) {
    // Add Received Goods into Inventory group if exists; otherwise show standalone
    const inventoryGroup = baseItems.find((i) => i.name === 'Inventory');
    if (inventoryGroup && inventoryGroup.children) {
      inventoryGroup.children.push({
        name: 'Received Goods',
        href: '/received-goods',
        icon: TruckIcon,
        permission: { module: 'received_goods', action: 'read' },
      });
    } else {
      baseItems.push({
        name: 'Received Goods',
        href: '/received-goods',
        icon: TruckIcon,
        permission: { module: 'received_goods', action: 'read' },
      });
    }
  }

  // Workshop
  if (['admin', 'manager'].includes(userRole)) {
    baseItems.push({
      name: 'Workshop',
      href: '#',
      icon: WrenchScrewdriverIcon,
      children: [
        {
          name: 'Workshop',
          href: '/workshop',
          icon: WrenchScrewdriverIcon,
          permission: { module: 'workshop', action: 'read' },
        },
        // {
        //   name: 'Service Templates',
        //   href: '/service-templates',
        //   icon: ClipboardDocumentCheckIcon,
        //   permission: { module: 'workshop', action: 'read' },
        // },
        {
          name: 'Resources',
          href: '/resources',
          icon: CogIcon,
          permission: { module: 'resources', action: 'read' },
        },
      ],
    });
  }

  // Reports and Analytics
  if (['admin', 'manager', 'sales_person'].includes(userRole)) {
    baseItems.push({
      name: 'Reports & Analytics',
      href: '#',
      icon: ChartBarIcon,
      children: [
        {
          name: 'Reports & Analytics',
          href: '/reports-analytics',
          icon: ChartBarIcon,
          permission: { module: 'reports', action: 'read' },
        },
        {
          name: 'Sales Report',
          href: '/sales-report',
          icon: ChartBarIcon,
          permission: { module: 'sales', action: 'read' },
        },
        {
          name: 'Outlet Sales Report',
          href: '/outlet-sales-report',
          icon: BuildingStorefrontIcon,
          permission: { module: 'sales', action: 'read' },
        },
      ],
    });
  }

  // Finance
  if (['admin', 'manager'].includes(userRole)) {
    baseItems.push({
      name: 'Finance',
      href: '#',
      icon: BanknotesIcon,
      children: [
        {
          name: 'Transactions',
          href: '/transactions',
          icon: BanknotesIcon,
          permission: { module: 'transactions', action: 'read' },
        },
      ],
    });
  }

  // Support (already grouped under Customer Service for staff roles)
  if (userRole === 'customer') {
    baseItems.push({
      name: 'Support',
      href: '/support',
      icon: LifebuoyIcon,
      permission: { module: 'support', action: 'read' },
    });
  }

  // (Transactions moved under Finance)

  // Customer-specific items
  if (userRole === 'customer') {
    baseItems.push(
      {
        name: 'My Orders',
        href: '/customer/orders',
        icon: ShoppingBagIcon,
      },
      {
        name: 'My Invoices',
        href: '/customer/invoices',
        icon: DocumentTextIcon,
      },
      {
        name: 'My Quotations',
        href: '/customer/quotations',
        icon: ClipboardDocumentCheckIcon,
      },
      {
        name: 'My Inquiries',
        href: '/customer/inquiries',
        icon: ChatBubbleLeftRightIcon,
      },
      {
        name: 'My Support',
        href: '/customer/support',
        icon: LifebuoyIcon,
      }
    );
  }

  // (Warehouse Portal moved under Warehouse group)

  // Move Profile into Administration group for main sidebar
  if (adminGroup) {
    adminGroup.children = [
      ...(adminGroup.children || []),
      {
        name: 'Profile',
        href: '/profile',
        icon: UserIcon,
      },
    ];
  }

  // Merge Warehouse Portal and Warehouses under one group
  if (['admin', 'manager'].includes(userRole)) {
    baseItems.push({
      name: 'Warehouse',
      href: '#',
      icon: BuildingOfficeIcon,
      children: [
        {
          name: 'Warehouses',
          href: '/warehouses',
          icon: BuildingOfficeIcon,
          permission: { module: 'warehouses', action: 'read' },
        },
        {
          name: 'Warehouse Portal',
          href: '/warehouse-portal',
          icon: BuildingOfficeIcon,
          roles: ['admin', 'manager'],
        },
      ],
    });
  }

  // Append Administration group last
  if (adminGroup) {
    baseItems.push(adminGroup);
  }

  return baseItems;
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const { user, hasPermission, logout } = useAuth();
  const { company } = useSettings();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const handleLogout = async () => {
    await logout();
    // Layout component will handle redirect when isAuthenticated becomes false
  };

  // Get role-based sidebar items
  const sidebarItems = user ? getSidebarItems(user.role) : [];

  // Filter items based on permissions and roles
  const filteredItems = sidebarItems.filter((item) => {
    // If item has specific roles, check if user role is included
    if (item.roles && !item.roles.includes(user?.role || '')) {
      return false;
    }
    
    // If item has permission requirement, check permission
    if (item.permission) {
      return hasPermission(item.permission.module, item.permission.action);
    }
    
    return true;
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
          'fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-gray-950 shadow-lg">
            {company?.logo?.url ? (
              <div className="flex items-center space-x-3">
                <Image
                  width={32}
                  height={32}
                  src={getLogoUrl(company.logo.url)}
                  alt={company.name || 'Company Logo'}
                  className="object-contain"
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
            <div className="px-4 py-3 border-b border-black/20">
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
                  <p className="text-sm font-medium text-white">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-300 capitalize">
                    {user.role.replace('_', ' ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {filteredItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              if (hasChildren) {
                const visibleChildren = (item.children || []).filter((child) => {
                  if (child.roles && !child.roles.includes(user?.role || '')) return false;
                  if (child.permission) {
                    return hasPermission(child.permission.module, child.permission.action);
                  }
                  return true;
                });
                if (visibleChildren.length === 0) {
                  return null;
                }
                const groupActive = visibleChildren.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
                const isOpen = openGroups[item.name] ?? groupActive;
                const toggleOpen = () => setOpenGroups((prev) => ({ ...prev, [item.name]: !isOpen }));
                return (
                  <div key={item.name} className="space-y-1">
                    <button
                      type="button"
                      onClick={toggleOpen}
                      className={cn(
                        'w-full flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors',
                        (groupActive || isOpen) ? 'bg-gray-800 text-white border-r-2 border-white' : 'text-white hover:bg-gray-800 hover:text-white'
                      )}
                    >
                      <item.icon
                        className={cn(
                          'mr-3 h-5 w-5 flex-shrink-0',
                          (groupActive || isOpen) ? 'text-white' : 'text-gray-300 group-hover:text-white'
                        )}
                      />
                      {item.name}
                      <span className="ml-auto">
                        {isOpen ? (
                          <ChevronDownIcon className="h-4 w-4 text-white" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-white" />
                        )}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="ml-8 space-y-1">
                        {visibleChildren.map((child) => {
                          const childActive = pathname === child.href || pathname.startsWith(child.href + '/');
                          return (
                            <Link
                              key={child.name}
                              href={child.href}
                              className={cn(
                                'group flex items-center px-2 py-1.5 text-sm font-medium rounded-md transition-colors',
                                childActive ? 'bg-gray-800 text-white border-r-2 border-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                              )}
                              onClick={onClose}
                            >
                              <child.icon
                                className={cn(
                                  'mr-3 h-4 w-4 flex-shrink-0',
                                  childActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                                )}
                              />
                              {child.name}
                              {child.badge && (
                                <span className="ml-auto bg-black text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                                  {child.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'group flex items-center px-2 py-2 text-base font-medium rounded-md transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white border-r-2 border-white'
                      : 'text-white hover:bg-gray-800 hover:text-white'
                  )}
                  onClick={onClose}
                >
                  <item.icon
                    className={cn(
                      'mr-3 h-5 w-5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-gray-300 group-hover:text-white'
                    )}
                  />
                  {item.name}
                  {item.badge && (
                    <span className="ml-auto bg-black text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-black/20">
            <button
              onClick={handleLogout}
              className="group flex items-center w-full px-2 py-2 text-sm font-medium text-white rounded-md hover:bg-gray-800 hover:text-white transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5 text-gray-300 group-hover:text-white" />
              Logout
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
