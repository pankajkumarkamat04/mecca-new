'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import AccessControl from '@/components/auth/AccessControl';
import { useQuery } from '@tanstack/react-query';
import { warehouseAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import {
  BuildingOfficeIcon,
  ChartBarIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
  TruckIcon,
  CogIcon,
  ArrowLeftIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';

interface Warehouse {
  _id: string;
  name: string;
  code: string;
  manager?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  employees?: Array<{
    _id: string;
    user: {
      _id: string;
      firstName: string;
      lastName: string;
    };
    position: string;
  }>;
  capacityUtilization?: number;
  isActive: boolean;
}

const WarehousePortalLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Fetch user's assigned warehouse
  const { data: userData } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    },
  });

  // Fetch warehouses for admin/manager
  const { data: warehousesData } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehouseAPI.getWarehouses({ limit: 100 }),
    enabled: userData?.role === 'admin' || userData?.role === 'manager',
  });

  useEffect(() => {
    if (userData?.warehouse?.assignedWarehouse) {
      setSelectedWarehouseId(userData.warehouse.assignedWarehouse);
    } else if (warehousesData?.data && warehousesData.data.length > 0) {
      // For admin/manager, select first warehouse by default
      setSelectedWarehouseId(warehousesData.data[0]._id);
    }
  }, [userData, warehousesData]);

  useEffect(() => {
    if (selectedWarehouseId && warehousesData?.data) {
      const warehouse = warehousesData.data.find((w: Warehouse) => w._id === selectedWarehouseId);
      setSelectedWarehouse(warehouse || null);
    }
  }, [selectedWarehouseId, warehousesData]);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/warehouse-portal/dashboard',
      icon: ChartBarIcon,
      current: pathname === '/warehouse-portal/dashboard',
    },
    {
      name: 'Orders',
      href: '/warehouse-portal/orders',
      icon: ClipboardDocumentListIcon,
      current: pathname === '/warehouse-portal/orders',
    },
    {
      name: 'Inventory',
      href: '/warehouse-portal/inventory',
      icon: BuildingOfficeIcon,
      current: pathname === '/warehouse-portal/inventory',
    },
    {
      name: 'Employees',
      href: '/warehouse-portal/employees',
      icon: UserGroupIcon,
      current: pathname === '/warehouse-portal/employees',
    },
    {
      name: 'Deliveries',
      href: '/warehouse-portal/deliveries',
      icon: TruckIcon,
      current: pathname === '/warehouse-portal/deliveries',
    },
    {
      name: 'Settings',
      href: '/warehouse-portal/settings',
      icon: CogIcon,
      current: pathname === '/warehouse-portal/settings',
    },
  ];

  const handleWarehouseChange = (warehouseId: string) => {
    setSelectedWarehouseId(warehouseId);
    // Update URL to include warehouse ID
    const currentPath = pathname.replace(/\/\w+$/, '');
    router.push(`${currentPath}?warehouse=${warehouseId}`);
  };

  const handleLogout = async () => {
    setShowUserMenu(false);
    await logout();
  };

  return (
    <div className="h-screen w-screen fixed inset-0 bg-gray-100">
      <AccessControl>
        <div className="h-full w-full flex overflow-hidden">
        {/* Warehouse Portal Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200">
          <div className="h-16 flex items-center justify-between px-6">
            <div className="flex items-center">
              <button
                onClick={() => router.push('/dashboard')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Warehouse Portal</h1>
                {selectedWarehouse && (
                  <p className="text-sm text-gray-600">
                    {selectedWarehouse.name} ({selectedWarehouse.code})
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Warehouse Selector for Admin/Manager */}
              {(userData?.role === 'admin' || userData?.role === 'manager') && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">Warehouse:</label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {warehousesData?.data?.data?.map((warehouse: Warehouse) => (
                      <option key={warehouse._id} value={warehouse._id}>
                        {warehouse.name} ({warehouse.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900"
                >
                  <UserCircleIcon className="h-8 w-8 text-gray-400" />
                  <span>{user?.firstName} {user?.lastName}</span>
                </button>
                
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => router.push('/profile')}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Profile
                    </button>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex pt-16 w-full">
          {/* Sidebar Navigation */}
          <div className="w-64 bg-white shadow-sm min-h-screen">
            <nav className="mt-8 px-4">
              <ul className="space-y-2">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <a
                      href={item.href + (selectedWarehouseId ? `?warehouse=${selectedWarehouseId}` : '')}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                        item.current
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      <item.icon
                        className={`mr-3 h-5 w-5 ${
                          item.current ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`}
                      />
                      {item.name}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="p-6">
              {selectedWarehouseId ? (
                children
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <BuildingOfficeIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Warehouse Selected</h3>
                    <p className="text-gray-500">Please select a warehouse to continue.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </AccessControl>
    </div>
  );
};

export default WarehousePortalLayout;
