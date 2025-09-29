'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import ChartContainer from '@/components/charts/ChartContainer';
import SalesChart from '@/components/charts/SalesChart';
import PieChart from '@/components/charts/PieChart';
import BarChart from '@/components/charts/BarChart';
import DataTable from '@/components/ui/DataTable';
import { formatCurrency, formatNumber, formatDate } from '@/lib/utils';
import { analyticsAPI } from '@/lib/api';
import {
  WrenchScrewdriverIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  XCircleIcon,
  PlayIcon,
} from '@heroicons/react/24/outline';

const WorkshopPerformance: React.FC = () => {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedTechnician, setSelectedTechnician] = useState('all');
  const [jobType, setJobType] = useState('all');

  // Fetch workshop data from API
  const { data: jobCompletionData, isLoading: jobCompletionLoading } = useQuery({
    queryKey: ['job-completion-data', dateRange, selectedTechnician, jobType],
    queryFn: () => analyticsAPI.getJobCompletion({
      dateRange,
      technician: selectedTechnician,
      jobType
    }),
  });

  const { data: technicianPerformanceData, isLoading: technicianPerformanceLoading } = useQuery({
    queryKey: ['technician-performance-data', dateRange],
    queryFn: () => analyticsAPI.getTechnicianPerformance({ dateRange }),
  });

  const { data: jobTypePerformanceData, isLoading: jobTypePerformanceLoading } = useQuery({
    queryKey: ['job-type-performance-data', dateRange],
    queryFn: () => analyticsAPI.getWorkshopPerformance({
      dateRange,
      groupBy: 'jobType'
    }),
  });

  const { data: monthlyTrendData, isLoading: monthlyTrendLoading } = useQuery({
    queryKey: ['workshop-monthly-trend-data', dateRange],
    queryFn: () => analyticsAPI.getWorkshopPerformance({
      dateRange,
      groupBy: 'month'
    }),
  });

  const { data: resourceUtilizationData, isLoading: resourceUtilizationLoading } = useQuery({
    queryKey: ['resource-utilization-data', dateRange],
    queryFn: () => analyticsAPI.getResourceUtilization({ dateRange }),
  });

  const { data: customerSatisfactionData, isLoading: customerSatisfactionLoading } = useQuery({
    queryKey: ['customer-satisfaction-data', dateRange],
    queryFn: () => analyticsAPI.getCustomerSatisfaction({ dateRange }),
  });

  // Fetch workshop performance data
  const { data: workshopData, isLoading } = useQuery({
    queryKey: ['workshop-performance', dateRange, selectedTechnician, jobType],
    queryFn: () => analyticsAPI.getWorkshopPerformance({
      dateRange,
      technician: selectedTechnician,
      jobType
    }),
    refetchInterval: 30000
  });

  const dateRangeOptions = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: '90d', label: 'Last 90 days' },
    { value: '1y', label: 'Last year' },
  ];

  const technicianOptions = [
    { value: 'all', label: 'All Technicians' },
    { value: 'mike', label: 'Mike Johnson' },
    { value: 'jane', label: 'Jane Doe' },
    { value: 'tom', label: 'Tom Wilson' },
    { value: 'sarah', label: 'Sarah Smith' },
  ];

  const jobTypeOptions = [
    { value: 'all', label: 'All Job Types' },
    { value: 'repair', label: 'Repair' },
    { value: 'installation', label: 'Installation' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'diagnostic', label: 'Diagnostic' },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-500" />;
      case 'In Progress':
        return <PlayIcon className="h-4 w-4 text-blue-500" />;
      case 'Delayed':
        return <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />;
      default:
        return <XCircleIcon className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'text-green-600 bg-green-100';
      case 'In Progress':
        return 'text-blue-600 bg-blue-100';
      case 'Delayed':
        return 'text-yellow-600 bg-yellow-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getEfficiencyColor = (efficiency: number) => {
    if (efficiency >= 110) return 'text-green-600';
    if (efficiency >= 100) return 'text-blue-600';
    if (efficiency >= 90) return 'text-yellow-600';
    return 'text-red-600';
  };

  const jobColumns = [
    {
      key: 'jobId',
      label: 'Job ID',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.jobId}</div>
          <div className="text-sm text-gray-500">{row.customer}</div>
        </div>
      )
    },
    {
      key: 'technician',
      label: 'Technician',
      render: (row: any) => row.technician
    },
    {
      key: 'type',
      label: 'Type',
      render: (row: any) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
          {row.type}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => (
        <div className="flex items-center">
          {getStatusIcon(row.status)}
          <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(row.status)}`}>
            {row.status}
          </span>
        </div>
      )
    },
    {
      key: 'duration',
      label: 'Duration',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.duration} days</div>
          <div className="text-sm text-gray-500">{row.actualHours || 0}h / {row.estimatedHours}h</div>
        </div>
      )
    },
    {
      key: 'efficiency',
      label: 'Efficiency',
      render: (row: any) => (
        <div className={`font-medium ${getEfficiencyColor(row.efficiency)}`}>
          {row.efficiency > 0 ? `${row.efficiency}%` : 'N/A'}
        </div>
      )
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row: any) => formatCurrency(row.revenue)
    }
  ];

  const technicianColumns = [
    {
      key: 'technician',
      label: 'Technician',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.technician}</div>
          <div className="text-sm text-gray-500">⭐ {row.customerRating}/5</div>
        </div>
      )
    },
    {
      key: 'completedJobs',
      label: 'Completed Jobs',
      render: (row: any) => formatNumber(row.completedJobs)
    },
    {
      key: 'totalHours',
      label: 'Total Hours',
      render: (row: any) => `${row.totalHours}h`
    },
    {
      key: 'efficiency',
      label: 'Efficiency',
      render: (row: any) => (
        <div className={`font-medium ${getEfficiencyColor(row.efficiency)}`}>
          {row.efficiency}%
        </div>
      )
    },
    {
      key: 'avgJobTime',
      label: 'Avg Job Time',
      render: (row: any) => `${row.avgJobTime}h`
    },
    {
      key: 'revenue',
      label: 'Revenue',
      render: (row: any) => formatCurrency(row.revenue)
    }
  ];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Date Range"
            options={dateRangeOptions}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          />
          <Select
            label="Technician"
            options={technicianOptions}
            value={selectedTechnician}
            onChange={(e) => setSelectedTechnician(e.target.value)}
          />
          <Select
            label="Job Type"
            options={jobTypeOptions}
            value={jobType}
            onChange={(e) => setJobType(e.target.value)}
          />
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <WrenchScrewdriverIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : `${workshopData?.data?.completionRate || 0}%`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {workshopData?.data?.completedJobs || 0} of {workshopData?.data?.totalJobs || 0} jobs
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Efficiency</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : `${workshopData?.data?.avgEfficiency || 0}%`}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Above 100% = ahead of schedule
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CurrencyDollarIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : formatCurrency(workshopData?.data?.totalRevenue || 0)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Avg: {formatCurrency((workshopData?.data?.totalRevenue || 0) / (workshopData?.data?.completedJobs || 1))} per job
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <UserGroupIcon className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Customer Rating</p>
              <p className="text-2xl font-semibold text-gray-900">
                {isLoading ? '...' : workshopData?.data?.customerSatisfaction || 0}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                ⭐ out of 5.0
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Job Completion Trend"
          description="Monthly job completion and efficiency"
          trend={{ value: 15.2, isPositive: true, label: 'vs last month' }}
        >
          <SalesChart 
            data={monthlyTrendData?.data || []} 
            type="area"
            height={300}
          />
        </ChartContainer>

        <ChartContainer
          title="Job Type Distribution"
          description="Jobs completed by type"
          trend={{ value: 8.3, isPositive: true, label: 'vs last month' }}
        >
          <PieChart 
            data={jobTypePerformanceData?.data || []}
            height={300}
            showLegend={true}
          />
        </ChartContainer>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer
          title="Resource Utilization"
          description="How efficiently resources are being used"
          trend={{ value: 82, isPositive: true, label: 'utilization %' }}
        >
          <BarChart 
            data={(resourceUtilizationData?.data || []).map((r: any) => ({
              name: r.resource,
              value: r.utilization,
              color: r.color
            }))}
            height={300}
            formatValue={(value) => `${value}%`}
          />
        </ChartContainer>

        <ChartContainer
          title="Customer Satisfaction"
          description="Distribution of customer ratings"
          trend={{ value: 4.6, isPositive: true, label: 'avg rating' }}
        >
          <BarChart 
            data={(customerSatisfactionData?.data || []).map((c: any) => ({
              name: `${c.rating} Star${c.rating > 1 ? 's' : ''}`,
              value: c.percentage,
              color: c.color
            }))}
            height={300}
            formatValue={(value) => `${value}%`}
          />
        </ChartContainer>
      </div>

      {/* Job Status Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Jobs</h3>
          <p className="text-sm text-gray-600">Current job status and performance</p>
        </div>
        <DataTable
          data={jobCompletionData?.data || []}
          columns={jobColumns}
          loading={jobCompletionLoading}
        />
      </div>

      {/* Technician Performance Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Technician Performance</h3>
          <p className="text-sm text-gray-600">Individual technician statistics and ratings</p>
        </div>
        <DataTable
          data={technicianPerformanceData?.data || []}
          columns={technicianColumns}
          loading={technicianPerformanceLoading}
        />
      </div>

      {/* Insights */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Workshop Performance Insights</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <WrenchScrewdriverIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Top Performer</span>
            </div>
            <p className="text-sm text-blue-700 mt-1">
              {workshopData?.data?.topPerformer || 'N/A'} leads with highest efficiency and customer ratings.
            </p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-sm font-medium text-green-900">Job Completion</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              {workshopData?.data?.completionRate || 0}% completion rate with {workshopData?.data?.avgEfficiency || 0}% efficiency.
            </p>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-yellow-900">Resource Utilization</span>
            </div>
            <p className="text-sm text-yellow-700 mt-1">
              {workshopData?.data?.resourceUtilization || 0}% resource utilization. Consider expanding capacity.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopPerformance;
