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
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const CustomerWorkshopPage: React.FC = () => {
  const { user } = useAuth();
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
      case 'draft': return 'gray';
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
                    {job.jobCard?.cardNumber && (
                      <div className="text-sm text-gray-600 mb-3">
                        <strong>Job Card:</strong> {job.jobCard.cardNumber}
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    <Button
                      variant="outline"
                      onClick={() => handleViewDetails(job)}
                    >
                      View Details
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
      case 'draft': return 'gray';
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
            {job.jobCard?.cardNumber && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Job Card:</span>
                <span className="text-sm text-gray-900">{job.jobCard.cardNumber}</span>
              </div>
            )}
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

export default CustomerWorkshopPage;
