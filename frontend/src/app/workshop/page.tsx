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
import { WorkshopJob } from '@/types';
import { enhancedWorkshopAPI, techniciansAPI, machinesAPI, toolsAPI, workstationsAPI, customersAPI, productsAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  ClipboardDocumentListIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  WrenchScrewdriverIcon,
  CogIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon
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

  const jobs = jobsData?.data?.data?.jobs || [];
  const pagination = jobsData?.data?.data?.pagination || {};
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

  // Assign technician mutation
  const assignTechnicianMutation = useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: any }) => 
      enhancedWorkshopAPI.assignTechnician(jobId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      toast.success('Technician assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign technician');
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
    onSuccess: (response) => {
      const { allPartsAvailable } = response.data.data;
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
      updateJobMutation.mutate({
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

  const handleBookMachine = (jobId: string, machineId: string, until: string) => {
    bookMachineMutation.mutate({
      jobId,
      data: { machineId, until }
    });
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
      render: (job: any) => (
        <span className="text-sm text-gray-900">
          {job.customer?.firstName} {job.customer?.lastName}
        </span>
      )
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
          {job.status.replace('_', ' ')}
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
          {job.resources?.assignedTechnicians?.length > 2 && (
            <Badge color="gray" size="sm">
              +{job.resources.assignedTechnicians.length - 2}
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
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsDetailsOpen(true);
            }}
          >
            <EyeIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsEditOpen(true);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsResourceModalOpen(true);
            }}
          >
            <WrenchScrewdriverIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsTaskModalOpen(true);
            }}
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCheckParts(job._id)}
          >
            <CheckCircleIcon className="h-4 w-4" />
          </Button>
          {job.status === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteJob(job._id)}
              className="text-green-600 hover:text-green-700"
            >
              Complete
            </Button>
          )}
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
          {hasPermission('workshop', 'create') && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Create Job
            </Button>
          )}
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
              page: pagination.current || 1,
              limit: pagination.pages || 10,
              total: pagination.total || 0,
              pages: Math.ceil((pagination.total || 0) / (pagination.pages || 10))
            }}
          />
        </div>
      </div>

      {/* Create Job Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Job"
      >
        <CreateJobForm
          onSubmit={handleCreateJob}
          onCancel={() => setIsCreateOpen(false)}
          loading={createJobMutation.isPending}
        />
      </Modal>

      {/* Edit Job Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedJob(null);
        }}
        title="Edit Job"
      >
        {selectedJob && (
          <EditJobForm
            job={selectedJob}
            onSubmit={handleUpdateJob}
            onCancel={() => {
              setIsEditOpen(false);
              setSelectedJob(null);
            }}
            loading={updateJobMutation.isPending}
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
      >
        {selectedJob && (
          <ResourceManagementForm
            job={selectedJob}
            onAssignTechnician={handleAssignTechnician}
            onBookMachine={handleBookMachine}
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
    vehicle: {
      make: '',
      model: '',
      regNumber: '',
      vinNumber: ''
    },
    repairRequest: ''
  });

  // Fetch customers for dropdown
  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersAPI.getCustomers({ limit: 100 }),
  });

  const customers = customersData?.data?.data?.customers || [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Job Title"
          value={formData.title}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
          required
        />
        <Select
          label="Priority"
          value={formData.priority}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('priority', e.target.value)}
          required
          options={[
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ]}
        />
        <Select
          label="Customer"
          value={formData.customer}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleInputChange('customer', e.target.value)}
          required
          options={[
            { value: '', label: 'Select Customer' },
            ...customers.map((customer: any) => ({
              value: customer._id,
              label: `${customer.firstName} ${customer.lastName}`
            }))
          ]}
        />
        <Input
          label="Customer Phone"
          value={formData.customerPhone}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('customerPhone', e.target.value)}
          required
        />
        <Input
          label="Deadline"
          type="date"
          value={formData.deadline}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('deadline', e.target.value)}
        />
        <Input
          label="Vehicle Make"
          value={formData.vehicle.make}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicle.make', e.target.value)}
        />
        <Input
          label="Vehicle Model"
          value={formData.vehicle.model}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicle.model', e.target.value)}
        />
        <Input
          label="Registration Number"
          value={formData.vehicle.regNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicle.regNumber', e.target.value)}
        />
        <Input
          label="VIN Number"
          value={formData.vehicle.vinNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('vehicle.vinNumber', e.target.value)}
        />
      </div>
      <TextArea
        label="Description"
        value={formData.description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
        rows={3}
      />
      <TextArea
        label="Repair Request"
        value={formData.repairRequest}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('repairRequest', e.target.value)}
        rows={3}
      />

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Create Job
        </Button>
      </div>
    </form>
  );
};

// Edit Job Form Component
const EditJobForm: React.FC<{
  job: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ job, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    title: job.title || '',
    description: job.description || '',
    priority: job.priority || 'medium',
    status: job.status || 'draft',
    deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
    progress: job.progress || 0
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
      </div>
      <TextArea
        label="Description"
        value={formData.description}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData(prev => ({ ...prev, description: e.target.value }))}
        rows={3}
      />

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Update Job
        </Button>
      </div>
    </form>
  );
};

// Resource Management Form Component
const ResourceManagementForm: React.FC<{
  job: any;
  onAssignTechnician: (jobId: string, technicianId: string, role: string) => void;
  onBookMachine: (jobId: string, machineId: string, until: string) => void;
  onCancel: () => void;
}> = ({ job, onAssignTechnician, onBookMachine, onCancel }) => {
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [selectedMachine, setSelectedMachine] = useState('');
  const [bookingUntil, setBookingUntil] = useState('');

  // Fetch available technicians
  const { data: techniciansData } = useQuery({
    queryKey: ['available-technicians'],
    queryFn: () => techniciansAPI.getTechnicians({ available: 'true' }),
  });

  // Fetch available machines
  const { data: machinesData } = useQuery({
    queryKey: ['available-machines'],
    queryFn: () => machinesAPI.getMachines({ available: 'true' }),
  });

  const technicians = techniciansData?.data?.data?.technicians || [];
  const machines = machinesData?.data?.data?.machines || [];

  const handleAssignTechnician = () => {
    if (selectedTechnician) {
      onAssignTechnician(job._id, selectedTechnician, 'technician');
      setSelectedTechnician('');
    }
  };

  const handleBookMachine = () => {
    if (selectedMachine && bookingUntil) {
      onBookMachine(job._id, selectedMachine, bookingUntil);
      setSelectedMachine('');
      setBookingUntil('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Resources */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Current Resources</h3>
        <div className="space-y-4">
          {/* Assigned Technicians */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Assigned Technicians</h4>
            <div className="flex flex-wrap gap-2">
              {job.resources?.assignedTechnicians?.map((tech: any, index: number) => (
                <Badge key={index} color="blue">
                  {tech.name} ({tech.role})
                </Badge>
              ))}
              {(!job.resources?.assignedTechnicians || job.resources.assignedTechnicians.length === 0) && (
                <span className="text-gray-500 text-sm">No technicians assigned</span>
              )}
            </div>
          </div>

          {/* Required Machines */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Required Machines</h4>
            <div className="flex flex-wrap gap-2">
              {job.resources?.requiredMachines?.map((machine: any, index: number) => (
                <Badge key={index} color="green">
                  {machine.name}
                </Badge>
              ))}
              {(!job.resources?.requiredMachines || job.resources.requiredMachines.length === 0) && (
                <span className="text-gray-500 text-sm">No machines booked</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Resources */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Add Resources</h3>
        <div className="space-y-4">
          {/* Assign Technician */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assign Technician</label>
            <div className="flex gap-2">
              <Select
                value={selectedTechnician}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedTechnician(e.target.value)}
                className="flex-1"
                options={[
                  { value: '', label: 'Select Technician' },
                  ...technicians.map((tech: any) => ({
                    value: tech._id,
                    label: `${tech.user?.firstName} ${tech.user?.lastName} - ${tech.position}`
                  }))
                ]}
              />
              <Button onClick={handleAssignTechnician} disabled={!selectedTechnician}>
                Assign
              </Button>
            </div>
          </div>

          {/* Book Machine */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Book Machine</label>
            <div className="flex gap-2">
              <Select
                value={selectedMachine}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedMachine(e.target.value)}
                className="flex-1"
                options={[
                  { value: '', label: 'Select Machine' },
                  ...machines.map((machine: any) => ({
                    value: machine._id,
                    label: `${machine.name} - ${machine.category}`
                  }))
                ]}
              />
              <Input
                type="datetime-local"
                value={bookingUntil}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBookingUntil(e.target.value)}
                placeholder="Until"
                className="w-48"
              />
              <Button onClick={handleBookMachine} disabled={!selectedMachine || !bookingUntil}>
                Book
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline" onClick={onCancel}>
          Close
        </Button>
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

export default WorkshopPage;
