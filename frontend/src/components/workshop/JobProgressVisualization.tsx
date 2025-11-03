'use client';

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enhancedWorkshopAPI } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import { 
  ChartBarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  PlayIcon,
  PauseIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import { Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend
} from 'chart.js';

ChartJS.register(ArcElement, ChartTooltip, Legend);

interface JobProgressVisualizationProps {
  jobId: string;
  onClose?: () => void;
}

const JobProgressVisualization: React.FC<JobProgressVisualizationProps> = ({ jobId, onClose }) => {
  const [selectedView, setSelectedView] = useState('overview');
  const [timeRange, setTimeRange] = useState('7d');

  // Fetch job data
  const { data: jobData, isLoading: jobLoading } = useQuery({
    queryKey: ['workshop-job', jobId],
    queryFn: () => enhancedWorkshopAPI.getJobById(jobId),
  });

  // Fetch job analytics
  const { data: analyticsData, isLoading: analyticsLoading } = useQuery({
    queryKey: ['workshop-job-analytics', jobId],
    queryFn: () => enhancedWorkshopAPI.getJobAnalytics(jobId),
  });

  const job = jobData?.data?.data;
  const analytics = analyticsData?.data?.data;

  if (jobLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Job not found</p>
      </div>
    );
  }

  const views = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'timeline', name: 'Timeline', icon: ClockIcon },
    { id: 'tasks', name: 'Tasks', icon: CheckCircleIcon },
    { id: 'resources', name: 'Resources', icon: UserGroupIcon },
    { id: 'costs', name: 'Costs', icon: CurrencyDollarIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
          <p className="text-sm text-gray-600">
            Job Card: {job.jobCard?.cardNumber || 'N/A'} | 
            Status: {job.status.replace('_', ' ')}
          </p>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Progress Overview */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Progress Overview</h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Overall Progress:</span>
            <span className="text-2xl font-bold text-blue-600">{job.progress || 0}%</span>
          </div>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div 
            className="bg-blue-600 h-4 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${job.progress || 0}%` }}
          ></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {analytics?.tasks?.completed || 0}
            </div>
            <div className="text-sm text-gray-600">Tasks Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {analytics?.tasks?.inProgress || 0}
            </div>
            <div className="text-sm text-gray-600">In Progress</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {analytics?.tasks?.pending || 0}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
        </div>

        {/* Donut chart to visualize completion strictly by tasks */}
        <div className="mt-6 max-w-xs">
          <Pie
            data={{
              labels: ['Completed', 'Remaining'],
              datasets: [
                {
                  data: [job.progress || 0, 100 - (job.progress || 0)],
                  backgroundColor: ['#16a34a', '#e5e7eb'],
                  borderWidth: 0,
                },
              ],
            }}
            options={{
              plugins: { legend: { display: true, position: 'bottom' } },
              maintainAspectRatio: false,
            }}
            height={180}
          />
        </div>
      </div>

      {/* Workflow Steps */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Workflow</h3>
        <WorkflowSteps job={job} />
      </div>

      {/* View Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                onClick={() => setSelectedView(view.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedView === view.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {view.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* View Content */}
      <div className="space-y-6">
        {selectedView === 'overview' && (
          <OverviewView job={job} analytics={analytics} />
        )}
        
        {selectedView === 'timeline' && (
          <TimelineView job={job} analytics={analytics} />
        )}
        
        {selectedView === 'tasks' && (
          <TasksView job={job} analytics={analytics} />
        )}
        
        {selectedView === 'resources' && (
          <ResourcesView job={job} analytics={analytics} />
        )}
        
        {selectedView === 'costs' && (
          <CostsView job={job} analytics={analytics} />
        )}
      </div>
    </div>
  );
};

// Overview View Component
const OverviewView: React.FC<{ job: any; analytics: any }> = ({ job, analytics }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Job Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Job Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Priority:</span>
            <Badge color={
              job.priority === 'urgent' ? 'red' :
              job.priority === 'high' ? 'orange' :
              job.priority === 'medium' ? 'blue' : 'gray'
            }>
              {job.priority}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge color={
              job.status === 'completed' ? 'green' :
              job.status === 'in_progress' ? 'orange' :
              job.status === 'scheduled' ? 'blue' : 'gray'
            }>
              {job.status.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Created:</span>
            <span className="text-sm text-gray-900">{formatDate(job.createdAt)}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Hours:</span>
              <span className={`text-sm font-medium ${job.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {job.totalEstimatedDuration?.toFixed(1) || 0}h
              </span>
            </div>
            {job.totalActualDuration > 0 && (
              <div className="flex justify-between mt-1">
                <span className="text-sm text-gray-600">Actual Hours:</span>
                <span className={`text-sm font-medium ${job.isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                  {job.totalActualDuration?.toFixed(1) || 0}h
                  {job.isOverdue && (
                    <ExclamationTriangleIcon className="inline w-4 h-4 ml-1 text-red-600" />
                  )}
                </span>
              </div>
            )}
          </div>
          {job.isOverdue && job.totalActualDuration > job.totalEstimatedDuration && (
            <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
              ⚠️ This job is overdue because actual hours ({job.totalActualDuration?.toFixed(1) || 0}h) exceed estimated hours ({job.totalEstimatedDuration?.toFixed(1) || 0}h)
            </div>
          )}
        </div>
      </div>

      {/* Efficiency Metrics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Efficiency Metrics</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Estimated Duration:</span>
            <span className="text-sm text-gray-900">
              {analytics?.efficiency?.estimatedDuration || 0} min
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Actual Duration:</span>
            <span className="text-sm text-gray-900">
              {analytics?.efficiency?.actualDuration || 0} min
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Efficiency:</span>
            <div className="flex items-center">
              {analytics?.efficiency?.efficiency > 100 ? (
                <ArrowUpIcon className="h-4 w-4 text-red-500 mr-1" />
              ) : (
                <ArrowDownIcon className="h-4 w-4 text-green-500 mr-1" />
              )}
              <span className={`text-sm font-medium ${
                analytics?.efficiency?.efficiency > 100 ? 'text-red-600' : 'text-green-600'
              }`}>
                {analytics?.efficiency?.efficiency || 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Parts Status */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Parts Status</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Total Parts:</span>
            <span className="text-sm text-gray-900">{analytics?.parts?.total || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Available:</span>
            <span className="text-sm text-green-600">{analytics?.parts?.available || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Shortage:</span>
            <span className="text-sm text-red-600">{analytics?.parts?.shortage || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Used:</span>
            <span className="text-sm text-blue-600">{analytics?.parts?.used || 0}</span>
          </div>
        </div>
      </div>

      {/* Assigned Parts (Overview) */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Assigned Parts</h3>
          <Badge color={Array.isArray(job?.parts) && job.parts.length > 0 ? 'blue' : 'gray'}>
            {Array.isArray(job?.parts) ? job.parts.length : 0}
          </Badge>
        </div>
        {Array.isArray(job?.parts) && job.parts.length > 0 ? (
          <div className="space-y-2 max-h-56 overflow-y-auto">
            {job.parts.map((part: any, index: number) => {
              const name = part?.productName || part?.product?.name || 'Unnamed Part';
              const sku = part?.productSku || part?.product?.sku || 'N/A';
              const qty = part?.quantityRequired || 0;
              const used = part?.quantityUsed || 0;
              const returned = part?.quantityReturned || 0;
              const stock = part?.product?.inventory?.currentStock;
              return (
                <div key={index} className="flex items-center justify-between p-2 border border-gray-200 rounded-lg">
                  <div className="min-w-0 pr-2">
                    <p className="text-sm font-medium text-gray-900 truncate">{String(name)}</p>
                    <p className="text-xs text-gray-600 truncate">Qty: {qty}{used > 0 ? ` • Used: ${used}` : ''}{returned > 0 ? ` • Returned: ${returned}` : ''}{stock !== undefined ? ` • Stock: ${stock}` : ''}</p>
                  </div>
                  <Badge color={used > 0 ? 'green' : 'gray'}>{used > 0 ? 'Used' : 'Pending'}</Badge>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No parts assigned</p>
        )}
      </div>

      {/* Customer Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Customer:</span>
            <span className="text-sm text-gray-900">
              {job.customer?.firstName} {job.customer?.lastName}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Phone:</span>
            <span className="text-sm text-gray-900">{job.customerPhone}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Email:</span>
            <span className="text-sm text-gray-900">{job.customer?.email || 'Not provided'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Timeline View Component
const TimelineView: React.FC<{ job: any; analytics: any }> = ({ job, analytics }) => {
  const timelineEvents = [
    {
      date: job.createdAt,
      title: 'Job Created',
      description: 'Job was created and assigned',
      status: 'completed',
      icon: CheckCircleIcon
    },
    {
      date: job.scheduled?.start,
      title: 'Scheduled Start',
      description: 'Job was scheduled to start',
      status: job.scheduled?.start ? 'completed' : 'pending',
      icon: ClockIcon
    },
    {
      date: job.scheduled?.end,
      title: 'Scheduled End',
      description: 'Job was scheduled to end',
      status: job.scheduled?.end ? 'completed' : 'pending',
      icon: ClockIcon
    },
    {
      date: job.customerPortal?.actualCompletion,
      title: 'Completed',
      description: 'Job was completed',
      status: job.status === 'completed' ? 'completed' : 'pending',
      icon: CheckCircleIcon
    }
  ].filter(event => event.date);

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-6">Job Timeline</h3>
      <div className="space-y-4">
        {timelineEvents.map((event, index) => {
          const Icon = event.icon;
          return (
            <div key={index} className="flex items-start">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                event.status === 'completed' ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Icon className={`h-4 w-4 ${
                  event.status === 'completed' ? 'text-green-600' : 'text-gray-400'
                }`} />
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                  <span className="text-xs text-gray-500">{formatDate(event.date)}</span>
                </div>
                <p className="text-sm text-gray-600">{event.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Tasks View Component
const TasksView: React.FC<{ job: any; analytics: any }> = ({ job, analytics }) => {
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green';
      case 'in_progress': return 'orange';
      case 'review': return 'blue';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {job.tasks?.map((task: any, index: number) => (
          <div key={index} className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                {task.description && (
                  <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                )}
                <div className="mt-2 flex items-center space-x-4">
                  {task.assignee && (
                    <span className="text-xs text-gray-500">
                      Assigned to: {task.assignee.firstName} {task.assignee.lastName}
                    </span>
                  )}
                  {task.estimatedDuration && (
                    <span className="text-xs text-gray-500">
                      Est: {task.estimatedDuration} min
                    </span>
                  )}
                  {task.actualDuration && (
                    <span className="text-xs text-gray-500">
                      Actual: {task.actualDuration} min
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge color={getTaskStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
                {task.startedAt && (
                  <span className="text-xs text-gray-500">
                    Started: {formatDate(task.startedAt)}
                  </span>
                )}
                {task.completedAt && (
                  <span className="text-xs text-gray-500">
                    Completed: {formatDate(task.completedAt)}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {(!job.tasks || job.tasks.length === 0) && (
          <div className="px-6 py-4 text-center text-gray-500">
            No tasks assigned to this job
          </div>
        )}
      </div>
    </div>
  );
};

// Resources View Component
const ResourcesView: React.FC<{ job: any; analytics: any }> = ({ job, analytics }) => {
  return (
    <div className="space-y-6">
      {/* Assigned Technicians */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Assigned Technicians</h3>
        <div className="space-y-3">
          {job.resources?.assignedTechnicians?.map((tech: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center">
                <UserGroupIcon className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{tech.name}</p>
                  <p className="text-xs text-blue-700">{tech.role}</p>
                </div>
              </div>
              <span className="text-xs text-blue-600">
                Assigned: {formatDate(tech.assignedAt)}
              </span>
            </div>
          ))}
          {(!job.resources?.assignedTechnicians || job.resources.assignedTechnicians.length === 0) && (
            <p className="text-gray-500 text-sm">No technicians assigned</p>
          )}
        </div>
      </div>

      {/* Required Machines */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Required Machines</h3>
        <div className="space-y-3">
          {job.resources?.requiredMachines?.map((machine: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-900">{machine.name}</p>
                  <p className="text-xs text-green-700">
                    {machine.requiredFrom && machine.requiredUntil && (
                      `${formatDate(machine.requiredFrom)} - ${formatDate(machine.requiredUntil)}`
                    )}
                  </p>
                </div>
              </div>
              <Badge color={machine.isAvailable ? 'green' : 'red'}>
                {machine.isAvailable ? 'Available' : 'Unavailable'}
              </Badge>
            </div>
          ))}
          {(!job.resources?.requiredMachines || job.resources.requiredMachines.length === 0) && (
            <p className="text-gray-500 text-sm">No machines required</p>
          )}
        </div>
      </div>

      {/* Required Tools */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Required Tools</h3>
        <div className="space-y-3">
          {job.tools?.map((tool: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
              <div className="flex items-center">
                <WrenchScrewdriverIcon className="h-5 w-5 text-purple-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-purple-900">{tool.name}</p>
                  <p className="text-xs text-purple-700">
                    {tool.category} • {tool.condition}
                  </p>
                </div>
              </div>
              <Badge color={tool.isAvailable ? 'green' : 'red'}>
                {tool.isAvailable ? 'Available' : 'Assigned'}
              </Badge>
            </div>
          ))}
          {(!job.tools || job.tools.length === 0) && (
            <p className="text-gray-500 text-sm">No tools required</p>
          )}
        </div>
      </div>

      {/* Required Parts */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Required Parts</h3>
        <div className="space-y-3">
          {job.parts?.map((part: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
              <div className="flex items-center">
                <CurrencyDollarIcon className="h-5 w-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-900">{part.productName || part.product?.name || 'Unnamed Part'}</p>
                  <p className="text-xs text-orange-700">
                    Qty: {part.quantityRequired || 0}
                    {part.quantityUsed > 0 ? ` • Used: ${part.quantityUsed}` : ''}
                    {part.quantityReturned > 0 ? ` • Returned: ${part.quantityReturned}` : ''}
                    {part.product?.inventory?.currentStock !== undefined ? ` • Stock: ${part.product.inventory.currentStock}` : ''}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge color={part.status === 'reserved' ? 'blue' : part.status === 'used' ? 'green' : 'gray'}>
                  {part.status || 'Pending'}
                </Badge>
                {part.reservedAt && (
                  <p className="text-xs text-orange-600 mt-1">
                    Reserved: {formatDate(part.reservedAt)}
                  </p>
                )}
              </div>
            </div>
          ))}
          {(!job.parts || job.parts.length === 0) && (
            <p className="text-gray-500 text-sm">No parts required</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Costs View Component
const CostsView: React.FC<{ job: any; analytics: any }> = ({ job, analytics }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Costs</h3>
      <div className="space-y-4">
        {/* Labor Costs */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Labor Costs</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(analytics?.costs?.laborCost || 0)}
            </p>
            {analytics?.costs?.laborCost === 0 && (
              <p className="text-xs text-gray-500">Estimated based on job complexity</p>
            )}
          </div>
          <Badge color={analytics?.costs?.laborCost > 0 ? 'green' : 'blue'}>
            {analytics?.costs?.laborCost > 0 ? 'Actual' : 'Estimated'}
          </Badge>
        </div>

        {/* Material Costs */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Material Costs</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(analytics?.costs?.materialCost || analytics?.costs?.estimatedMaterialCost || 0)}
            </p>
            {analytics?.costs?.materialCost === 0 && analytics?.costs?.estimatedMaterialCost > 0 && (
              <p className="text-xs text-gray-500">Based on assigned parts</p>
            )}
          </div>
          <Badge color={analytics?.costs?.materialCost > 0 ? 'green' : 'blue'}>
            {analytics?.costs?.materialCost > 0 ? 'Actual' : 'Estimated'}
          </Badge>
        </div>

        {/* Total Costs */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Total Costs</p>
            <p className="text-lg font-bold text-gray-900">
              {formatCurrency(analytics?.costs?.totalCost || analytics?.costs?.estimatedTotalCost || 0)}
            </p>
          </div>
          <Badge color={analytics?.costs?.totalCost > 0 ? 'green' : 'blue'}>
            {analytics?.costs?.totalCost > 0 ? 'Actual' : 'Estimated'}
          </Badge>
        </div>

        {/* Cost Breakdown */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-md font-medium text-gray-900 mb-3">Cost Breakdown</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-700">
              <span>Labor:</span>
              <span>{formatCurrency(analytics?.costs?.laborCost || 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Materials:</span>
              <span>{formatCurrency(analytics?.costs?.materialCost || analytics?.costs?.estimatedMaterialCost || 0)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Subtotal:</span>
              <span>{formatCurrency((analytics?.costs?.laborCost || 0) + (analytics?.costs?.materialCost || analytics?.costs?.estimatedMaterialCost || 0))}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-700">
              <span>Tax (10%):</span>
              <span>{formatCurrency(((analytics?.costs?.laborCost || 0) + (analytics?.costs?.materialCost || analytics?.costs?.estimatedMaterialCost || 0)) * 0.1)}</span>
            </div>
            <div className="flex justify-between text-sm font-medium text-gray-900 border-t pt-2">
              <span>Total:</span>
              <span>{formatCurrency(((analytics?.costs?.laborCost || 0) + (analytics?.costs?.materialCost || analytics?.costs?.estimatedMaterialCost || 0)) * 1.1)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// WorkflowSteps Component
const WorkflowSteps: React.FC<{ job: any }> = ({ job }) => {
  const progress = job.progress || 0;
  
  const steps = [
    { 
      id: 'quality_check', 
      name: 'Quality Check', 
      threshold: 10,
      description: 'Initial quality assessment and job setup'
    },
    { 
      id: 'resource_assignment', 
      name: 'Resource Assignment', 
      threshold: 30,
      description: 'Assign technicians, tools, machines, and parts'
    },
    { 
      id: 'work_in_progress', 
      name: 'Work in Progress', 
      threshold: 75,
      description: 'Ongoing work and updates'
    },
    { 
      id: 'completion', 
      name: 'Job Completion', 
      threshold: 100,
      description: 'Final completion and resource release'
    },
  ];

  const getStepStatus = (stepThreshold: number) => {
    if (progress >= stepThreshold) return 'completed';
    if (progress >= stepThreshold - 10) return 'in_progress';
    return 'pending';
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <PlayIcon className="h-4 w-4 text-blue-600" />;
      default:
        return <ClockIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 border-green-200';
      case 'in_progress':
        return 'bg-blue-100 border-blue-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => {
        const status = getStepStatus(step.threshold);
        const isLast = index === steps.length - 1;
        
        return (
          <div key={step.id} className="relative">
            <div className="flex items-start">
              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border-2 ${getStepColor(status)}`}>
                {getStepIcon(status)}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900">{step.name}</h4>
                  <span className="text-xs text-gray-500">{step.threshold}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{step.description}</p>
                <div className="flex items-center mt-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-1.5 mr-2">
                    <div 
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        status === 'completed' ? 'bg-green-500' : 
                        status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.max(0, (progress - (index > 0 ? steps[index - 1].threshold : 0)) / (step.threshold - (index > 0 ? steps[index - 1].threshold : 0)) * 100))}%` 
                      }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-600">{progress}%</span>
                </div>
              </div>
            </div>
            {!isLast && (
              <div className="absolute left-5 top-10 w-0.5 h-4 bg-gray-200"></div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default JobProgressVisualization;