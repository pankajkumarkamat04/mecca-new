'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from 'react-query';
import Layout from '@/components/layout/Layout';
import DashboardStats from '@/components/dashboard/DashboardStats';
import { reportsAPI } from '@/lib/api';
import { DashboardStats as DashboardStatsType } from '@/types';
import toast from 'react-hot-toast';
import {
  ChartBarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStatsType>({
    sales: { monthlyTotal: 0, monthlyInvoices: 0 },
    customers: { total: 0, newThisMonth: 0 },
    products: { total: 0, lowStock: 0 },
    projects: { active: 0, completedThisMonth: 0 },
    support: { openTickets: 0, overdueTickets: 0 },
    employees: { total: 0, presentToday: 0 },
  });

  const { data: dashboardData, isLoading, error } = useQuery(
    'dashboard-stats',
    () => reportsAPI.getDashboardStats(),
    {
      refetchInterval: 30000, // Refetch every 30 seconds
      onError: (error: any) => {
        toast.error('Failed to load dashboard data');
        console.error('Dashboard error:', error);
      },
    }
  );

  useEffect(() => {
    if (dashboardData?.data?.data) {
      setStats(dashboardData.data.data);
    }
  }, [dashboardData]);

  if (error) {
    return (
      <Layout title="Dashboard">
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
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome back!</h2>
              <p className="text-gray-600">Here's what's happening with your business today.</p>
            </div>
            <div className="text-sm text-gray-500 flex items-center">
              <ClockIcon className="h-4 w-4 mr-1" />
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <DashboardStats stats={stats} />

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📄</div>
                <div className="text-sm font-medium text-gray-900">Create Invoice</div>
                <div className="text-xs text-gray-500">Generate new invoice</div>
              </div>
            </button>
            
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">🛒</div>
                <div className="text-sm font-medium text-gray-900">New Sale</div>
                <div className="text-xs text-gray-500">Process POS transaction</div>
              </div>
            </button>
            
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">👥</div>
                <div className="text-sm font-medium text-gray-900">Add Customer</div>
                <div className="text-xs text-gray-500">Register new customer</div>
              </div>
            </button>
            
            <button className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-yellow-500 hover:bg-yellow-50 transition-colors">
              <div className="text-center">
                <div className="text-2xl mb-2">📊</div>
                <div className="text-sm font-medium text-gray-900">View Reports</div>
                <div className="text-xs text-gray-500">Business analytics</div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">New invoice #INV-001 created</p>
                  <p className="text-xs text-gray-500">2 minutes ago</p>
                </div>
                <div className="text-sm font-medium text-gray-900">$1,250.00</div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Customer John Doe registered</p>
                  <p className="text-xs text-gray-500">15 minutes ago</p>
                </div>
                <div className="text-sm font-medium text-gray-900">New</div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Low stock alert for Product A</p>
                  <p className="text-xs text-gray-500">1 hour ago</p>
                </div>
                <div className="text-sm font-medium text-gray-900">5 items</div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">Payment received for Invoice #INV-002</p>
                  <p className="text-xs text-gray-500">3 hours ago</p>
                </div>
                <div className="text-sm font-medium text-gray-900">$850.00</div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200">
              <a
                href="/activity"
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                View all activity →
              </a>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Sales Trend</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart will be implemented with Recharts</p>
            </div>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Top Products</h3>
              <ChartBarIcon className="h-5 w-5 text-gray-400" />
            </div>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <p className="text-gray-500">Chart will be implemented with Recharts</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default DashboardPage;
