'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import WorkshopDashboard from '@/components/workshop/WorkshopDashboard';
import JobCardManager from '@/components/workshop/JobCardManager';
import JobProgressVisualization from '@/components/workshop/JobProgressVisualization';
import CustomerSelector from '@/components/ui/CustomerSelector';
import { WorkshopJob } from '@/types';
import { enhancedWorkshopAPI, machinesAPI, workstationsAPI, customersAPI, productsAPI } from '@/lib/api';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardDocumentListIcon, 
  PlusIcon, 
  TrashIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CogIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon,
  UserPlusIcon,
  PencilSquareIcon,
  XMarkIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

const WorkshopPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['workshop-jobs', currentPage, pageSize, search, status, priority],
    queryFn: () => enhancedWorkshopAPI.getJobs({
      page: currentPage,
      limit: pageSize,
      search,
      status,
      priority
    }),
  });

  // Fetch job stats
  const { data: statsData } = useQuery({
    queryKey: ['workshop-job-stats'],
    queryFn: () => enhancedWorkshopAPI.getJobStats(),
  });

  const jobs = jobsData?.data?.data || [];
  const pagination = jobsData?.data?.pagination || {};
  const stats = statsData?.data?.data || {};

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: (data: any) => enhancedWorkshopAPI.createJob(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-stats'] });
      setIsCreateOpen(false);
      toast.success('Job created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create job');
    },
  });

  // Update job mutation
  const updateJobMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => enhancedWorkshopAPI.updateJob(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      setIsEditOpen(false);
      setSelectedJob(null);
      toast.success('Job updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update job');
    },
  });

  // Update job task mutation (for Task Update action)
  const updateJobTaskMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => enhancedWorkshopAPI.updateJobTask(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      setIsEditModalOpen(false);
      setSelectedJob(null);
      toast.success('Job task updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update job task');
    },
  });

  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      enhancedWorkshopAPI.assignTechnician(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      toast.success('Technician assigned successfully');
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign technician';
      toast.error(errorMessage);
      console.error('Assign technician error:', error);
    },
  });

  // Book machine mutation
  const bookMachineMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      enhancedWorkshopAPI.bookMachine(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      toast.success('Machine booked successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to book machine');
    },
  });

  // Add task mutation
  const addTaskMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      enhancedWorkshopAPI.addTask(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      setIsTaskModalOpen(false);
      setSelectedJob(null);
      toast.success('Task added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add task');
    },
  });

  // Check parts availability mutation
  const checkPartsMutation = useMutation({
    mutationFn: (jobId: string) => enhancedWorkshopAPI.checkPartsAvailability(jobId),
    onSuccess: (response: any) => {
      const { allPartsAvailable } = response.data;
      if (allPartsAvailable) {
        toast.success('All parts are available');
      } else {
        toast.error('Some parts are not available');
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to check parts availability');
    },
  });

  // Complete job mutation
  const completeJobMutation = useMutation({
    mutationFn: (jobId: string) => enhancedWorkshopAPI.completeJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-stats'] });
      toast.success('Job completed successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to complete job');
    },
  });

  const handleCreateJob = (data: any) => {
    createJobMutation.mutate(data);
  };

  const handleUpdateJob = (data: any) => {
    if (selectedJob) {
      updateJobTaskMutation.mutate({
        id: selectedJob._id,
        data
      });
    }
  };

  const handleAssignTechnician = (jobId: string, technicianId: string, role: string) => {
    assignTechnicianMutation.mutate({
      jobId,
      data: { technicianId, role }
    });
  };

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => enhancedWorkshopAPI.deleteJob(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-stats'] });
      setIsDeleteModalOpen(false);
      setSelectedJob(null);
      toast.success('Job deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete job');
    },
  });

  const handleDeleteJob = (jobId: string) => {
    deleteJobMutation.mutate(jobId);
  };

  const handleAddTask = (data: any) => {
    if (selectedJob) {
      addTaskMutation.mutate({
        jobId: selectedJob._id,
        data
      });
    }
  };

  const handleCheckParts = (jobId: string) => {
    checkPartsMutation.mutate(jobId);
  };

  const handleCompleteJob = (jobId: string) => {
    if (confirm('Are you sure you want to complete this job?')) {
      completeJobMutation.mutate(jobId);
    }
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

  const columns = [
    {
      key: 'title',
      label: 'Job Title',
      className: 'font-medium text-gray-900'
    },
    {
      key: 'customer',
      label: 'Customer',
      render: (job: any) => {
        try {
          if (!job || !job.customer) {
            return <span className="text-sm text-gray-900">No Customer</span>;
          }
          
          const firstName = job.customer?.firstName || '';
          const lastName = job.customer?.lastName || '';
          const fullName = `${firstName} ${lastName}`.trim();
          
          return (
            <span className="text-sm text-gray-900">
              {fullName || 'No Customer'}
            </span>
          );
        } catch (error) {
          console.error('Error rendering customer:', error);
          return <span className="text-sm text-gray-900">No Customer</span>;
        }
      }
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (job: any) => (
        <Badge color={getPriorityColor(job.priority)}>
          {job.priority}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (job: any) => (
        <Badge color={getStatusColor(job.status)}>
          {job.status?.replace('_', ' ') || 'Unknown'}
        </Badge>
      )
    },
    {
      key: 'progress',
      label: 'Progress',
      render: (job: any) => (
        <div className="flex items-center">
          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${job.progress || 0}%` }}
            ></div>
          </div>
          <span className="text-sm text-gray-900">{job.progress || 0}%</span>
        </div>
      )
    },
    {
      key: 'assignedTechnicians',
      label: 'Technicians',
      render: (job: any) => (
        <div className="flex flex-wrap gap-1">
          {job.resources?.assignedTechnicians?.slice(0, 2).map((tech: any, index: number) => (
            <Badge key={index} color="blue" size="sm">
              {tech.name}
            </Badge>
          ))}
          {(job.resources?.assignedTechnicians?.length || 0) > 2 && (
            <Badge color="gray" size="sm">
              +{(job.resources?.assignedTechnicians?.length || 0) - 2}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (job: any) => {
        if (!job.deadline) return <span className="text-gray-500">Not set</span>;
        const isOverdue = new Date(job.deadline) < new Date() && job.status !== 'completed';
        return (
          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
            {formatDate(job.deadline)}
            {isOverdue && <ExclamationTriangleIcon className="inline w-4 h-4 ml-1" />}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (job: any) => (
        <div className="flex gap-1">
          {/* 1. View */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsDetailsOpen(true);
            }}
            title="View Details"
            className="text-blue-600 hover:text-blue-700"
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          
          {/* 2. Assign */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsAssignModalOpen(true);
            }}
            disabled={
              (job.resources?.assignedTechnicians?.length > 0) || 
              (job.tools?.length > 0)
            }
            title={
              (job.resources?.assignedTechnicians?.length > 0) || (job.tools?.length > 0)
                ? "Resources already assigned - use 'Task Update' to modify"
                : "Assign Resources"
            }
            className={
              (job.resources?.assignedTechnicians?.length > 0) || (job.tools?.length > 0)
                ? "text-gray-400 cursor-not-allowed"
                : "text-green-600 hover:text-green-700"
            }
          >
            <UserPlusIcon className="h-4 w-4" />
          </Button>
          
          {/* 3. Task Update */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsEditModalOpen(true);
            }}
            title="Update Tasks & Resources"
            className="text-purple-600 hover:text-purple-700"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </Button>
          
          {/* 4. Visualization */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsVisualizationOpen(true);
            }}
            title="View Work Progress Visualization"
            className="text-orange-600 hover:text-orange-700"
          >
            <ChartBarIcon className="h-4 w-4" />
          </Button>
          
          {/* 5. Complete */}
          {job.status === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteJob(job._id)}
              className="text-green-600 hover:text-green-700"
              title="Complete Job"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </Button>
          )}
          
          {/* 5. Delete */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsDeleteModalOpen(true);
            }}
            title="Delete Job"
            className="text-red-600 hover:text-red-700"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  if (!hasPermission('workshop', 'read')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view workshop jobs.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Workshop Management</h1>
            <p className="text-gray-600">Manage jobs with resource allocation and task tracking</p>
          </div>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={() => setIsDashboardOpen(true)}
              className="flex items-center"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Dashboard
            </Button>
            {hasPermission('workshop', 'create') && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Job
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ClipboardDocumentListIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus?.in_progress || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats.byStatus?.completed || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdue || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search jobs..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            <Select
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'draft', label: 'Draft' },
                { value: 'scheduled', label: 'Scheduled' },
                { value: 'in_progress', label: 'In Progress' },
                { value: 'on_hold', label: 'On Hold' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' }
              ]}
            />
            <Select
              value={priority}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setPriority(e.target.value)}
              options={[
                { value: '', label: 'All Priority' },
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
          </div>
        </div>

        {/* Jobs Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={jobs}
            columns={columns}
            loading={isLoading}
            pagination={{
              page: pagination.page || 1,
              limit: pagination.limit || 10,
              total: pagination.total || 0,
              pages: pagination.pages || 1
            }}
          />
        </div>
      </div>

      {/* Create Job Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Job Card"
        size="full"
      >
        <CreateJobForm
          onSubmit={handleCreateJob}
          onCancel={() => setIsCreateOpen(false)}
          loading={createJobMutation.isPending}
        />
      </Modal>

      {/* Assign Resources Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => {
          setIsAssignModalOpen(false);
          setSelectedJob(null);
        }}
        title="Assign Resources"
        size="xl"
      >
        {selectedJob && (
          <AssignResourcesForm
            job={selectedJob}
            onAssignTechnician={handleAssignTechnician}
            onCancel={() => {
              setIsAssignModalOpen(false);
              setSelectedJob(null);
            }}
          />
        )}
      </Modal>

      {/* Edit Job Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedJob(null);
        }}
        title="Update Job & Resources"
        size="full"
      >
        {selectedJob && (
          <EditJobForm
            job={selectedJob}
            onSubmit={handleUpdateJob}
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedJob(null);
            }}
            loading={updateJobTaskMutation.isPending}
          />
        )}
      </Modal>

      {/* Resource Management Modal */}
      <Modal
        isOpen={isResourceModalOpen}
        onClose={() => {
          setIsResourceModalOpen(false);
          setSelectedJob(null);
        }}
        title="Manage Resources"
        size="xl"
      >
        {selectedJob && (
          <ResourceManagementForm
            job={selectedJob}
            onAssignTechnician={handleAssignTechnician}
            onCancel={() => {
              setIsResourceModalOpen(false);
              setSelectedJob(null);
            }}
          />
        )}
      </Modal>

      {/* Task Management Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setSelectedJob(null);
        }}
        title="Add Task"
      >
        {selectedJob && (
          <AddTaskForm
            job={selectedJob}
            onSubmit={handleAddTask}
            onCancel={() => {
              setIsTaskModalOpen(false);
              setSelectedJob(null);
            }}
            loading={addTaskMutation.isPending}
          />
        )}
      </Modal>

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

      {/* Job Card Manager Modal */}
      <Modal
        isOpen={isJobCardModalOpen}
        onClose={() => {
          setIsJobCardModalOpen(false);
          setSelectedJob(null);
        }}
        title="Job Card Manager"
        size="xl"
      >
        {selectedJob && (
          <JobCardManager
            job={selectedJob}
            onClose={() => {
              setIsJobCardModalOpen(false);
              setSelectedJob(null);
            }}
          />
        )}
      </Modal>

      {/* Progress Visualization Modal */}
      <Modal
        isOpen={isProgressModalOpen}
        onClose={() => {
          setIsProgressModalOpen(false);
          setSelectedJob(null);
        }}
        title="Job Progress Visualization"
        size="xl"
      >
        {selectedJob && (
          <JobProgressVisualization
            jobId={selectedJob._id}
            onClose={() => {
              setIsProgressModalOpen(false);
              setSelectedJob(null);
            }}
          />
        )}
      </Modal>

      {/* Workshop Dashboard Modal */}
      <Modal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        title="Workshop Dashboard"
        size="xl"
      >
        <WorkshopDashboard />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedJob(null);
        }}
        title="Delete Job"
        size="sm"
      >
        <div className="py-4">
          <p className="text-gray-600 mb-4">
            Are you sure you want to delete this job? This action cannot be undone.
          </p>
          {selectedJob && (
            <div className="bg-gray-50 p-3 rounded-lg mb-4">
              <p className="font-medium text-gray-900">{selectedJob.jobNumber}</p>
              <p className="text-sm text-gray-600">Job ID: {selectedJob._id}</p>
            </div>
          )}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedJob(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedJob && handleDeleteJob(selectedJob._id)}
              loading={deleteJobMutation.isPending}
            >
              Delete Job
            </Button>
          </div>
        </div>
      </Modal>

      {/* Work Progress Visualization Modal */}
      <Modal
        isOpen={isVisualizationOpen}
        onClose={() => {
          setIsVisualizationOpen(false);
          setSelectedJob(null);
        }}
        title="Work Progress Visualization"
        size="xl"
      >
        {selectedJob && (
          <WorkProgressVisualizationComponent job={selectedJob} />
        )}
      </Modal>
    </Layout>
  );
};

// Create Job Form Component
const CreateJobForm: React.FC<{
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer: '',
    customerPhone: '',
    priority: 'medium',
    deadline: '',
    // Job Card specific fields matching MECCA template
    jobCard: {
      workOrderNumber: '',
      estimatedCost: 0,
      laborHours: 0,
      warrantyPeriod: 0,
      version: 1,
      isActive: true
    },
    // Customer Information (matching job card template)
    customerInfo: {
      name: '',
      address: '',
      contactName: '',
      telCell: '',
      orderNumber: ''
    },
    // Selected customer data
    selectedCustomer: null as any,
    // Vehicle Information (matching job card template)
    vehicle: {
      make: '',
      model: '',
      odometer: '',
      regNumber: '',
      vinNumber: ''
    },
    // Repair Request
    repairRequest: '',
    // Time Information
    timeInfo: {
      timeIn: '',
      timeForCollection: ''
    },
    // Sublets (outsourced work)
    sublets: [
      { description: '', amount: 0 }
    ],
    // Parts (will be managed separately)
    parts: [],
    // Tools
    // Reports/Notes
    reports: '',
    // Vehicle Pre-check (matching the pre-check form)
    precheck: {
      alarms: false,
      scratches: false,
      lights: false,
      windows: false,
      mats: false,
      centralLocking: false,
      dents: false,
      spareWheel: false,
      windscreen: false,
      wheelLockNut: false,
      antiHijack: false,
      brokenParts: false,
      toolsAndJacks: false,
      hubCaps: false,
      radioFace: false,
      mirrors: false,
      tires: false,
      brakes: false,
      battery: false,
      engine: false,
      fuelLevel: 'E',
      overallCondition: 'good',
      otherComments: ''
    },
    // Terms and Conditions
    termsAccepted: false,
    // Scheduling Information
    scheduled: {
      start: '',
      end: '',
      estimatedDuration: 0,
      bufferTime: 30,
      isFlexible: false,
      schedulingNotes: ''
    }
  });

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.getCustomers({ limit: 100 }),
  });

  const customers = customersData?.data?.data || [];

  const handleSubmit = () => {
    // Validate required fields
    if (!formData.customer) {
      toast.error('Please select a customer');
      return;
    }
    if (!formData.termsAccepted) {
      toast.error('Please accept the terms and conditions');
      return;
    }
    if (!formData.title || formData.title.trim() === '') {
      toast.error('Please enter a job title');
      return;
    }

    // Clean and validate data before submission
    const cleanedData = {
      ...formData,
      title: formData.title.trim(),
      // Ensure odometer is a valid number or empty string
      vehicle: {
        ...formData.vehicle,
        odometer: formData.vehicle.odometer ? 
          (isNaN(Number(formData.vehicle.odometer)) ? '' : Number(formData.vehicle.odometer)) : 
          ''
      },
      // Ensure numeric fields are properly formatted
      jobCard: {
        ...formData.jobCard,
        estimatedCost: Number(formData.jobCard.estimatedCost) || 0,
        laborHours: Number(formData.jobCard.laborHours) || 0,
        warrantyPeriod: Number(formData.jobCard.warrantyPeriod) || 0
      },
      // Clean sublets
      sublets: formData.sublets.map(sublet => ({
        description: sublet.description.trim(),
        amount: Number(sublet.amount) || 0
      })).filter(sublet => sublet.description !== '')
    };

    onSubmit(cleanedData);
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...(prev[parent as keyof typeof prev] as object || {}),
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleCustomerSelect = (customerId: string, customer?: any) => {
    setFormData(prev => ({
      ...prev,
      customer: customerId,
      selectedCustomer: customer,
      customerInfo: {
        ...prev.customerInfo,
        name: customer ? `${customer.firstName} ${customer.lastName}` : '',
        telCell: customer?.phone || '',
        address: customer?.address || '',
        contactName: customer ? `${customer.firstName} ${customer.lastName}` : '',
        orderNumber: prev.customerInfo.orderNumber // Keep existing order number
      }
    }));
  };

  const addSublet = () => {
    setFormData(prev => ({
      ...prev,
      sublets: [...prev.sublets, { description: '', amount: 0 }]
    }));
  };

  const removeSublet = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sublets: prev.sublets.filter((_, i) => i !== index)
    }));
  };

  const updateSublet = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      sublets: prev.sublets.map((sublet, i) => 
        i === index ? { ...sublet, [field]: value } : sublet
      )
    }));
  };

  return (
    <form className="space-y-8">
      {/* Job Card Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Create Job Card</h1>
            <p className="text-blue-100">Complete vehicle service and repair documentation</p>
          </div>
          <div className="text-right">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-3">
              <p className="text-sm text-blue-100">Job Number</p>
              <p className="text-lg font-bold">Auto-Generated</p>
            </div>
          </div>
        </div>
      </div>

      {/* Job Title */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Job Information</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Job Title *"
              name="jobTitle"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Enter job title (e.g., Engine Repair, Brake Service)"
              required
            />
            <Select
              label="Priority"
              value={formData.priority}
              onChange={(e) => handleInputChange('priority', e.target.value)}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' }
              ]}
            />
          </div>
          <TextArea
            label="Job Description"
            name="jobDescription"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe the work to be performed..."
            rows={3}
          />
        </div>
      </div>

      {/* Customer and Vehicle Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Customer Information</h3>
          </div>
          <div className="space-y-4">
            <CustomerSelector
              value={typeof formData.customer === 'string' ? formData.customer : ''}
              onChange={handleCustomerSelect}
              label="Select Customer"
              placeholder="Search customers by name, email, phone..."
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Order Number"
                name="orderNumber"
                value={formData.customerInfo.orderNumber}
                onChange={(e) => handleInputChange('customerInfo.orderNumber', e.target.value)}
              />
              <Input
                label="Service Date"
                name="serviceDate"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
              />
            </div>
            
            {/* Display selected customer details */}
            {formData.selectedCustomer && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Selected Customer Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Name:</span>
                    <span className="ml-2 font-medium">
                      {typeof formData.selectedCustomer.firstName === 'string' ? formData.selectedCustomer.firstName : ''} {typeof formData.selectedCustomer.lastName === 'string' ? formData.selectedCustomer.lastName : ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">
                      {typeof formData.selectedCustomer.phone === 'string' ? formData.selectedCustomer.phone : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">
                      {typeof formData.selectedCustomer.email === 'string' ? formData.selectedCustomer.email : 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Company:</span>
                    <span className="ml-2 font-medium">
                      {typeof formData.selectedCustomer.company === 'string' ? formData.selectedCustomer.company : 'N/A'}
                    </span>
                  </div>
                </div>
                {formData.selectedCustomer.address && (
                  <div className="mt-2">
                    <span className="text-gray-600">Address:</span>
                    <span className="ml-2 font-medium">
                      {typeof formData.selectedCustomer.address === 'string' 
                        ? formData.selectedCustomer.address 
                        : 'Address available'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Vehicle Information</h3>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Make"
                name="vehicleMake"
                value={formData.vehicle.make}
                onChange={(e) => handleInputChange('vehicle.make', e.target.value)}
              />
              <Input
                label="Model"
                name="vehicleModel"
                value={formData.vehicle.model}
                onChange={(e) => handleInputChange('vehicle.model', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Registration Number"
                name="vehicleRegNumber"
                value={formData.vehicle.regNumber}
                onChange={(e) => handleInputChange('vehicle.regNumber', e.target.value)}
              />
              <Input
                label="VIN Number"
                name="vehicleVinNumber"
                value={formData.vehicle.vinNumber}
                onChange={(e) => handleInputChange('vehicle.vinNumber', e.target.value)}
              />
            </div>
            <Input
              label="Odometer Reading"
              name="vehicleOdometer"
              type="number"
              value={formData.vehicle.odometer}
              onChange={(e) => handleInputChange('vehicle.odometer', e.target.value)}
              placeholder="Enter odometer reading"
            />
          </div>
        </div>
      </div>

      {/* Repair Request and Time Information */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Repair Request</h3>
            </div>
            <TextArea
              value={formData.repairRequest}
              onChange={(e) => handleInputChange('repairRequest', e.target.value)}
              rows={6}
              placeholder="Describe the repair request in detail..."
            />
          </div>
        </div>
        
        <div>
          <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Time Information</h3>
            </div>
            <div className="space-y-4">
              <Input
                label="Time In"
                name="timeIn"
                type="datetime-local"
                value={formData.timeInfo.timeIn}
                onChange={(e) => handleInputChange('timeInfo.timeIn', e.target.value)}
              />
              <Input
                label="Expected Collection"
                name="timeForCollection"
                type="datetime-local"
                value={formData.timeInfo.timeForCollection}
                onChange={(e) => handleInputChange('timeInfo.timeForCollection', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sublets */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Sublets (Outsourced Work)</h3>
          </div>
          <Button type="button" onClick={addSublet} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Sublet
          </Button>
        </div>
        
        <div className="space-y-3">
          {formData.sublets.map((sublet, index) => (
            <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="md:col-span-8">
                <Input
                  name={`sublet-description-${index}`}
                  value={sublet.description}
                  onChange={(e) => updateSublet(index, 'description', e.target.value)}
                  placeholder="Sublet description..."
                />
              </div>
              <div className="md:col-span-3">
                <Input
                  name={`sublet-amount-${index}`}
                  type="number"
                  step="0.01"
                  value={sublet.amount}
                  onChange={(e) => updateSublet(index, 'amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div className="md:col-span-1 flex items-center">
                <Button
                  type="button"
                  onClick={() => removeSublet(index)}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reports */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Reports & Findings</h3>
        </div>
        <TextArea
          value={formData.reports}
          onChange={(e) => handleInputChange('reports', e.target.value)}
          rows={4}
          placeholder="Enter detailed reports and findings..."
        />
      </div>

      {/* Vehicle Pre-Check */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Vehicle Pre-Check</h3>
        </div>
        
        {/* Pre-check Checklist */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Safety & Security</h4>
            {['alarms', 'centralLocking', 'antiHijack'].map((item) => (
              <label key={item} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.precheck[item as keyof typeof formData.precheck] as boolean}
                  onChange={(e) => handleInputChange(`precheck.${item}`, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{item.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Exterior</h4>
            {['scratches', 'dents', 'brokenParts', 'toolsAndJacks', 'hubCaps', 'mirrors', 'tires'].map((item) => (
              <label key={item} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.precheck[item as keyof typeof formData.precheck] as boolean}
                  onChange={(e) => handleInputChange(`precheck.${item}`, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{item.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>
          
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900 text-sm uppercase tracking-wide">Interior & Systems</h4>
            {['lights', 'windows', 'mats', 'spareWheel', 'windscreen', 'wheelLockNut', 'radioFace', 'brakes', 'battery', 'engine'].map((item) => (
              <label key={item} className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.precheck[item as keyof typeof formData.precheck] as boolean}
                  onChange={(e) => handleInputChange(`precheck.${item}`, e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{item.replace(/([A-Z])/g, ' $1').trim()}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Fuel Level and Overall Condition */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Fuel Level</h4>
            <div className="flex space-x-4">
              {['E', '1/4', '1/2', '3/4', 'F'].map((level) => (
                <label key={level} className="flex items-center">
                  <input
                    type="radio"
                    name="fuelLevel"
                    value={level}
                    checked={formData.precheck.fuelLevel === level}
                    onChange={(e) => handleInputChange('precheck.fuelLevel', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700">{level}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Overall Condition</h4>
            <div className="flex space-x-4">
              {['poor', 'avg', 'good', 'excellent'].map((condition) => (
                <label key={condition} className="flex items-center">
                  <input
                    type="radio"
                    name="overallCondition"
                    value={condition}
                    checked={formData.precheck.overallCondition === condition}
                    onChange={(e) => handleInputChange('precheck.overallCondition', e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2 text-sm text-gray-700 capitalize">{condition}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Other Comments */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Additional Comments</h4>
          <TextArea
            value={formData.precheck.otherComments}
            onChange={(e) => handleInputChange('precheck.otherComments', e.target.value)}
            rows={3}
            placeholder="Additional comments or observations..."
          />
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Terms and Conditions</h3>
        <div className="space-y-3 text-sm text-gray-700 mb-4">
          <p>1. I accept the technical advice regarding the service and repair of my vehicle.</p>
          <p>2. I confirm that all valuables and personal possessions have been removed from the vehicle. We will not be liable for any loss or damage to such items.</p>
          <p>3. I authorize the repairs as outlined on this Job Card. Any additional work will require an approved estimate.</p>
          <p>4. I have read and understood the terms and conditions above.</p>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            name="termsAccepted"
            checked={formData.termsAccepted}
            onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <span className="ml-2 text-sm text-gray-700">I accept the terms and conditions</span>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          type="button"
          loading={loading} 
          disabled={!formData.termsAccepted || !formData.customer}
          title={!formData.termsAccepted ? 'Please accept terms and conditions' : !formData.customer ? 'Please select a customer' : ''}
          onClick={handleSubmit}
        >
          Create Job Card
        </Button>
      </div>
      
      {/* Validation Messages */}
      {!formData.customer && (
        <div className="text-red-600 text-sm mt-2">
          Please select a customer to continue
        </div>
      )}
      {!formData.termsAccepted && (
        <div className="text-red-600 text-sm mt-2">
          Please accept the terms and conditions to continue
        </div>
      )}
    </form>
  );
};

// Edit Job Form Component
interface EditJobFormData {
  title: string;
  description: string;
  priority: string;
  status: string;
  deadline: string;
  progress: number;
  estimatedDuration: string;
  technicians: {
    added: Array<{ technicianId: string; role: string }>;
    removed: string[];
  };
  tools: {
    added: Array<{ toolId: string; expectedReturn: string }>;
    removed: string[];
  };
  parts: {
    added: Array<{ productId: string; quantity: number }>;
    removed: string[];
  };
  machines: {
    added: Array<{ machineId: string; until: string }>;
    removed: string[];
  };
}

const EditJobForm: React.FC<{
  job: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ job, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState<EditJobFormData>({
    title: job.title || '',
    description: job.description || '',
    priority: job.priority || 'medium',
    status: job.status || 'draft',
    deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
    progress: job.progress || 0,
    estimatedDuration: job.estimatedDuration || '',
    // Resource management
    technicians: {
      added: [],
      removed: []
    },
    tools: {
      added: [],
      removed: []
    },
    parts: {
      added: [],
      removed: []
    },
    machines: {
      added: [],
      removed: []
    } as any
  });

  // Fetch available technicians
  const { data: techniciansData, isLoading: techniciansLoading } = useQuery({
    queryKey: ['available-technicians'],
    queryFn: () => api.get('/technicians/available'),
  });

  // Fetch available tools
  const { data: availableToolsData, isLoading: toolsLoading } = useQuery({
    queryKey: ['available-tools'],
    queryFn: () => api.get('/workshop/available-tools'),
  });

  // Fetch products for parts
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => api.get('/products?limit=100'),
  });

  // Fetch available machines - ADD DEBUGGING
  const { data: machinesData, isLoading: machinesLoading, error: machinesError } = useQuery({
    queryKey: ['available-machines'],
    queryFn: () => {
      console.log('🔍 EditJobForm: Fetching machines...');
      return api.get('/workshop/available-machines');
    },
  });

  const technicians = techniciansData?.data?.technicians || [];
  
  // Debug tools data
  console.log('🔍 EditJobForm availableToolsData:', availableToolsData);
  console.log('🔍 EditJobForm availableToolsData?.data:', availableToolsData?.data);
  console.log('🔍 EditJobForm availableToolsData?.data?.data:', availableToolsData?.data?.data);
  const availableTools = Array.isArray(availableToolsData?.data?.data) ? availableToolsData.data.data : [];
  console.log('🔍 EditJobForm availableTools array:', availableTools);
  
  const products = Array.isArray(productsData?.data?.data) ? productsData.data.data : [];
  
  // Debug machines data
  console.log('🔍 EditJobForm machinesData:', machinesData);
  console.log('🔍 EditJobForm machinesLoading:', machinesLoading);
  console.log('🔍 EditJobForm machinesError:', machinesError);
  console.log('🔍 EditJobForm machinesData?.data:', machinesData?.data);
  const availableMachines = Array.isArray(machinesData?.data?.data) ? machinesData.data.data : [];
  console.log('🔍 EditJobForm availableMachines array length:', availableMachines.length);
  console.log('🔍 EditJobForm availableMachines array:', availableMachines);
  
  // Get currently assigned machines for this job
  const assignedMachines = Array.isArray(job.resources?.requiredMachines) ? job.resources.requiredMachines : [];
  console.log('🔍 EditJobForm assignedMachines array:', assignedMachines);
  
  // Combine available and assigned machines, removing duplicates
  const allMachines = [
    ...availableMachines,
    ...assignedMachines.map((assignedMachine: any) => ({
      _id: assignedMachine.machineId,
      name: assignedMachine.name,
      model: 'Currently Assigned',
      category: 'Assigned',
      isAssigned: true,
      assignedUntil: assignedMachine.requiredUntil
    }))
  ];
  
  // Remove duplicates based on _id
  const machines = allMachines.filter((machine: any, index: number, self: any[]) => 
    index === self.findIndex((m: any) => m._id === machine._id)
  );
  
  console.log('🔍 EditJobForm combined machines array:', machines);
  
  // Additional debugging for API response structure
  if (machinesData) {
    console.log('🔍 EditJobForm Full API Response:', JSON.stringify(machinesData, null, 2));
  }

  // State for select values
  const [selectedTechnicianId, setSelectedTechnicianId] = useState('');
  const [selectedToolId, setSelectedToolId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [machineBookingUntil, setMachineBookingUntil] = useState('');
  const [toolExpectedReturn, setToolExpectedReturn] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('🔍 EditJobForm: Submitting form data:', formData);
    
    try {
      // Update job basic information
      await api.put(`/workshop/${job._id}/update-task`, {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        status: formData.status,
        deadline: formData.deadline,
        progress: formData.progress,
        estimatedDuration: formData.estimatedDuration
      });

      // Update resources using the same API as Assign Resources
      if (formData.technicians.added.length > 0 || formData.technicians.removed.length > 0 ||
          formData.tools.added.length > 0 || formData.tools.removed.length > 0 ||
          formData.parts.added.length > 0 || formData.parts.removed.length > 0 ||
          formData.machines.added.length > 0 || formData.machines.removed.length > 0) {
        
        await api.put(`/workshop/${job._id}/update-resources`, {
          technicians: formData.technicians,
          tools: formData.tools,
          parts: formData.parts,
          machines: formData.machines
        });
      }

      toast.success('Job and resources updated successfully');
      onCancel(); // Close modal
      
    } catch (error: any) {
      console.error('EditJobForm error:', error);
      toast.error(error?.response?.data?.message || 'Failed to update job');
    }
  };

  const addTechnician = () => {
    if (selectedTechnicianId) {
      setFormData(prev => ({
        ...prev,
        technicians: {
          ...prev.technicians,
          added: [...prev.technicians.added, {
            technicianId: selectedTechnicianId,
            role: 'technician'
          }]
        }
      }));
      setSelectedTechnicianId(''); // Reset selection
    }
  };

  const removeTechnician = (technicianId: string) => {
    setFormData(prev => ({
      ...prev,
      technicians: {
        ...prev.technicians,
        removed: [...prev.technicians.removed, technicianId]
      }
    }));
  };

  const addTool = () => {
    if (selectedToolId && toolExpectedReturn) {
      setFormData(prev => ({
        ...prev,
        tools: {
          ...prev.tools,
          added: [...prev.tools.added, {
            toolId: selectedToolId,
            expectedReturn: toolExpectedReturn
          }]
        }
      }));
      setSelectedToolId(''); // Reset selection
      setToolExpectedReturn(''); // Reset return date
    }
  };

  const removeTool = (toolId: string) => {
    setFormData(prev => ({
      ...prev,
      tools: {
        ...prev.tools,
        removed: [...prev.tools.removed, toolId]
      }
    }));
  };

  const addPart = () => {
    console.log('🔍 addPart called with selectedProductId:', selectedProductId);
    console.log('🔍 products array:', products);
    console.log('🔍 products length:', products.length);
    
    if (selectedProductId) {
      console.log('🔍 Adding part with productId:', selectedProductId);
      setFormData(prev => ({
        ...prev,
        parts: {
          ...prev.parts,
          added: [...prev.parts.added, {
            productId: selectedProductId,
            quantity: 1
          }]
        }
      }));
      setSelectedProductId(''); // Reset selection
      console.log('🔍 Part added successfully');
      
      // Show success message
      const selectedProduct = products.find((p: any) => p._id === selectedProductId);
      if (selectedProduct) {
        toast.success(`Added ${selectedProduct.name} to parts list`);
      }
    } else {
      console.log('🔍 No product selected');
      toast.error('Please select a product first');
    }
  };

  const removePart = (partId: string) => {
    setFormData(prev => ({
      ...prev,
      parts: {
        ...prev.parts,
        removed: [...prev.parts.removed, partId]
      }
    }));
  };


  const addMachine = () => {
    console.log('🔍 addMachine called with selectedMachineId:', selectedMachineId);
    console.log('🔍 machineBookingUntil:', machineBookingUntil);
    
    if (selectedMachineId && machineBookingUntil) {
      console.log('🔍 Adding machine with machineId:', selectedMachineId);
      setFormData(prev => ({
        ...prev,
        machines: {
          ...(prev as any).machines,
          added: [...(prev as any).machines.added, {
            machineId: selectedMachineId,
            until: machineBookingUntil
          }]
        }
      }));
      setSelectedMachineId(''); // Reset selection
      setMachineBookingUntil(''); // Reset booking date
      console.log('🔍 Machine added successfully');
      
      // Show success message
      const selectedMachine = machines.find((m: any) => m._id === selectedMachineId);
      if (selectedMachine) {
        toast.success(`Booked ${selectedMachine.name} until ${new Date(machineBookingUntil).toLocaleDateString()}`);
      }
    } else {
      console.log('🔍 Missing machine selection or booking date');
      toast.error('Please select a machine and booking date');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Job Information Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Job Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Job Title"
            value={formData.title}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <Select
            label="Priority"
            value={formData.priority}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
          <Select
            label="Status"
            value={formData.status}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, status: e.target.value }))}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'scheduled', label: 'Scheduled' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'on_hold', label: 'On Hold' },
              { value: 'completed', label: 'Completed' },
              { value: 'cancelled', label: 'Cancelled' }
            ]}
          />
          <Input
            label="Deadline"
            type="date"
            value={formData.deadline}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
          />
          <Input
            label="Progress (%)"
            type="number"
            min="0"
            max="100"
            value={formData.progress}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
          />
          <Input
            label="Estimated Duration (minutes)"
            type="number"
            value={formData.estimatedDuration}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
          />
        </div>
        
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Resource Management Section */}
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Resource Management</h2>
              <p className="text-sm text-gray-600">Update and manage technicians, tools, machines, and parts for this job</p>
            </div>
          </div>
        </div>

        {/* Resources Management */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
            <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            Resources Management
          </h3>
        <div className="space-y-6">
          {/* ===== TECHNICIANS SECTION ===== */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-blue-600" />
              Technicians
            </h3>
            
            {/* Assigned Technicians */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-2.5 h-2.5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                Currently Assigned
                {formData.technicians.added.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    +{formData.technicians.added.length} pending
                  </span>
                )}
              </h4>
              <div className="flex flex-wrap gap-2">
                {/* Current technicians */}
                {job.resources?.assignedTechnicians?.map((tech: any, index: number) => (
                  <div key={`current-${index}`} className="flex items-center bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">
                        {tech.technician?.user?.firstName} {tech.technician?.user?.lastName}
                      </p>
                      <p className="text-xs text-blue-600">{tech.role}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTechnician(tech.technician._id)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
                
                {/* Pending additions */}
                {formData.technicians.added.map((tech: any, index: number) => {
                  const technician = technicians.find((t: any) => t._id === tech.technicianId);
                  return (
                    <div key={`pending-${index}`} className="flex items-center bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">
                          {technician?.user?.firstName} {technician?.user?.lastName} {technician?.name}
                        </p>
                        <p className="text-xs text-green-600">{tech.role} (Pending)</p>
                      </div>
                      <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded">
                        New
                      </span>
                    </div>
                  );
                })}
                
                {(!job.resources?.assignedTechnicians || job.resources?.assignedTechnicians?.length === 0) && 
                 formData.technicians.added.length === 0 && (
                  <span className="text-gray-500 text-sm">No technicians assigned</span>
                )}
              </div>
            </div>

            {/* Add New Technician */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Add New Technician</h4>
              <div className="flex gap-2">
                <Select
                  label="Select Technician"
                  value={selectedTechnicianId}
                  onChange={(e) => setSelectedTechnicianId(e.target.value)}
                  disabled={techniciansLoading}
                  options={[
                    { value: '', label: techniciansLoading ? 'Loading...' : 'Select Technician...' },
                    ...(Array.isArray(technicians) ? technicians.map((tech: any) => ({
                      value: tech._id,
                      label: tech.user 
                        ? `${tech.user.firstName} ${tech.user.lastName} - ${tech.position}`
                        : `${tech.employeeId || 'Tech'} - ${tech.position}`
                    })) : [])
                  ]}
                />
                <Button
                  type="button"
                  onClick={addTechnician}
                  disabled={!selectedTechnicianId}
                  className="self-end"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          {/* ===== MACHINES SECTION ===== */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <svg className="h-5 w-5 mr-2 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
              </svg>
              Machines
            </h3>
            
            {/* Assigned Machines */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-2.5 h-2.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                Currently Booked
                {formData.machines.added.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    +{formData.machines.added.length} pending
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {/* Current machines */}
                {job.resources?.requiredMachines?.map((machine: any, index: number) => (
                  <div key={`current-${index}`} className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900">{machine.name}</p>
                        <p className="text-xs text-purple-600">
                          Booked until: {machine.requiredUntil ? new Date(machine.requiredUntil).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          machines: {
                            ...prev.machines,
                            removed: [...prev.machines.removed, machine.machineId]
                          }
                        }));
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Release
                    </Button>
                  </div>
                ))}
                
                {/* Pending additions */}
                {formData.machines.added.map((machine: any, index: number) => {
                  const machineData = machines.find((m: any) => m._id === machine.machineId);
                  return (
                    <div key={`pending-${index}`} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">{machineData?.name}</p>
                          <p className="text-xs text-green-600">
                            Until: {machine.until ? new Date(machine.until).toLocaleDateString() : 'Not set'} (Pending)
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded">
                        New
                      </span>
                    </div>
                  );
                })}
                
                {(!job.resources?.requiredMachines || job.resources?.requiredMachines?.length === 0) && 
                 formData.machines.added.length === 0 && (
                  <span className="text-gray-500 text-sm">No machines assigned</span>
                )}
              </div>
            </div>

            {/* Book New Machine */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Book New Machine</h4>
              <div className="flex gap-2">
                <Select
                  label="Select Machine"
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  disabled={machinesLoading}
                  options={[
                    { value: '', label: machinesLoading ? 'Loading...' : 'Select Machine...' },
                    ...(Array.isArray(machines) ? machines.filter((m: any) => !m.isAssigned).map((machine: any) => ({
                      value: machine._id,
                      label: `${machine.name} (${machine.model || 'N/A'} • ${machine.category})`
                    })) : [])
                  ]}
                />
                <Input
                  type="datetime-local"
                  label="Book Until"
                  value={machineBookingUntil}
                  onChange={(e) => setMachineBookingUntil(e.target.value)}
                  className="w-48"
                />
                <Button
                  type="button"
                  onClick={addMachine}
                  disabled={!selectedMachineId || !machineBookingUntil}
                  className="self-end"
                >
                  Book
                </Button>
              </div>
            </div>
          </div>

            {/* Assigned Tools */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-2.5 h-2.5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                  </svg>
                </div>
                Assigned Tools
                {formData.tools.added.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    +{formData.tools.added.length} pending
                    </span>
                )}
              </h4>
              <div className="space-y-2">
                {/* Current tools */}
                {job.tools?.map((tool: any, index: number) => (
                  <div key={`current-${index}`} className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-yellow-900">{tool.name}</p>
                        <p className="text-xs text-yellow-600">{tool.category}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTool(tool.toolId)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Return
                    </Button>
                  </div>
                ))}
                
                {/* Pending additions */}
                {formData.tools.added.map((tool: any, index: number) => {
                  const toolData = availableTools.find((t: any) => t._id === tool.toolId);
                  return (
                    <div key={`pending-${index}`} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">{toolData?.name}</p>
                          <p className="text-xs text-green-600">{toolData?.category} (Pending)</p>
              </div>
            </div>
                      <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded">
                        New
                      </span>
                    </div>
                  );
                })}
                
                {(!job.tools || job.tools.length === 0) && formData.tools.added.length === 0 && (
                  <span className="text-gray-500 text-sm">No tools assigned</span>
                )}
              </div>
            </div>

            {/* Assigned Machines */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-2.5 h-2.5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                </div>
                Assigned Machines
                {formData.machines.added.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    +{formData.machines.added.length} pending
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {/* Current machines */}
                {job.resources?.requiredMachines?.map((machine: any, index: number) => (
                  <div key={`current-${index}`} className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-purple-900">{machine.name}</p>
                        <p className="text-xs text-purple-600">
                          Booked until: {machine.requiredUntil ? new Date(machine.requiredUntil).toLocaleDateString() : 'Not set'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          machines: {
                            ...prev.machines,
                            removed: [...prev.machines.removed, machine.machineId]
                          }
                        }));
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Release
                    </Button>
                  </div>
                ))}
                
                {/* Pending additions */}
                {formData.machines.added.map((machine: any, index: number) => {
                  const machineData = machines.find((m: any) => m._id === machine.machineId);
                  return (
                    <div key={`pending-${index}`} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">{machineData?.name}</p>
                          <p className="text-xs text-green-600">
                            Until: {machine.until ? new Date(machine.until).toLocaleDateString() : 'Not set'} (Pending)
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded">
                        New
                      </span>
                    </div>
                  );
                })}
                
                {(!job.resources?.requiredMachines || job.resources?.requiredMachines?.length === 0) && 
                 formData.machines.added.length === 0 && (
                  <span className="text-gray-500 text-sm">No machines assigned</span>
                )}
              </div>
            </div>

            {/* Assigned Parts */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center mr-2">
                  <svg className="w-2.5 h-2.5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                Assigned Parts
                {formData.parts.added.length > 0 && (
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                    +{formData.parts.added.length} pending
                  </span>
                )}
              </h4>
              <div className="space-y-2">
                {/* Current parts */}
                {job.resources?.requiredParts?.map((part: any, index: number) => (
                  <div key={`current-${index}`} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-900">{part.name}</p>
                        <p className="text-xs text-green-600">
                          Quantity: {part.quantity} • Status: {part.isAvailable ? 'Available' : 'Out of Stock'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          parts: {
                            ...prev.parts,
                            removed: [...prev.parts.removed, part.productId]
                          }
                        }));
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Remove
                    </Button>
                  </div>
                ))}
                
                {/* Pending additions */}
                {formData.parts.added.map((part: any, index: number) => {
                  const partProduct = products.find((p: any) => p._id === part.productId);
                  return (
                    <div key={`pending-${index}`} className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-green-900">{partProduct?.name}</p>
                          <p className="text-xs text-green-600">
                            Quantity: {part.quantity} (Pending)
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-green-600 px-2 py-1 bg-green-100 rounded">
                        New
                      </span>
                    </div>
                  );
                })}
                
                {(!job.resources?.requiredParts || job.resources?.necessityParts?.length === 0) && 
                 formData.parts.added.length === 0 && (
                  <span className="text-gray-500 text-sm">No parts assigned</span>
                )}
              </div>
            </div>

            {/* Add New Tool */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Add Tool</h4>
              <div className="flex gap-2">
                <Select
                  label="Select Tool"
                  value={selectedToolId}
                  onChange={(e) => setSelectedToolId(e.target.value)}
                  disabled={toolsLoading}
                  options={[
                    { value: '', label: toolsLoading ? 'Loading...' : 'Select Tool...' },
                    ...(Array.isArray(availableTools) ? availableTools.map((tool: any) => ({
                      value: tool._id,
                      label: tool.toolNumber ? `${tool.name} (${tool.toolNumber})` : tool.name
                    })) : [])
                  ]}
                />
                <Input
                  type="datetime-local"
                  value={toolExpectedReturn}
                  onChange={(e) => setToolExpectedReturn(e.target.value)}
                  placeholder="Expected Return"
                  className="w-48"
                />
                <Button
                  type="button"
                  onClick={addTool}
                  disabled={!selectedToolId || !toolExpectedReturn}
                  className="self-end"
                >
                  Assign
                </Button>
              </div>
            </div>



            {/* Book Machines */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Book Machine</h4>
              <div className="flex gap-2">
                <Select
                  label="Select Machine"
                  value={selectedMachineId}
                  onChange={(e) => setSelectedMachineId(e.target.value)}
                  disabled={machinesLoading}
                  options={[
                    { value: '', label: machinesLoading ? 'Loading...' : 'Select Machine...' },
                    ...(Array.isArray(machines) ? machines.filter((m: any) => !m.isAssigned).map((machine: any) => ({
                      value: machine._id,
                      label: `${machine.name} (${machine.model || 'N/A'} • ${machine.category})`
                    })) : [])
                  ]}
                />
                <Input
                  type="datetime-local"
                  label="Book Until"
                  value={machineBookingUntil}
                  onChange={(e) => setMachineBookingUntil(e.target.value)}
                  className="w-48"
                />
                <Button
                  type="button"
                  onClick={addMachine}
                  disabled={!selectedMachineId || !machineBookingUntil}
                  className="self-end"
                >
                  Book
                </Button>
              </div>
            </div>

            {/* Add New Part */}
            <div>
              <h4 className="font-medium text-gray-700 mb-2">Add Part</h4>
              <div className="flex gap-2">
                <Select
                  label="Select Product"
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  disabled={productsLoading}
                  options={[
                    { value: '', label: productsLoading ? 'Loading...' : 'Select Product...' },
                    ...(Array.isArray(products) ? products.map((product: any) => ({
                      value: product._id,
                      label: `${product.name} (Stock: ${product.inventory?.currentStock || 0})`
                    })) : [])
                  ]}
                />
                <Button
                  type="button"
                  onClick={() => {
                    console.log('🔍 Add button clicked');
                    addPart();
                  }}
                  disabled={!selectedProductId}
                  className="self-end"
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Action Buttons */}
      <div className="bg-gray-50 border-t border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Resource changes will be saved when you submit the form
          </div>
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={onCancel} className="px-6">
          Cancel
        </Button>
            <Button type="submit" loading={loading} className="px-6 bg-purple-600 hover:bg-purple-700">
          Update Job & Resources
        </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

// Resource Management Form Component
const ResourceManagementForm: React.FC<{
  job: any;
  onAssignTechnician: (jobId: string, technicianId: string, role: string) => void;
  onCancel: () => void;
}> = ({ job, onAssignTechnician, onCancel }) => {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedMachineId, setSelectedMachineId] = useState('');
  // Switch machines to multiple selection
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [bookingUntil, setBookingUntil] = useState('');
  const [machineBookingUntil, setMachineBookingUntil] = useState('');
  const [selectedTool, setSelectedTool] = useState('');
  const [toolExpectedReturn, setToolExpectedReturn] = useState('');
  const [selectedParts, setSelectedParts] = useState<{[key: string]: number}>({});

  // Machine booking mutation
  const bookMachineMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      enhancedWorkshopAPI.bookMachine(jobId, data),
    onSuccess: () => {
      toast.success('Machine booked successfully');
      setSelectedMachines([]);
      setBookingUntil('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to book machine');
    },
  });

  // Fetch available technicians
  const { data: techniciansData } = useQuery({
    queryKey: ['available-technicians'],
    queryFn: () => api.get('/technicians/available'),
  });

  // Fetch available machines (use workshop available list for consistency) - ADD DEBUGGING
  const { data: machinesData, isLoading: machinesLoading, error: machinesError } = useQuery({
    queryKey: ['available-machines'],
    queryFn: () => {
      console.log('🔍 ResourceManagementForm: Fetching machines...');
      return api.get('/workshop/available-machines');
    },
  });

  // Fetch available tools
  const { data: availableToolsData } = useQuery({
    queryKey: ['available-tools'],
    queryFn: () => api.get('/workshop/available-tools'),
  });

  // Fetch available products for parts
  const { data: availableProductsData } = useQuery({
    queryKey: ['available-products'],
    queryFn: () => api.get('/products?status=active&limit=100'),
  });

  const technicians = techniciansData?.data?.technicians || [];
  
  // Debug machines data in ResourceManagementForm
  console.log('🔍 ResourceManagementForm machinesData:', machinesData);
  console.log('🔍 ResourceManagementForm machinesLoading:', machinesLoading);
  console.log('🔍 ResourceManagementForm machinesError:', machinesError);
  const availableMachines = Array.isArray(machinesData?.data?.data) ? machinesData.data.data : [];
  console.log('🔍 ResourceManagementForm availableMachines array:', availableMachines);
  
  // Get currently assigned machines for this job
  const assignedMachines = Array.isArray(job.resources?.requiredMachines) ? job.resources.requiredMachines : [];
  console.log('🔍 ResourceManagementForm assignedMachines array:', assignedMachines);
  
  // Combine available and assigned machines, removing duplicates
  const allMachines = [
    ...availableMachines,
    ...assignedMachines.map((assignedMachine: any) => ({
      _id: assignedMachine.machineId,
      name: assignedMachine.name,
      model: 'Currently Assigned',
      category: 'Assigned',
      isAssigned: true,
      assignedUntil: assignedMachine.requiredUntil
    }))
  ];
  
  // Remove duplicates based on _id
  const uniqueMachines = allMachines.filter((machine: any, index: number, self: any[]) => 
    index === self.findIndex((m: any) => m._id === machine._id)
  );
  
  console.log('🔍 ResourceManagementForm combined machines array:', uniqueMachines);
  
  const availableTools = Array.isArray(availableToolsData?.data?.data) ? availableToolsData.data.data : [];
  const availableProducts = Array.isArray(availableProductsData?.data?.products) ? availableProductsData.data.products : [];

  const handleAssignTechnician = () => {
    if (selectedTechnician) {
      onAssignTechnician(job._id, selectedTechnician, 'technician');
      setSelectedTechnician('');
    }
  };


  const updatePartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      const newSelectedParts = { ...selectedParts };
      delete newSelectedParts[productId];
      setSelectedParts(newSelectedParts);
    } else {
      setSelectedParts(prev => ({ ...prev, [productId]: quantity }));
    }
  };

  const handleAssignTool = () => {
    if (selectedTool && toolExpectedReturn) {
      // Call API to assign tool
                      api.post(`/workshop/${job._id}/assign-tool`, {
        toolId: selectedTool,
        expectedReturn: toolExpectedReturn
      }).then(() => {
        toast.success('Tool assigned successfully');
        setSelectedTool('');
        setToolExpectedReturn('');
        // Refresh the page or update the job data
        window.location.reload();
      }).catch((error) => {
        toast.error('Failed to assign tool');
        console.error('Assign tool error:', error);
      });
    }
  };

  const addMachine = () => {
    console.log('🔍 ResourceManagementForm addMachine called with selectedMachineId:', selectedMachineId);
    console.log('🔍 ResourceManagementForm machineBookingUntil:', machineBookingUntil);
    
    if (selectedMachineId && machineBookingUntil) {
      console.log('🔍 ResourceManagementForm Adding machine with machineId:', selectedMachineId);
      
      // Call API to book machine
      api.post(`/workshop/${job._id}/assign-machine`, {
        machineId: selectedMachineId,
        until: machineBookingUntil
      }).then(() => {
        toast.success('Machine booked successfully');
        setSelectedMachineId('');
        setMachineBookingUntil('');
        window.location.reload();
      }).catch((error) => {
        const errorMessage = error.response?.data?.message || error.message || 'Failed to book machine';
        toast.error(errorMessage);
        console.error('Book machine error:', error);
      });
    } else {
      console.log('🔍 ResourceManagementForm Missing machine selection or booking date');
      toast.error('Please select a machine and booking date');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
      <div>
            <h2 className="text-xl font-semibold text-gray-900">Resource Management</h2>
            <p className="text-sm text-gray-600">Manage technicians, tools, machines, and parts for this job</p>
          </div>
        </div>
      </div>

      {/* Resources Management */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <h3 className="text-lg font-medium text-gray-900 mb-6 flex items-center">
          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          Resources Management
        </h3>
        <div className="space-y-6">
          {/* Assigned Technicians */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Technicians</h4>
            <div className="flex flex-wrap gap-2">
              {job.resources?.assignedTechnicians?.map((tech: any, index: number) => (
                <Badge key={index} color="blue">
                  {tech.name} ({tech.role})
                </Badge>
              ))}
              {(!job.resources?.assignedTechnicians || job.resources?.assignedTechnicians?.length === 0) && (
                <span className="text-gray-500 text-sm">No technicians assigned</span>
              )}
            </div>
          </div>

          {/* Assigned Tools */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Tools</h4>
            <div className="space-y-2">
              {job.tools?.map((tool: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-gray-600 mr-3" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                      <p className="text-xs text-gray-600">{tool.category} - {tool.condition}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Call API to return tool
                      api.post(`/workshop/${job._id}/return-tool`, {
                        toolId: tool.toolId
                      }).then(() => {
                        toast.success('Tool returned successfully');
                        window.location.reload();
                      }).catch((error) => {
                      const errorMessage = error.response?.data?.message || error.message || 'Failed to return tool';
                      toast.error(errorMessage);
                        console.error('Return tool error:', error);
                      });
                    }}
                  >
                    Return
                  </Button>
                </div>
              ))}
              {(!job.tools || job.tools.length === 0) && (
                <span className="text-gray-500 text-sm">No tools assigned</span>
              )}
            </div>
          </div>

          {/* Assigned Machines */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Machines</h4>
            <div className="space-y-2">
              {job.resources?.requiredMachines?.map((machine: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{machine.name}</p>
                      <p className="text-xs text-gray-600">
                        Booked until: {machine.requiredUntil ? new Date(machine.requiredUntil).toLocaleDateString() : 'Not set'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Call API to release machine
                      api.post(`/workshop/${job._id}/release-machine`, {
                        machineId: machine.machineId
                      }).then(() => {
                        toast.success('Machine released successfully');
                        window.location.reload();
                      }).catch((error) => {
                        const errorMessage = error.response?.data?.message || error.message || 'Failed to release machine';
                        toast.error(errorMessage);
                        console.error('Release machine error:', error);
                      });
                    }}
                  >
                    Release
                  </Button>
                </div>
              ))}
              {(!job.resources?.requiredMachines || job.resources?.requiredMachines?.length === 0) && (
                <span className="text-gray-500 text-sm">No machines assigned</span>
              )}
            </div>
          </div>

          {/* Assigned Parts */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Parts</h4>
            <div className="space-y-2">
              {job.resources?.requiredParts?.map((part: any, index: number) => (
                <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{part.name}</p>
                      <p className="text-xs text-gray-600">
                        Quantity: {part.quantity} • Status: {part.isAvailable ? 'Available' : 'Out of Stock'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Call API to remove part
                      api.post(`/workshop/${job._id}/remove-part`, {
                        productId: part.productId
                      }).then(() => {
                        toast.success('Part removed successfully');
                        window.location.reload();
                      }).catch((error) => {
                        const errorMessage = error.response?.data?.message || error.message || 'Failed to remove part';
                        toast.error(errorMessage);
                        console.error('Remove part error:', error);
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              ))}
              {(!job.resources?.requiredParts || job.resources?.requiredParts?.length === 0) && (
                <span className="text-gray-500 text-sm">No parts assigned</span>
              )}
            </div>
          </div>

            </div>
          </div>





      {/* Action Buttons */}
      <div className="bg-gray-50 border-t border-gray-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            Resource assignments are saved automatically when you assign them
          </div>
          <Button variant="outline" onClick={onCancel} className="px-6">
          Close
        </Button>
        </div>
      </div>
    </div>
  );
};

// Add Task Form Component
const AddTaskForm: React.FC<{
  job: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ job, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimatedDuration: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Task Title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
        />
        <TextArea
          label="Description"
          value={formData.description}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
        <Select
          label="Priority"
          value={formData.priority}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]}
        />
        <Input
          label="Estimated Duration (minutes)"
          type="number"
          value={formData.estimatedDuration}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Add Task
        </Button>
      </div>
    </form>
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
            {job.resources?.assignedTechnicians?.map((tech: any, index: number) => (
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
            {job.tasks?.map((task: any, index: number) => (
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

// Assign Resources Form Component
const AssignResourcesForm: React.FC<{
  job: any;
  onAssignTechnician: (jobId: string, technicianId: string, role: string) => void;
  onCancel: () => void;
}> = ({ job, onAssignTechnician, onCancel }) => {
  const queryClient = useQueryClient();
  
  // Multiple selection states
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  
  // Additional states for tools and machines
  const [toolExpectedReturn, setToolExpectedReturn] = useState('');
  const [machineBookingUntil, setMachineBookingUntil] = useState('');
  
  // Single machine selection state
  const [selectedMachineId, setSelectedMachineId] = useState('');
  
  // Loading state for bulk operations
  const [isUpdating, setIsUpdating] = useState(false);

  // Fetch available technicians
  const { data: techniciansData, error: techniciansError, isLoading: techniciansLoading } = useQuery({
    queryKey: ['available-technicians'],
    queryFn: () => api.get('/technicians/available'),
  });

  // Fetch available tools
  const { data: availableToolsData, error: toolsError, isLoading: toolsLoading } = useQuery({
    queryKey: ['available-tools'],
    queryFn: () => api.get('/workshop/available-tools'),
  });

  // Fetch available machines
  const { data: availableMachinesData, error: machinesError, isLoading: machinesLoading } = useQuery({
    queryKey: ['available-machines'],
    queryFn: () => api.get('/workshop/available-machines'),
  });

  const technicians = techniciansData?.data?.technicians || [];
  const availableTools = availableToolsData?.data?.data || [];
  const availableMachines = availableMachinesData?.data?.data || [];

  // Filter out already assigned technicians
  const assignedTechnicianIds = job.resources?.assignedTechnicians?.map((tech: any) => tech.technicianId) || [];
  const availableTechnicians = technicians.filter((tech: any) => !assignedTechnicianIds.includes(tech._id));

  // Filter out already assigned tools
  const assignedToolIds = job.tools?.map((tool: any) => tool.toolId) || [];
  const availableToolsFiltered = availableTools.filter((tool: any) => !assignedToolIds.includes(tool._id));

  // Filter out already assigned machines
  const assignedMachineIds = job.resources?.requiredMachines?.map((machine: any) => machine.machineId) || [];
  const availableMachinesFiltered = availableMachines.filter((machine: any) => !assignedMachineIds.includes(machine._id));

  // Helper functions for multiple selections
  const toggleTechnicianSelection = (technicianId: string) => {
    setSelectedTechnicians(prev => 
      prev.includes(technicianId) 
        ? prev.filter(id => id !== technicianId)
        : [...prev, technicianId]
    );
  };

  const toggleToolSelection = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const addMachine = () => {
    if (selectedMachineId && machineBookingUntil) {
      setSelectedMachines(prev => [...prev, selectedMachineId]);
      setSelectedMachineId('');
      setMachineBookingUntil('');
    }
  };


  const clearAllSelections = () => {
    setSelectedTechnicians([]);
    setSelectedTools([]);
    setSelectedMachines([]);
    setToolExpectedReturn('');
    setMachineBookingUntil('');
    setSelectedMachineId('');
  };

  // Bulk assignment function
  const handleBulkAssign = async () => {
    if (selectedTechnicians.length === 0 && selectedTools.length === 0 && selectedMachines.length === 0) {
      toast.error('Please select at least one resource to assign');
      return;
    }

    setIsUpdating(true);
    try {
      const promises = [];

      // Assign technicians
      for (const technicianId of selectedTechnicians) {
        promises.push(onAssignTechnician(job._id, technicianId, 'technician'));
      }

      // Assign tools
      for (const toolId of selectedTools) {
        promises.push(
      api.post(`/workshop/${job._id}/assign-tool`, {
            toolId,
        expectedReturn: toolExpectedReturn
          })
        );
      }

      // Book machines
      for (const machineId of selectedMachines) {
        promises.push(
          api.post(`/workshop/${job._id}/book-machine`, {
            machineId,
            until: machineBookingUntil
          })
        );
      }

      await Promise.all(promises);
      
      toast.success(`Successfully assigned ${selectedTechnicians.length} technicians, ${selectedTools.length} tools, and ${selectedMachines.length} machines`);
      
      // Clear selections and refresh data
      clearAllSelections();
      queryClient.invalidateQueries({ queryKey: ['available-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['available-machines'] });
        queryClient.invalidateQueries({ queryKey: ['available-tools'] });
        queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign resources';
      toast.error(errorMessage);
      console.error('Bulk assignment error:', error);
    } finally {
      setIsUpdating(false);
    }
  };


  return (
    <div className="space-y-6">
      {/* Job Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Job: {job.jobNumber}</h3>
        <p className="text-sm text-gray-600">Customer: {job.customerName}</p>
        <p className="text-sm text-gray-600">Status: {job.status}</p>
      </div>

      {/* Assign Technicians */}
      {availableTechnicians.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Assign Technicians</h3>
            <span className="text-sm text-gray-500">
              {selectedTechnicians.length} selected
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
            {availableTechnicians.map((tech: any) => (
              <label key={tech._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedTechnicians.includes(tech._id)}
                  onChange={() => toggleTechnicianSelection(tech._id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {tech.name || (tech.user ? `${tech.user.firstName} ${tech.user.lastName}` : tech.employeeId || 'Technician')}
                  </p>
                  <p className="text-xs text-gray-500">{tech.position} - {tech.department}</p>
                </div>
              </label>
            ))}
          </div>
            {techniciansError && (
              <p className="text-red-600 text-sm">Error loading technicians: {techniciansError.message}</p>
            )}
        </div>
      )}

      {/* All Technicians Assigned Message */}
      {!techniciansLoading && availableTechnicians.length === 0 && technicians.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                All technicians are already assigned to this job. You can remove technicians from the "Current Assignments" section below if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Assign Tools */}
      {availableToolsFiltered.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Assign Tools</h3>
            <span className="text-sm text-gray-500">
              {selectedTools.length} selected
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
            {availableToolsFiltered.map((tool: any) => (
              <label key={tool._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                  checked={selectedTools.includes(tool._id)}
                  onChange={() => toggleToolSelection(tool._id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{tool.name}</p>
                  <p className="text-xs text-gray-500">
                    {tool.toolNumber && `${tool.toolNumber} • `}
                    {tool.category} • {tool.condition}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              type="datetime-local"
              label="Expected Return Date (for all selected tools)"
              value={toolExpectedReturn}
              onChange={(e) => setToolExpectedReturn(e.target.value)}
              placeholder="Expected Return Date"
              disabled={selectedTools.length === 0}
            />
          </div>
          {toolsError && (
            <p className="text-red-600 text-sm">Error loading tools: {toolsError.message}</p>
          )}
        </div>
      )}

      {/* All Tools Assigned Message */}
      {!toolsLoading && availableToolsFiltered.length === 0 && availableTools.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                All tools are already assigned to this job. You can return tools from the "Current Assignments" section below if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Book Machines */}
      {availableMachinesFiltered.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Book Machine</h3>
          <div className="flex gap-2">
            <Select
              label="Select Machine"
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
              disabled={machinesLoading}
              options={[
                { value: '', label: machinesLoading ? 'Loading...' : 'Select Machine...' },
                ...(Array.isArray(availableMachinesFiltered) ? availableMachinesFiltered.map((machine: any) => ({
                  value: machine._id,
                  label: `${machine.name} (${machine.model || 'N/A'} • ${machine.category})`
                })) : [])
              ]}
            />
            <Input
              type="datetime-local"
              label="Book Until"
              value={machineBookingUntil}
              onChange={(e) => setMachineBookingUntil(e.target.value)}
              className="w-48"
            />
            <Button
              type="button"
              onClick={addMachine}
              disabled={!selectedMachineId || !machineBookingUntil}
              className="self-end"
            >
              Book
            </Button>
          </div>
          {machinesError && (
            <p className="text-red-600 text-sm">Error loading machines: {machinesError.message}</p>
          )}
        </div>
      )}

      {/* All Machines Booked Message */}
      {!machinesLoading && availableMachinesFiltered.length === 0 && availableMachines.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                All machines are already booked for this job. You can release machines from the "Current Assignments" section below if needed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assignment Actions */}
      {(selectedTechnicians.length > 0 || selectedTools.length > 0 || selectedMachines.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Ready to Assign</h3>
              <p className="text-sm text-blue-700 mt-1">
                {selectedTechnicians.length} technician{selectedTechnicians.length !== 1 ? 's' : ''}, {' '}
                {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''}, and {' '}
                {selectedMachines.length} machine{selectedMachines.length !== 1 ? 's' : ''} selected
              </p>
              {(selectedTools.length > 0 || selectedMachines.length > 0) && (
                <p className="text-xs text-blue-600 mt-2">
                  {selectedTools.length > 0 && `Tools return date: ${toolExpectedReturn || 'Not set'}`}
                  {selectedTools.length > 0 && selectedMachines.length > 0 && ' • '}
                  {selectedMachines.length > 0 && `Machines book until: ${machineBookingUntil || 'Not set'}`}
                </p>
              )}
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={clearAllSelections}
                disabled={isUpdating}
              >
                Clear All
              </Button>
              <Button
                onClick={handleBulkAssign}
                disabled={isUpdating || (selectedTools.length > 0 && !toolExpectedReturn) || (selectedMachines.length > 0 && !machineBookingUntil)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isUpdating ? 'Assigning...' : 'Update All'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Current Assignments */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Current Assignments</h3>
        
        {/* Assigned Technicians */}
        {job.resources?.assignedTechnicians?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Technicians:</h4>
            {job.resources.assignedTechnicians.map((tech: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">
                  {tech.technician?.user?.firstName} {tech.technician?.user?.lastName} - {tech.role}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    api.put(`/workshop/${job._id}/remove-technician`, {
                      technicianId: tech.technician._id
                    }).then(() => {
                      toast.success('Technician removed successfully');
                    }).catch((error) => {
                      const errorMessage = error.response?.data?.message || error.message || 'Failed to remove technician';
                      toast.error(errorMessage);
                      console.error('Remove technician error:', error);
                    });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Assigned Tools */}
        {job.tools?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Tools:</h4>
            {job.tools.map((tool: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">
                  {tool.toolName} - Expected Return: {tool.expectedReturn}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    api.post(`/workshop/${job._id}/return-tool`, {
                      toolId: tool.toolId
                    }).then(() => {
                      toast.success('Tool returned successfully');
                    }).catch((error) => {
                      toast.error(error.response?.data?.message || 'Failed to return tool');
                    });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Return
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Booked Machines */}
        {job.resources?.requiredMachines?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-gray-700">Booked Machines:</h4>
            {job.resources.requiredMachines.map((machine: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm">
                  {machine.name} - Booked Until: {machine.requiredUntil ? new Date(machine.requiredUntil).toLocaleDateString() : 'Not set'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // Call API to release machine
                    api.post(`/workshop/${job._id}/release-machine`, {
                      machineId: machine.machineId
                    }).then(() => {
                      toast.success('Machine released successfully');
                      // Refresh the page or update the job data
                      window.location.reload();
                    }).catch((error) => {
                      const errorMessage = error.response?.data?.message || error.message || 'Failed to release machine';
                      toast.error(errorMessage);
                      console.error('Release machine error:', error);
                    });
                  }}
                  className="text-red-600 hover:text-red-700"
                >
                  Release
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-3">
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
      </div>
    </div>
  );
};

// Work Progress Visualization Component
const WorkProgressVisualizationComponent: React.FC<{ job: any }> = ({ job }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(job.progress || 0);
  
  const workSteps = [
    { id: 1, name: 'Job Received', description: 'Job request received and logged', status: 'completed' },
    { id: 2, name: 'Assessment', description: 'Initial assessment and diagnosis', status: 'completed' },
    { id: 3, name: 'Resource Assignment', description: 'Assign technicians and tools', status: job.resources?.assignedTechnicians?.length > 0 ? 'completed' : 'pending' },
    { id: 4, name: 'Work Started', description: 'Work in progress', status: job.status === 'in_progress' ? 'in_progress' : 'pending' },
    { id: 5, name: 'Quality Check', description: 'Quality inspection and testing', status: 'pending' },
    { id: 6, name: 'Completion', description: 'Job completed and delivered', status: job.status === 'completed' ? 'completed' : 'pending' }
  ];

  const updateProgress = (stepIndex: number) => {
    const newProgress = Math.round(((stepIndex + 1) / workSteps.length) * 100);
    setProgress(newProgress);
    setCurrentStep(stepIndex);
    
    // Update progress in backend
    api.put(`/workshop/${job._id}/progress`, { progress: newProgress })
      .then(() => {
        toast.success('Progress updated successfully');
      })
      .catch((error) => {
        toast.error('Failed to update progress');
        console.error('Progress update error:', error);
      });
  };

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

  return (
    <div className="space-y-6">
      {/* Job Overview */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">Job: {job.jobNumber}</h3>
        <p className="text-sm text-gray-600">Customer: {job.customer?.firstName} {job.customer?.lastName}</p>
        <p className="text-sm text-gray-600">Status: {job.status}</p>
        <p className="text-sm text-gray-600">Priority: {job.priority}</p>
      </div>

      {/* Progress Overview */}
      <div className="bg-white p-4 rounded-lg border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Overall Progress</h3>
          <span className="text-2xl font-bold text-blue-600">{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Work Steps */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">Work Steps</h3>
        {workSteps.map((step, index) => (
          <div key={step.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border">
            {/* Step Number */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-medium ${getStepColor(step.status)}`}>
              {step.status === 'completed' ? '✓' : step.id}
            </div>
            
            {/* Step Content */}
            <div className="flex-1">
              <h4 className={`font-medium ${getStepTextColor(step.status)}`}>
                {step.name}
              </h4>
              <p className="text-sm text-gray-600">{step.description}</p>
            </div>
            
            {/* Action Button */}
            {step.status === 'pending' && index === currentStep && (
              <Button
                size="sm"
                onClick={() => updateProgress(index)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Mark Complete
              </Button>
            )}
            
            {/* Status Badge */}
            <div className="flex items-center">
              <Badge 
                color={
                  step.status === 'completed' ? 'green' : 
                  step.status === 'in_progress' ? 'blue' : 'gray'
                }
              >
                {step.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Resource Status */}
      <div className="bg-white p-4 rounded-lg border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Resource Status</h3>
        
        {/* Assigned Technicians */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Technicians</h4>
          {job.resources?.assignedTechnicians?.length > 0 ? (
            <div className="space-y-2">
              {job.resources.assignedTechnicians.map((tech: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-green-50 rounded">
                  <span className="text-sm font-medium text-green-800">{tech.name}</span>
                  <Badge color="green">Assigned</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No technicians assigned</p>
          )}
        </div>

        {/* Assigned Tools */}
        <div className="mb-4">
          <h4 className="font-medium text-gray-700 mb-2">Tools</h4>
          {job.tools?.length > 0 ? (
            <div className="space-y-2">              
              {job.tools.map((tool: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                  <span className="text-sm font-medium text-blue-800">{tool.name}</span>
                  <Badge color="blue">In Use</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No tools assigned</p>
          )}
        </div>

        {/* Assigned Machines */}
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Machines</h4>
          {job.resources?.requiredMachines?.length > 0 ? (
            <div className="space-y-2">
              {job.resources.requiredMachines.map((machine: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-2 bg-purple-50 rounded">
                  <span className="text-sm font-medium text-purple-800">{machine.name}</span>
                  <Badge color="purple">Booked</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No machines booked</p>
          )}
        </div>
      </div>

      {/* Customer Portal Connection */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">Customer Portal Integration</h4>
            <p className="text-sm text-blue-700 mt-1">
              This progress is automatically shared with the customer through the customer portal. 
              Customers can view real-time updates of their job progress.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkshopPage;
