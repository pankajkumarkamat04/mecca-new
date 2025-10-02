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
            Job Card: {job.jobCard?.cardNumber || 'Not generated'} | 
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
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Deadline:</span>
            <span className="text-sm text-gray-900">
              {job.deadline ? formatDate(job.deadline) : 'Not set'}
            </span>
          </div>
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
    </div>
  );
};

// Costs View Component
const CostsView: React.FC<{ job: any; analytics: any }> = ({ job, analytics }) => {
  const costs = analytics?.costs || {};

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Breakdown</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Material Cost:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(costs.materialCost || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Labor Cost:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(costs.laborCost || 0)}
            </span>
          </div>
          <div className="flex justify-between border-t pt-3">
            <span className="text-sm font-medium text-gray-900">Total Cost:</span>
            <span className="text-lg font-bold text-gray-900">
              {formatCurrency(costs.totalCost || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Cost Analysis</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Estimated Cost:</span>
            <span className="text-sm text-gray-900">
              {formatCurrency(job.jobCard?.estimatedCost || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Actual Cost:</span>
            <span className="text-sm text-gray-900">
              {formatCurrency(costs.totalCost || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Variance:</span>
            <span className={`text-sm font-medium ${
              (costs.totalCost || 0) > (job.jobCard?.estimatedCost || 0) 
                ? 'text-red-600' 
                : 'text-green-600'
            }`}>
              {formatCurrency((costs.totalCost || 0) - (job.jobCard?.estimatedCost || 0))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobProgressVisualization;

// Workflow Steps Component
const WorkflowSteps: React.FC<{ job: any }> = ({ job }) => {
  const steps = [
    'Job Intake',
    'Scheduling',
    'Preparation',
    'Work Execution',
    'Quality Control',
    'Completion',
    'Follow-up',
  ];

  const hasPreparation = Boolean(job?.resources?.requiredMachines?.length || job?.resources?.assignedTechnicians?.length);
  const hasQuality = Boolean((job?.tasks || []).some((t: any) => t.status === 'review') || job?.qualityChecked);
  const isFollowUpDone = Boolean(job?.customerPortal?.followUpDone);

  const statusToStepIndex = () => {
    switch (job?.status) {
      case 'draft':
        return 0; // Job Intake
      case 'scheduled':
        return hasPreparation ? 2 : 1; // Preparation or Scheduling
      case 'in_progress':
        return 3; // Work Execution
      case 'completed':
        return isFollowUpDone ? 6 : (hasQuality ? 5 : 5); // Completion or Follow-up
      case 'on_hold':
      case 'cancelled':
        return 3; // Treat as during execution
      default:
        return 0;
    }
  };

  const currentIndex = statusToStepIndex();

  const isStepCompleted = (index: number) => {
    if (index < currentIndex) return true;
    if (job?.status === 'completed') {
      if (index <= 5) return true; // up to Completion
      if (index === 6) return isFollowUpDone;
    }
    if (index === 2) return hasPreparation || currentIndex > 2;
    if (index === 4) return hasQuality || currentIndex > 4;
    return false;
  };

  const isStepCurrent = (index: number) => index === currentIndex;

  return (
    <div className="w-full">
      <ol className="flex items-center w-full">
        {steps.map((label, index) => (
          <li key={index} className="flex-1 flex items-center">
            <div className={`flex items-center ${index !== steps.length - 1 ? 'w-full' : ''}`}>
              <div className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold transition-colors ${
                isStepCompleted(index)
                  ? 'bg-green-100 text-green-700 border border-green-300'
                  : isStepCurrent(index)
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'bg-gray-100 text-gray-500 border border-gray-300'
              }`}>
                {index + 1}
              </div>
              {index !== steps.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 ${
                  isStepCompleted(index)
                    ? 'bg-green-300'
                    : isStepCurrent(index)
                    ? 'bg-blue-300'
                    : 'bg-gray-200'
                }`} />
              )}
            </div>
            <div className="ml-2 text-xs text-gray-700 hidden sm:block">{label}</div>
          </li>
        ))}
      </ol>
    </div>
  );
};
