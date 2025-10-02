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
import { enhancedWorkshopAPI, techniciansAPI, machinesAPI, toolsAPI, workstationsAPI, customersAPI, productsAPI } from '@/lib/api';
import api from '@/lib/api';
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
  EyeIcon,
  ChartBarIcon,
  DocumentTextIcon,
  ChatBubbleLeftRightIcon
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsDetailsOpen(true);
            }}
            title="View Details"
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
            title="Edit Job"
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsJobCardModalOpen(true);
            }}
            title="Job Card"
          >
            <DocumentTextIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsProgressModalOpen(true);
            }}
            title="Progress View"
          >
            <ChartBarIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsResourceModalOpen(true);
            }}
            title="Manage Resources"
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
            title="Manage Tasks"
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCheckParts(job._id)}
            title="Check Parts"
          >
            <CheckCircleIcon className="h-4 w-4" />
          </Button>
          {job.status === 'in_progress' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleCompleteJob(job._id)}
              className="text-green-600 hover:text-green-700"
              title="Complete Job"
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
        size="xl"
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
    // Technician Information
    technicians: {
      primary: '',
      secondary: ''
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
    tools: [] as Array<{
      tool: string;
      toolName: string;
      quantity: number;
      notes: string;
    }>,
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

  // Fetch technicians for dropdown
  const { data: techniciansData } = useQuery({
    queryKey: ['technicians'],
    queryFn: () => api.get('/technicians'),
  });

  // Fetch tools for dropdown
  const { data: toolsData } = useQuery({
    queryKey: ['tools'],
    queryFn: () => api.get('/tools'),
  });

  const customers = customersData?.data?.data || [];
  const technicians = techniciansData?.data?.data?.technicians || [];
  const tools = toolsData?.data?.data?.tools || [];

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
    <form onSubmit={handleSubmit} className="space-y-8">
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
              value={formData.customer}
              onChange={handleCustomerSelect}
              label="Select Customer"
              placeholder="Search customers by name, email, phone..."
              required
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Order Number"
                value={formData.customerInfo.orderNumber}
                onChange={(e) => handleInputChange('customerInfo.orderNumber', e.target.value)}
              />
              <Input
                label="Service Date"
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
                    <span className="ml-2 font-medium">{formData.selectedCustomer.firstName} {formData.selectedCustomer.lastName}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2 font-medium">{formData.selectedCustomer.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2 font-medium">{formData.selectedCustomer.email || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Company:</span>
                    <span className="ml-2 font-medium">{formData.selectedCustomer.company || 'N/A'}</span>
                  </div>
                </div>
                {formData.selectedCustomer.address && (
                  <div className="mt-2">
                    <span className="text-gray-600">Address:</span>
                    <span className="ml-2 font-medium">{formData.selectedCustomer.address}</span>
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
                value={formData.vehicle.make}
                onChange={(e) => handleInputChange('vehicle.make', e.target.value)}
              />
              <Input
                label="Model"
                value={formData.vehicle.model}
                onChange={(e) => handleInputChange('vehicle.model', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Registration Number"
                value={formData.vehicle.regNumber}
                onChange={(e) => handleInputChange('vehicle.regNumber', e.target.value)}
              />
              <Input
                label="VIN Number"
                value={formData.vehicle.vinNumber}
                onChange={(e) => handleInputChange('vehicle.vinNumber', e.target.value)}
              />
            </div>
            <Input
              label="Odometer Reading"
              value={formData.vehicle.odometer}
              onChange={(e) => handleInputChange('vehicle.odometer', e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Primary Technician"
                value={formData.technicians.primary}
                onChange={(e) => handleInputChange('technicians.primary', e.target.value)}
                options={[
                  { value: '', label: 'Select Primary Technician' },
                  ...technicians.map((technician: any) => ({
                    value: technician._id,
                    label: `${technician.firstName} ${technician.lastName}`
                  }))
                ]}
              />
              <Select
                label="Secondary Technician"
                value={formData.technicians.secondary}
                onChange={(e) => handleInputChange('technicians.secondary', e.target.value)}
                options={[
                  { value: '', label: 'Select Secondary Technician' },
                  ...technicians.map((technician: any) => ({
                    value: technician._id,
                    label: `${technician.firstName} ${technician.lastName}`
                  }))
                ]}
              />
            </div>
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
                type="datetime-local"
                value={formData.timeInfo.timeIn}
                onChange={(e) => handleInputChange('timeInfo.timeIn', e.target.value)}
              />
              <Input
                label="Expected Collection"
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
                  value={sublet.description}
                  onChange={(e) => updateSublet(index, 'description', e.target.value)}
                  placeholder="Sublet description..."
                />
              </div>
              <div className="md:col-span-3">
                <Input
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

      {/* Tools Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Required Tools</h3>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Select Tool"
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  const selectedTool = tools.find((tool: any) => tool._id === e.target.value);
                  if (selectedTool && !formData.tools.some((t: any) => t.tool === e.target.value)) {
                    setFormData(prev => ({
                      ...prev,
                      tools: [...prev.tools, {
                        tool: selectedTool._id,
                        toolName: selectedTool.name,
                        quantity: 1,
                        notes: ''
                      }]
                    }));
                  }
                }
              }}
              options={[
                { value: '', label: 'Add a tool...' },
                ...tools.map((tool: any) => ({
                  value: tool._id,
                  label: tool.name
                }))
              ]}
            />
          </div>
          {formData.tools.length > 0 && (
            <div className="space-y-2">
              {formData.tools.map((tool: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{tool.toolName}</span>
                    <div className="flex items-center space-x-4 mt-1">
                      <Input
                        type="number"
                        min="1"
                        value={tool.quantity}
                        onChange={(e) => {
                          const newTools = [...formData.tools];
                          newTools[index].quantity = parseInt(e.target.value) || 1;
                          setFormData(prev => ({ ...prev, tools: newTools }));
                        }}
                        className="w-20"
                        placeholder="Qty"
                      />
                      <Input
                        value={tool.notes}
                        onChange={(e) => {
                          const newTools = [...formData.tools];
                          newTools[index].notes = e.target.value;
                          setFormData(prev => ({ ...prev, tools: newTools }));
                        }}
                        placeholder="Notes (optional)"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    onClick={() => {
                      const newTools = formData.tools.filter((_: any, i: number) => i !== index);
                      setFormData(prev => ({ ...prev, tools: newTools }));
                    }}
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
          )}
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
        <Button type="submit" loading={loading} disabled={!formData.termsAccepted}>
          Create Job Card
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

  const technicians = techniciansData?.data?.technicians || [];
  const machines = machinesData?.data?.machines || [];

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
              {(!job.resources?.assignedTechnicians || job.resources?.assignedTechnicians?.length === 0) && (
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
              {(!job.resources?.requiredMachines || job.resources?.requiredMachines?.length === 0) && (
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

export default WorkshopPage;
