'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { reportsAPI, warehouseAPI } from '@/lib/api';
import SalesChart from '@/components/charts/SalesChart';
import BarChart from '@/components/charts/BarChart';
import { DashboardStats as DashboardStatsType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { getDashboardTitle } from '@/lib/roleRouting';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon,
  TruckIcon,
  ArchiveBoxIcon,
  UserGroupIcon,
  ClipboardDocumentListIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStatsType>({
    sales: { monthlyTotal: 0, monthlyInvoices: 0 },
    customers: { total: 0, newThisMonth: 0 },
    products: { total: 0, lowStock: 0 },
    support: { openTickets: 0, overdueTickets: 0 },
    employees: { total: 0, presentToday: 0 },
  });

  // Redirect warehouse roles to their portal
  useEffect(() => {
    if (user && ['warehouse_manager', 'warehouse_employee'].includes(user.role)) {
      router.replace('/warehouse-portal');
    }
  }, [user, router]);

  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => reportsAPI.getDashboardStats(),
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Fetch warehouse-specific data for warehouse roles
  const { data: warehouseData } = useQuery({
    queryKey: ['warehouse-dashboard', user?.warehouse?.assignedWarehouse],
    queryFn: () => warehouseAPI.getWarehouseDashboard(user?.warehouse?.assignedWarehouse!),
    enabled: !!user?.warehouse?.assignedWarehouse && ['warehouse_manager', 'warehouse_employee'].includes(user?.role),
  });

  // Handle error separately
  useEffect(() => {
    if (error) {
      toast.error('Failed to load dashboard data');
      console.error('Dashboard error:', error);
    }
  }, [error]);

  useEffect(() => {
    if (dashboardData?.data?.data) {
      setStats(dashboardData.data.data);
    }
  }, [dashboardData]);

  // Get role-specific dashboard title
  const dashboardTitle = user ? getDashboardTitle(user.role) : 'Dashboard';

  // Role-based quick actions
  const getQuickActions = () => {
    if (!user) return [];

    const baseActions = [
      {
        icon: '📊',
        title: 'View Reports',
        description: 'Business analytics',
        href: '/reports',
        color: 'yellow'
      }
    ];

    switch (user.role) {
      case 'admin':
      case 'manager':
        return [
          {
            icon: '📄',
            title: 'Create Invoice',
            description: 'Generate new invoice',
            href: '/invoices',
            color: 'blue'
          },
          {
            icon: '🛒',
            title: 'New Sale',
            description: 'Process POS transaction',
            href: '/pos',
            color: 'green'
          },
          {
            icon: '👥',
            title: 'Add Customer',
            description: 'Register new customer',
            href: '/customers',
            color: 'purple'
          },
          ...baseActions
        ];

      case 'employee':
        return [
          {
            icon: '📄',
            title: 'Create Invoice',
            description: 'Generate new invoice',
            href: '/invoices',
            color: 'blue'
          },
          {
            icon: '🛒',
            title: 'New Sale',
            description: 'Process POS transaction',
            href: '/pos',
            color: 'green'
          },
          {
            icon: '👥',
            title: 'Add Customer',
            description: 'Register new customer',
            href: '/customers',
            color: 'purple'
          },
          ...baseActions
        ];

      case 'warehouse_manager':
      case 'warehouse_employee':
        return [
          {
            icon: '📦',
            title: 'Manage Inventory',
            description: 'Update stock levels',
            href: '/warehouse-portal/inventory',
            color: 'blue'
          },
          {
            icon: '🚚',
            title: 'Track Deliveries',
            description: 'Monitor shipments',
            href: '/warehouse-portal/deliveries',
            color: 'green'
          },
          {
            icon: '👥',
            title: 'Manage Team',
            description: 'Warehouse employees',
            href: '/warehouse-portal/employees',
            color: 'purple'
          },
          {
            icon: '📋',
            title: 'View Orders',
            description: 'Process orders',
            href: '/warehouse-portal/orders',
            color: 'yellow'
          }
        ];

      case 'warehouse_employee':
        return [
          {
            icon: '📦',
            title: 'Update Inventory',
            description: 'Stock management',
            href: '/warehouse-portal/inventory',
            color: 'blue'
          },
          {
            icon: '📋',
            title: 'View Orders',
            description: 'Process orders',
            href: '/warehouse-portal/orders',
            color: 'green'
          },
          {
            icon: '⚠️',
            title: 'Stock Alerts',
            description: 'Low stock items',
            href: '/stock-alerts',
            color: 'red'
          }
        ];

      case 'customer':
        return [
          {
            icon: '🛒',
            title: 'My Orders',
            description: 'View order history',
            href: '/customer/orders',
            color: 'blue'
          },
          {
            icon: '📄',
            title: 'My Invoices',
            description: 'View invoices',
            href: '/customer/invoices',
            color: 'green'
          },
          {
            icon: '💬',
            title: 'Support',
            description: 'Get help',
            href: '/customer/support',
            color: 'purple'
          },
          {
            icon: '📋',
            title: 'My Inquiries',
            description: 'Track inquiries',
            href: '/customer/inquiries',
            color: 'yellow'
          }
        ];

      default:
        return baseActions;
    }
  };

  if (error) {
    return (
      <Layout title={dashboardTitle}>
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading dashboard</h3>
          <p className="mt-1 text-sm text-gray-500">
            There was an error loading the dashboard data. Please try again.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={dashboardTitle}>
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Welcome back, {user?.firstName}!
              </h2>
              <p className="text-gray-600">
                {user?.role === 'customer' 
                  ? "Here's your account overview and recent activity."
                  : user?.role?.includes('warehouse')
                  ? "Here's your warehouse dashboard and operations overview."
                  : "Here's what's happening with your business today."
                }
              </p>
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Role-specific content */}
        {user?.role?.includes('warehouse') ? (
          // Warehouse Dashboard Content
          <div className="space-y-6">
            {/* Warehouse Stats */}
            {warehouseData?.data?.data && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold">📦</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Total Products</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {warehouseData?.data?.data?.statistics?.totalProducts || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-yellow-100 rounded-full flex items-center justify-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Low Stock</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {warehouseData?.data?.data?.statistics?.lowStockProducts || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-bold">👥</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Employees</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {warehouseData?.data?.data?.statistics?.activeEmployees || 0}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="h-8 w-8 bg-purple-100 rounded-full flex items-center justify-center">
                      <span className="text-purple-600 font-bold">%</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-500">Capacity Used</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {warehouseData?.data?.data?.warehouse?.capacityUtilization || 0}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Stock Movements */}
            {warehouseData?.data?.data?.recentMovements && (
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">Recent Stock Movements</h3>
                </div>
                <div className="p-6">
                  {warehouseData?.data?.data?.recentMovements && warehouseData.data.data.recentMovements.length > 0 ? (
                    <div className="space-y-4">
                      {warehouseData.data.data.recentMovements.slice(0, 5).map((movement: any) => (
                        <div key={movement._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                          <div className="flex items-center">
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center mr-3 ${
                              movement.movementType === 'in' ? 'bg-green-100' : 'bg-red-100'
                            }`}>
                              <span className={`text-sm font-bold ${
                                movement.movementType === 'in' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {movement.movementType === 'in' ? '↗' : '↘'}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{movement.product.name}</div>
                              <div className="text-sm text-gray-500">
                                {movement.movementType} • {movement.quantity} units
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">
                              {movement.createdBy.firstName} {movement.createdBy.lastName}
                            </div>
                            <div className="text-xs text-gray-400">
                              {new Date(movement.createdAt).toLocaleDateString()}
                            </div>
              </div>
              </div>
                      ))}
              </div>
                  ) : (
                    <div className="text-center py-8">
                      <ArchiveBoxIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No recent movements</p>
              </div>
                  )}
          </div>
        </div>
            )}
          </div>
        ) : (
          // Regular Dashboard Content
          <>
            {/* Stats Cards */}
            <DashboardStats stats={stats} />

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sales Trend</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <SalesChart
              type="area"
              height={260}
              data={(dashboardData?.data?.salesTrend || []).map((d: any) => ({
                date: d._id,
                sales: d.totalInvoices || d.totalSales,
                revenue: d.totalSales,
                orders: d.totalInvoices,
              }))}
            />
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Top Products</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <BarChart
              height={260}
              data={(dashboardData?.data?.topProducts || []).map((p: any) => ({
                name: p.name || 'Unknown',
                value: p.totalQuantity,
              }))}
            />
              </div>
            </div>
          </>
        )}

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {getQuickActions().map((action, index) => (
              <button
                key={index}
                onClick={() => router.push(action.href)}
                className={`p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-${action.color}-500 hover:bg-${action.color}-50 transition-colors`}
              >
                <div className="text-center">
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <div className="text-sm font-medium text-gray-900">{action.title}</div>
                  <div className="text-xs text-gray-500">{action.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
