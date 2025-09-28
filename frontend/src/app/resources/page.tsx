'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { useQuery } from '@tanstack/react-query';
import { machinesAPI, toolsAPI, workstationsAPI, techniciansAPI } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { 
  WrenchScrewdriverIcon, 
  CogIcon, 
  BuildingOfficeIcon, 
  UserIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const ResourcesPage: React.FC = () => {
  const { hasPermission } = useAuth();

  // Fetch all resource statistics
  const { data: machinesStats } = useQuery({
    queryKey: ['machine-stats'],
    queryFn: () => machinesAPI.getMachineStats(),
  });

  const { data: toolsStats } = useQuery({
    queryKey: ['tool-stats'],
    queryFn: () => toolsAPI.getToolStats(),
  });

  const { data: workstationsStats } = useQuery({
    queryKey: ['workstation-stats'],
    queryFn: () => workstationsAPI.getWorkStationStats(),
  });

  const { data: techniciansStats } = useQuery({
    queryKey: ['technician-stats'],
    queryFn: () => techniciansAPI.getTechnicianStats(),
  });

  const machines = machinesStats?.data?.data || {};
  const tools = toolsStats?.data?.data || {};
  const workstations = workstationsStats?.data?.data || {};
  const technicians = techniciansStats?.data?.data || {};

  if (!hasPermission('resources', 'read')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view resources.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Resource Management</h1>
          <p className="text-gray-600 mt-2">Comprehensive overview of all workshop resources</p>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <WrenchScrewdriverIcon className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Machines</p>
                <p className="text-3xl font-bold text-gray-900">{machines.total || 0}</p>
                <p className="text-sm text-gray-500">
                  {machines.byStatus?.operational || 0} operational
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CogIcon className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Tools</p>
                <p className="text-3xl font-bold text-gray-900">{tools.total || 0}</p>
                <p className="text-sm text-gray-500">
                  {tools.available || 0} available
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <BuildingOfficeIcon className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Workstations</p>
                <p className="text-3xl font-bold text-gray-900">{workstations.total || 0}</p>
                <p className="text-sm text-gray-500">
                  {workstations.available || 0} available
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <UserIcon className="h-8 w-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Technicians</p>
                <p className="text-3xl font-bold text-gray-900">{technicians.total || 0}</p>
                <p className="text-sm text-gray-500">
                  {technicians.active || 0} active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts and Issues */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
              Alerts & Issues
            </h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center p-4 bg-red-50 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-red-800">Overdue Maintenance</p>
                  <p className="text-2xl font-bold text-red-900">
                    {(machines.overdueMaintenance || 0) + (tools.overdueMaintenance || 0) + (workstations.overdueMaintenance || 0)}
                  </p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-orange-50 rounded-lg">
                <ClockIcon className="h-6 w-6 text-orange-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-orange-800">Overdue Calibration</p>
                  <p className="text-2xl font-bold text-orange-900">{tools.overdueCalibration || 0}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                <XCircleIcon className="h-6 w-6 text-yellow-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-yellow-800">Expired Certifications</p>
                  <p className="text-2xl font-bold text-yellow-900">{technicians.expiredCertifications || 0}</p>
                </div>
              </div>
              <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-800">Resources Available</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {(machines.available || 0) + (tools.available || 0) + (workstations.available || 0)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resource Management Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Machines Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600 mr-2" />
                  Machines
                </h2>
                <Badge color="blue">{machines.total || 0}</Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Operational</span>
                  <span className="text-sm font-medium text-gray-900">{machines.byStatus?.operational || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Maintenance</span>
                  <span className="text-sm font-medium text-gray-900">{machines.byStatus?.maintenance || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Broken</span>
                  <span className="text-sm font-medium text-gray-900">{machines.byStatus?.broken || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium text-green-600">{machines.available || 0}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/resources/machines">
                  <Button variant="outline" className="w-full">
                    Manage Machines
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Tools Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <CogIcon className="h-5 w-5 text-green-600 mr-2" />
                  Tools
                </h2>
                <Badge color="green">{tools.total || 0}</Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium text-green-600">{tools.available || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Use</span>
                  <span className="text-sm font-medium text-gray-900">{tools.inUse || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Maintenance</span>
                  <span className="text-sm font-medium text-gray-900">{tools.maintenance || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Overdue Calibration</span>
                  <span className="text-sm font-medium text-red-600">{tools.overdueCalibration || 0}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/resources/tools">
                  <Button variant="outline" className="w-full">
                    Manage Tools
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Workstations Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <BuildingOfficeIcon className="h-5 w-5 text-purple-600 mr-2" />
                  Workstations
                </h2>
                <Badge color="purple">{workstations.total || 0}</Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium text-green-600">{workstations.available || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Occupied</span>
                  <span className="text-sm font-medium text-gray-900">{workstations.occupied || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">In Maintenance</span>
                  <span className="text-sm font-medium text-gray-900">{workstations.maintenance || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Out of Order</span>
                  <span className="text-sm font-medium text-red-600">{workstations.outOfOrder || 0}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/resources/workstations">
                  <Button variant="outline" className="w-full">
                    Manage Workstations
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Technicians Card */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <UserIcon className="h-5 w-5 text-orange-600 mr-2" />
                  Technicians
                </h2>
                <Badge color="orange">{technicians.total || 0}</Badge>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Active</span>
                  <span className="text-sm font-medium text-green-600">{technicians.active || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">On Leave</span>
                  <span className="text-sm font-medium text-gray-900">{technicians.onLeave || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Available</span>
                  <span className="text-sm font-medium text-green-600">{technicians.available || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Expired Certifications</span>
                  <span className="text-sm font-medium text-red-600">{technicians.expiredCertifications || 0}</span>
                </div>
              </div>
              <div className="mt-6">
                <Link href="/resources/technicians">
                  <Button variant="outline" className="w-full">
                    Manage Technicians
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/resources/machines">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <WrenchScrewdriverIcon className="h-6 w-6 mb-2" />
                  <span>Manage Machines</span>
                </Button>
              </Link>
              <Link href="/resources/tools">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <CogIcon className="h-6 w-6 mb-2" />
                  <span>Manage Tools</span>
                </Button>
              </Link>
              <Link href="/resources/workstations">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <BuildingOfficeIcon className="h-6 w-6 mb-2" />
                  <span>Manage Workstations</span>
                </Button>
              </Link>
              <Link href="/resources/technicians">
                <Button variant="outline" className="w-full h-20 flex flex-col items-center justify-center">
                  <UserIcon className="h-6 w-6 mb-2" />
                  <span>Manage Technicians</span>
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ResourcesPage;
