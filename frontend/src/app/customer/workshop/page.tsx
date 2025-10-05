'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Modal from '@/components/ui/Modal';
import { WorkshopJob } from '@/types';
import { enhancedWorkshopAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardDocumentListIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CogIcon,
  BuildingOfficeIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const CustomerWorkshopPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Fetch customer's jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['customer-workshop-jobs', user?._id],
    queryFn: () => enhancedWorkshopAPI.getCustomerJobs(user?._id || ''),
    enabled: !!user?._id,
  });

  const jobs = jobsData?.data?.data || [];

  const handleViewDetails = (job: any) => {
    setSelectedJob(job);
    setIsDetailsOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'in_progress': return 'orange';
      case 'on_hold': return 'yellow';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'gray';
      case 'medium': return 'blue';
      case 'high': return 'orange';
      case 'urgent': return 'red';
      default: return 'gray';
    }
  };

  if (!user) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Please log in</h1>
          <p className="text-gray-600">You need to be logged in to view your workshop jobs.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">My Workshop Jobs</h1>
          <p className="text-gray-600 mt-2">Track the progress of your vehicle repairs and services</p>
        </div>

        {/* Jobs List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-2">Loading your jobs...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardDocumentListIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No jobs found</h3>
              <p className="text-gray-600">You don't have any workshop jobs yet.</p>
            </div>
          ) : (
            jobs.map((job: any) => (
              <div key={job._id} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                      <Badge color={getStatusColor(job.status)}>
                        {job.status.replace('_', ' ')}
                      </Badge>
                      <Badge color={getPriorityColor(job.priority)}>
                        {job.priority}
                      </Badge>
                    </div>
                    
                    {job.description && (
                      <p className="text-gray-600 mb-3">{job.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>Created: {formatDate(job.createdAt)}</span>
                      </div>
                      {job.deadline && (
                        <div className="flex items-center text-sm text-gray-600">
                          <ExclamationTriangleIcon className="h-4 w-4 mr-2" />
                          <span>Deadline: {formatDate(job.deadline)}</span>
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600">
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        <span>Progress: {job.progress || 0}%</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${job.progress || 0}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Assigned Technicians */}
                    {job.resources?.assignedTechnicians?.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Technicians</h4>
                        <div className="flex flex-wrap gap-2">
                          {job.resources.assignedTechnicians.map((tech: any, index: number) => (
                            <div key={index} className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                              <UserIcon className="h-4 w-4 text-blue-600 mr-1" />
                              <span className="text-sm text-blue-800">{tech.name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Job Card Number */}
                      <div className="text-sm text-gray-600 mb-3">
                      <strong>Job Card:</strong> {job.jobCard?.cardNumber || 'N/A'}
                      </div>
                  </div>

                  <div className="ml-4 flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleViewDetails(job)}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedJob(job);
                        setIsProgressOpen(true);
                      }}
                      className="flex items-center gap-2"
                    >
                      <ChartBarIcon className="h-4 w-4" />
                      View Progress
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      <Modal
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setSelectedJob(null);
        }}
        title="Job Details"
        size="lg"
      >
        {selectedJob && (
          <JobDetailsView
            job={selectedJob}
            onClose={() => {
              setIsDetailsOpen(false);
              setSelectedJob(null);
            }}
          />
        )}
      </Modal>

      {/* Work Progress Visualization Modal */}
      <Modal
        isOpen={isProgressOpen}
        onClose={() => {
          setIsProgressOpen(false);
          setSelectedJob(null);
        }}
        title="Work Progress Visualization"
        size="xl"
      >
        {selectedJob && (
          <CustomerWorkProgressVisualization job={selectedJob} />
        )}
      </Modal>
    </Layout>
  );
};

// Job Details View Component
const JobDetailsView: React.FC<{
  job: any;
  onClose: () => void;
}> = ({ job, onClose }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'blue';
      case 'in_progress': return 'orange';
      case 'on_hold': return 'yellow';
      case 'completed': return 'green';
      case 'cancelled': return 'red';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
          <Badge color={getStatusColor(job.status)}>
            {job.status.replace('_', ' ')}
          </Badge>
        </div>
        {job.description && (
          <p className="text-gray-600">{job.description}</p>
        )}
      </div>

      {/* Job Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Job Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Priority:</span>
              <Badge color={job.priority === 'urgent' ? 'red' : job.priority === 'high' ? 'orange' : 'blue'}>
                {job.priority}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="text-sm text-gray-900">{formatDate(job.createdAt)}</span>
            </div>
            {job.deadline && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deadline:</span>
                <span className="text-sm text-gray-900">{formatDate(job.deadline)}</span>
              </div>
            )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Job Card:</span>
              <span className="text-sm text-gray-900">{job.jobCard?.cardNumber || 'N/A'}</span>
              </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Progress</h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completion</span>
                <span className="text-gray-900">{job.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${job.progress || 0}%` }}
                ></div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Workflow</h4>
              <CustomerWorkflowSteps job={job} />
            </div>
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      {job.vehicle && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Vehicle Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {job.vehicle.make && (
                <div>
                  <span className="text-sm text-gray-600">Make:</span>
                  <span className="text-sm text-gray-900 ml-2">{job.vehicle.make}</span>
                </div>
              )}
              {job.vehicle.model && (
                <div>
                  <span className="text-sm text-gray-600">Model:</span>
                  <span className="text-sm text-gray-900 ml-2">{job.vehicle.model}</span>
                </div>
              )}
              {job.vehicle.regNumber && (
                <div>
                  <span className="text-sm text-gray-600">Registration:</span>
                  <span className="text-sm text-gray-900 ml-2">{job.vehicle.regNumber}</span>
                </div>
              )}
              {job.vehicle.vinNumber && (
                <div>
                  <span className="text-sm text-gray-600">VIN:</span>
                  <span className="text-sm text-gray-900 ml-2">{job.vehicle.vinNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Repair Request */}
      {job.repairRequest && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Repair Request</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-900">{job.repairRequest}</p>
          </div>
        </div>
      )}

      {/* Assigned Technicians */}
      {job.resources?.assignedTechnicians?.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Assigned Technicians</h3>
          <div className="space-y-2">
            {job.resources.assignedTechnicians.map((tech: any, index: number) => (
              <div key={index} className="flex items-center bg-blue-50 p-3 rounded-lg">
                <UserIcon className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-blue-900">{tech.name}</p>
                  <p className="text-xs text-blue-700">{tech.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tasks */}
      {job.tasks?.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Tasks</h3>
          <div className="space-y-2">
            {job.tasks.map((task: any, index: number) => (
              <div key={index} className="border border-gray-200 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                  <Badge color={
                    task.status === 'completed' ? 'green' :
                    task.status === 'in_progress' ? 'orange' :
                    task.status === 'todo' ? 'gray' : 'blue'
                  }>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
                {task.assignee && (
                  <div className="mt-2 flex items-center text-xs text-gray-500">
                    <UserIcon className="h-3 w-3 mr-1" />
                    <span>Assigned to: {task.assignee.firstName} {task.assignee.lastName}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
};

// Customer Work Progress Visualization Component
const CustomerWorkProgressVisualization: React.FC<{ job: any }> = ({ job }) => {
  const workSteps = [
    { 
      id: 1, 
      name: 'Job Received', 
      description: 'Your job request has been received and logged into our system', 
      status: 'completed',
      icon: ClipboardDocumentListIcon
    },
    { 
      id: 2, 
      name: 'Assessment', 
      description: 'Our technicians have completed the initial assessment and diagnosis', 
      status: 'completed',
      icon: CogIcon
    },
    { 
      id: 3, 
      name: 'Resource Assignment', 
      description: 'Technicians and tools have been assigned to your job', 
      status: job.resources?.assignedTechnicians?.length > 0 ? 'completed' : 'pending',
      icon: UserIcon
    },
    { 
      id: 4, 
      name: 'Work Started', 
      description: 'Work is currently in progress on your vehicle', 
      status: job.status === 'in_progress' ? 'in_progress' : 'pending',
      icon: WrenchScrewdriverIcon
    },
    { 
      id: 5, 
      name: 'Quality Check', 
      description: 'Quality inspection and testing is being performed', 
      status: 'pending',
      icon: CheckCircleIcon
    },
    { 
      id: 6, 
      name: 'Completion', 
      description: 'Your vehicle is ready for pickup', 
      status: job.status === 'completed' ? 'completed' : 'pending',
      icon: BuildingOfficeIcon
    }
  ];

  const getStepColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-blue-500';
      case 'pending': return 'bg-gray-300';
      default: return 'bg-gray-300';
    }
  };

  const getStepTextColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-700';
      case 'in_progress': return 'text-blue-700';
      case 'pending': return 'text-gray-500';
      default: return 'text-gray-500';
    }
  };

  const getStepBorderColor = (status: string) => {
    switch (status) {
      case 'completed': return 'border-green-200';
      case 'in_progress': return 'border-blue-200';
      case 'pending': return 'border-gray-200';
      default: return 'border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Overview */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Job: {job.jobNumber}</h3>
            <p className="text-gray-600">Status: <span className="font-medium capitalize">{job.status?.replace('_', ' ')}</span></p>
            <p className="text-gray-600">Priority: <span className="font-medium capitalize">{job.priority}</span></p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{job.progress || 0}%</div>
            <p className="text-sm text-gray-600">Complete</p>
          </div>
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Progress</h3>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-4 rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${job.progress || 0}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          Your job is {job.progress || 0}% complete. We'll keep you updated as work progresses.
        </p>
      </div>

      {/* Work Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Work Progress Steps</h3>
        {workSteps.map((step, index) => {
          const IconComponent = step.icon;
          return (
            <div key={step.id} className={`flex items-center space-x-4 p-6 bg-white rounded-lg border-2 ${getStepBorderColor(step.status)} shadow-sm transition-all duration-300 hover:shadow-md`}>
              {/* Step Icon */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${getStepColor(step.status)}`}>
                <IconComponent className="h-6 w-6 text-white" />
              </div>
              
              {/* Step Content */}
              <div className="flex-1">
                <h4 className={`text-lg font-semibold ${getStepTextColor(step.status)}`}>
                  {step.name}
                </h4>
                <p className="text-gray-600 mt-1">{step.description}</p>
                {step.status === 'in_progress' && (
                  <div className="mt-2">
                    <div className="flex items-center text-blue-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      <span className="text-sm font-medium">Currently in progress...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Status Badge */}
              <div className="flex items-center">
                <Badge 
                  color={
                    step.status === 'completed' ? 'green' : 
                    step.status === 'in_progress' ? 'blue' : 'gray'
                  }
                  size="lg"
                >
                  {step.status === 'completed' ? '✓ Completed' : 
                   step.status === 'in_progress' ? 'In Progress' : 'Pending'}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resource Status */}
      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Your Team</h3>
        
        {/* Assigned Technicians */}
        <div className="mb-6">
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
            <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
            Assigned Technicians
          </h4>
          {job.resources?.assignedTechnicians?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {job.resources.assignedTechnicians.map((tech: any, index: number) => (
                <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <UserIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">{tech.name}</p>
                    <p className="text-xs text-green-600">{tech.role}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <UserIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Technicians will be assigned soon</p>
            </div>
          )}
        </div>

        {/* Assigned Tools */}
        <div>
          <h4 className="font-semibold text-gray-700 mb-3 flex items-center">
            <WrenchScrewdriverIcon className="h-5 w-5 mr-2 text-blue-600" />
            Tools & Equipment
          </h4>
          {job.tools?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {job.tools.map((tool: any, index: number) => (
                <div key={index} className="flex items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                    <WrenchScrewdriverIcon className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-blue-800">{tool.name}</p>
                    <p className="text-xs text-blue-600">In use for your job</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <WrenchScrewdriverIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Tools will be assigned as needed</p>
            </div>
          )}
        </div>
      </div>

      {/* Real-time Updates */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
              <CheckCircleIcon className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="ml-4">
            <h4 className="text-lg font-medium text-green-800">Real-time Updates</h4>
            <p className="text-green-700 mt-1">
              This progress visualization updates automatically as our team works on your vehicle. 
              You'll see changes in real-time as each step is completed.
            </p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Need to Contact Us?</h4>
        <p className="text-sm text-gray-600">
          If you have any questions about your job progress, please don't hesitate to contact us. 
          We're here to keep you informed every step of the way.
        </p>
      </div>
    </div>
  );
};

export default CustomerWorkshopPage;

// Customer Workflow Stepper
const CustomerWorkflowSteps: React.FC<{ job: any }> = ({ job }) => {
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
      case 'scheduled': return hasPreparation ? 2 : 1;
      case 'in_progress': return 3;
      case 'completed': return isFollowUpDone ? 6 : 5;
      case 'on_hold':
      case 'cancelled': return 3;
      default: return 0;
    }
  };
  const currentIndex = statusToStepIndex();
  const isStepCompleted = (index: number) => {
    if (index < currentIndex) return true;
    if (job?.status === 'completed') {
      if (index <= 5) return true;
      if (index === 6) return isFollowUpDone;
    }
    if (index === 2) return hasPreparation || currentIndex > 2;
    if (index === 4) return hasQuality || currentIndex > 4;
    return false;
  };
  const isStepCurrent = (index: number) => index === currentIndex;

  return (
    <ol className="flex items-center w-full">
      {steps.map((label, index) => (
        <li key={index} className="flex-1 flex items-center">
          <div className={`flex items-center ${index !== steps.length - 1 ? 'w-full' : ''}`}>
            <div className={`flex items-center justify-center h-7 w-7 rounded-full text-[10px] font-bold transition-colors ${
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
          <div className="ml-2 text-[11px] text-gray-700 hidden md:block">{label}</div>
        </li>
      ))}
    </ol>
  );
};
