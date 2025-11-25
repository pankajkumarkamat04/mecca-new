'use client';

import React, { useState, useEffect } from 'react';
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
import FormProductSelector from '@/components/ui/FormProductSelector';
import ServiceTemplateSelector from '@/components/workshop/ServiceTemplateSelector';
import { WorkshopJob } from '@/types';
import { enhancedWorkshopAPI, workstationsAPI, customersAPI, productsAPI, machinesAPI, toolsAPI } from '@/lib/api';
import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { generateJobCardPDF } from '@/lib/jobCardUtils';
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
  CubeIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/outline';

// Comprehensive Task Management Modal Component
const TaskManagementModal: React.FC<{
  job: any;
  onClose: () => void;
  addTaskMutation: any;
  updateTaskStatusMutation: any;
}> = ({ job, onClose, addTaskMutation, updateTaskStatusMutation }) => {
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [editingTask, setEditingTask] = useState<any>(null);
  const [editTaskData, setEditTaskData] = useState({
    actualDuration: '',
    notes: ''
  });
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimatedDuration: '',
    assignee: '',
    notes: ''
  });

  // Fetch fresh job data to ensure tasks are up-to-date
  const { data: jobData, isLoading: isJobLoading, refetch } = useQuery({
    queryKey: ['workshop-job', job._id],
    queryFn: () => enhancedWorkshopAPI.getJobById(job._id),
    refetchOnWindowFocus: false,
    staleTime: 0,
  });

  const currentJob = jobData?.data?.data || job;

  // Fetch available technicians for task assignment
  const { data: techniciansData } = useQuery({
    queryKey: ['available-technicians'],
    queryFn: () => enhancedWorkshopAPI.getAvailableResources(currentJob._id, 'technicians'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const availableTechnicians = techniciansData?.data?.data?.technicians || [];

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }

    try {
      await addTaskMutation.mutateAsync({
        jobId: currentJob._id,
        data: {
          title: newTask.title,
          description: newTask.description,
          priority: newTask.priority,
          estimatedDuration: parseFloat(newTask.estimatedDuration) || 0,
          assignee: newTask.assignee || undefined,
          notes: newTask.notes || undefined
        }
      });
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        estimatedDuration: '',
        assignee: '',
        notes: ''
      });
      setIsAddingTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    try {
      await updateTaskStatusMutation.mutateAsync({
        jobId: currentJob._id,
        taskId,
        data: { status }
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'gray';
      case 'in_progress': return 'orange';
      case 'completed': return 'green';
      case 'on_hold': return 'yellow';
      case 'overdue': return 'red';
      default: return 'gray';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'gray';
      default: return 'gray';
    }
  };

  const formatDuration = (hours: number) => {
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    const wholeHours = Math.floor(hours);
    const remainingMinutes = Math.round((hours - wholeHours) * 60);
    return remainingMinutes > 0 ? `${wholeHours}h ${remainingMinutes}m` : `${wholeHours}h`;
  };

  if (isJobLoading && !jobData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Job Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{currentJob.title}</h2>
          <div className="flex items-center gap-2">
            <Badge color={getStatusColor(currentJob.status)}>
              {currentJob.status.replace('_', ' ')}
            </Badge>
            <span className="text-sm text-gray-600">
              {currentJob.progress || 0}% Complete
            </span>
          </div>
        </div>
        {currentJob.description && (
          <p className="text-gray-600">{currentJob.description}</p>
        )}
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-gray-900">
            {currentJob.tasks?.length || 0}
          </div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">
            {currentJob.tasks?.filter((t: any) => t.status === 'todo').length || 0}
          </div>
          <div className="text-sm text-blue-600">Pending</div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-orange-600">
            {currentJob.tasks?.filter((t: any) => t.status === 'in_progress').length || 0}
          </div>
          <div className="text-sm text-orange-600">In Progress</div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-2xl font-bold text-green-600">
            {currentJob.tasks?.filter((t: any) => t.status === 'completed').length || 0}
          </div>
          <div className="text-sm text-green-600">Completed</div>
        </div>
      </div>

      {/* Add Task Section */}
      {!isAddingTask ? (
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
          <Button
            onClick={() => setIsAddingTask(true)}
            disabled={currentJob.status === 'completed'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Task</h3>
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingTask(false);
                setNewTask({
                  title: '',
                  description: '',
                  priority: 'medium',
                  estimatedDuration: '',
                  assignee: '',
                  notes: ''
                });
              }}
            >
              Cancel
            </Button>
          </div>
          
          <form onSubmit={handleAddTask} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Task Title *"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
                required
              />
              <Select
                label="Priority"
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' },
                  { value: 'urgent', label: 'Urgent' }
                ]}
              />
            </div>
            
            <TextArea
              label="Description"
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
              rows={3}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Estimated Duration (hours)"
                type="number"
                step="0.5"
                value={newTask.estimatedDuration}
                onChange={(e) => setNewTask(prev => ({ ...prev, estimatedDuration: e.target.value }))}
                placeholder="Enter duration in hours"
              />
              <Select
                label="Assign to Technician"
                value={newTask.assignee}
                onChange={(e) => setNewTask(prev => ({ ...prev, assignee: e.target.value }))}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...availableTechnicians.map((tech: any) => ({
                    value: tech._id,
                    label: tech.user ? `${tech.user.firstName} ${tech.user.lastName}` : tech.employeeId
                  }))
                ]}
              />
            </div>
            
            <TextArea
              label="Notes"
              value={newTask.notes}
              onChange={(e) => setNewTask(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or instructions"
              rows={2}
            />
            
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddingTask(false);
                  setNewTask({
                    title: '',
                    description: '',
                    priority: 'medium',
                    estimatedDuration: '',
                    assignee: '',
                    notes: ''
                  });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={addTaskMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                Add Task
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm mb-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Edit Task: {editingTask.title}
          </h3>
          <form onSubmit={async (e) => {
            e.preventDefault();
            try {
              await updateTaskStatusMutation.mutateAsync({
                jobId: currentJob._id,
                taskId: editingTask._id,
                data: {
                  status: editingTask.status,
                  actualDuration: parseFloat(editTaskData.actualDuration) || 0,
                  notes: editTaskData.notes
                }
              });
              setEditingTask(null);
              setEditTaskData({ actualDuration: '', notes: '' });
              toast.success('Task updated successfully');
            } catch (error) {
              console.error('Error updating task:', error);
              toast.error('Failed to update task');
            }
          }}>
            <Input
              label="Actual Duration (hours)"
              type="number"
              step="0.5"
              value={editTaskData.actualDuration}
              onChange={(e) => setEditTaskData(prev => ({ ...prev, actualDuration: e.target.value }))}
              placeholder="Enter actual time taken"
            />
            <TextArea
              label="Notes"
              value={editTaskData.notes}
              onChange={(e) => setEditTaskData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes"
              rows={2}
              className="mt-4"
            />
            <div className="flex flex-col gap-2 mt-4 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditingTask(null);
                  setEditTaskData({ actualDuration: '', notes: '' });
                }}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                loading={updateTaskStatusMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
              >
                Update Task
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tasks List */}
      <div className="space-y-4">
        {currentJob.tasks?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ClipboardDocumentListIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm">Add tasks to organize the work steps for this job</p>
          </div>
        ) : (
          currentJob.tasks?.map((task: any, index: number) => (
            <div key={task._id || index} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-lg font-medium text-gray-900">{task.title}</h4>
                    <Badge color={getStatusColor(task.status)}>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    <Badge color={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-3">{task.description}</p>
                  )}
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    {task.estimatedDuration > 0 && (
                      <div className="flex items-center text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>Est. {formatDuration(task.estimatedDuration)}</span>
                      </div>
                    )}
                    
                    {task.actualDuration > 0 && (
                      <div className="flex items-center text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>Actual: {formatDuration(task.actualDuration)}</span>
                      </div>
                    )}
                    
                    {task.assignee && (
                      <div className="flex items-center text-gray-600">
                        <UserIcon className="h-4 w-4 mr-2" />
                        <span>
                          {task.assignee.firstName ? 
                            `${task.assignee.firstName} ${task.assignee.lastName}` : 
                            'Assigned'
                          }
                        </span>
                      </div>
                    )}
                    
                    {task.createdAt && (
                      <div className="flex items-center text-gray-600">
                        <span>Created {formatDate(task.createdAt)}</span>
                      </div>
                    )}
                  </div>
                  
                  {task.notes && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700">
                        <strong>Notes:</strong> {task.notes}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Task Actions */}
                <div className="flex flex-col gap-2 ml-4">
                  {task.status === 'todo' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTaskStatus(task._id, 'in_progress')}
                      disabled={currentJob.status === 'completed'}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Start
                    </Button>
                  )}
                  
                  {task.status === 'in_progress' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateTaskStatus(task._id, 'completed')}
                        disabled={currentJob.status === 'completed'}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateTaskStatus(task._id, 'on_hold')}
                        disabled={currentJob.status === 'completed'}
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                      >
                        Hold
                      </Button>
                    </div>
                  )}
                  
                  {task.status === 'completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateTaskStatus(task._id, 'in_progress')}
                      disabled={currentJob.status === 'completed'}
                      className="text-orange-600 border-orange-600 hover:bg-orange-50"
                    >
                      Reopen
                    </Button>
                  )}
                  
                  {task.status === 'on_hold' && (
                    <Button
                      size="sm"
                      onClick={() => handleUpdateTaskStatus(task._id, 'in_progress')}
                      disabled={currentJob.status === 'completed'}
                      className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      Resume
                    </Button>
                  )}
                  
                  {/* Edit Task Button */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTask(task);
                      setEditTaskData({
                        actualDuration: task.actualDuration || '',
                        notes: task.notes || ''
                      });
                    }}
                    disabled={currentJob.status === 'completed'}
                    className="text-blue-600 border-blue-600 hover:bg-blue-50"
                  >
                    <PencilSquareIcon className="h-4 w-4 mr-1 inline" />
                    Edit
                  </Button>
                </div>
              </div>
              
              {/* Task Progress Timeline */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created: {formatDate(task.createdAt)}</span>
                  {task.startedAt && <span>Started: {formatDate(task.startedAt)}</span>}
                  {task.completedAt && <span>Completed: {formatDate(task.completedAt)}</span>}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex flex-col gap-2 border-t border-gray-200 pt-6 sm:flex-row sm:justify-end sm:gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="w-full sm:w-auto"
        >
          Close
        </Button>
        <Button
          onClick={() => refetch()}
          variant="outline"
          className="w-full text-blue-600 border-blue-600 hover:bg-blue-50 sm:w-auto"
        >
          Refresh
        </Button>
      </div>
    </div>
  );
};

// Job Completion Modal Component
const JobCompletionModal: React.FC<{
  job: any;
  onClose: () => void;
  onComplete: (completionData: any) => void;
}> = ({ job, onClose, onComplete }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [finalDetails, setFinalDetails] = useState({
    actualDuration: '',
    charges: [{ name: '', amount: '', tax: 0 }],
    notes: '',
    partsUsed: {} as {[key: string]: number},
    partsReturned: {} as {[key: string]: number}
  });

  // Use the job data directly since it should now have populated parts with pricing
  const populatedJob = job;

  // Initialize parts used with current assigned parts
  useEffect(() => {
    if (populatedJob?.parts) {
      const partsUsed: {[key: string]: number} = {};
      populatedJob.parts.forEach((part: any) => {
        const partId = part.product._id || part.product;
        partsUsed[partId] = part.quantityRequired || 0;
        
      });
      setFinalDetails(prev => ({ ...prev, partsUsed }));
    }
  }, [populatedJob]);

  const updatePartUsed = (partId: string, quantity: number) => {
    setFinalDetails(prev => ({
      ...prev,
      partsUsed: {
        ...prev.partsUsed,
        [partId]: Math.max(0, quantity)
      }
    }));
  };

  const updatePartReturned = (partId: string, quantity: number) => {
    setFinalDetails(prev => ({
      ...prev,
      partsReturned: {
        ...prev.partsReturned,
        [partId]: Math.max(0, quantity)
      }
    }));
  };

  const addCharge = () => {
    setFinalDetails(prev => ({
      ...prev,
      charges: [...prev.charges, { name: '', amount: '', tax: 0 }]
    }));
  };

  const removeCharge = (index: number) => {
    setFinalDetails(prev => ({
      ...prev,
      charges: prev.charges.filter((_, i) => i !== index)
    }));
  };

  const updateCharge = (index: number, field: 'name' | 'amount' | 'tax', value: string | number) => {
    setFinalDetails(prev => ({
      ...prev,
      charges: prev.charges.map((charge, i) => 
        i === index ? { ...charge, [field]: value } : charge
      )
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onComplete(finalDetails);
      onClose();
    } catch (error) {
      console.error('Job completion error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Predefined charges
  const predefinedCharges = [
    { name: 'Service Fee', amount: '', tax: 0 },
    { name: 'Diagnostic Fee', amount: '', tax: 0 },
    { name: 'Emergency Service', amount: '', tax: 0 },
    { name: 'Warranty Work', amount: '', tax: 0 },
    { name: 'Custom Charge', amount: '', tax: 0 }
  ];

  const calculateTotal = () => {
    const chargesTotal = finalDetails.charges.reduce((total, charge) => {
      const amount = parseFloat(charge.amount) || 0;
      const tax = parseFloat(String(charge.tax)) || 0;
      const taxAmount = (amount * tax) / 100;
      return total + amount + taxAmount;
    }, 0);
    
    const partsCost = Object.entries(finalDetails.partsUsed).reduce((total, [partId, quantity]) => {
      const part = populatedJob?.parts?.find((p: any) => p.product === partId || p.product._id === partId);
      // Use selling price first (same priority as backend invoice creation)
      const unitPrice = part?.product?.pricing?.sellingPrice || 
                       part?.unitPrice || 
                       part?.product?.pricing?.salePrice || 
                       part?.product?.pricing?.costPrice || 
                       part?.product?.pricing?.cost || 0;
      const taxRate = Number(part?.product?.pricing?.taxRate ?? 0);
      const base = unitPrice * quantity;
      const taxAmount = (base * taxRate) / 100;
      return total + base + taxAmount;
    }, 0);
    
    return chargesTotal + partsCost;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fixed */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Complete Job</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">

          {/* Job Summary */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Job Summary</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Job:</span> {job?.title || job?.jobNumber || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Customer:</span> {job?.customer?.fullName || (job?.customer?.firstName && job?.customer?.lastName ? `${job.customer.firstName} ${job.customer.lastName}` : 'N/A')}
              </div>
              <div>
                <span className="font-medium">Vehicle:</span> {job?.vehicle?.regNumber || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Priority:</span> {job?.priority || 'N/A'}
              </div>
            </div>
          </div>

          {/* Service Details */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Labour & Service Details</h3>
              {/* Labour Section */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-gray-900 mb-3">Labour</h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <Input
                      label="Actual Work Hours"
                      type="number"
                      step="0.5"
                      value={finalDetails.actualDuration}
                      onChange={(e) => setFinalDetails(prev => ({ ...prev, actualDuration: e.target.value }))}
                      placeholder="Total hours"
                    />
                  </div>
                  <div>
                    <Input
                      label="Hourly Rate"
                      type="number"
                      step="0.01"
                      value={(finalDetails as any).laborRate || ''}
                      onChange={(e) => setFinalDetails(prev => ({ ...prev, laborRate: e.target.value }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Input
                      label="Tax %"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      value={(finalDetails as any).laborTax ?? 0}
                      onChange={(e) => setFinalDetails(prev => ({ ...prev, laborTax: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600 mb-1">Labour Total (incl. tax)</div>
                    <div className="text-lg font-semibold text-gray-900">
                      {(() => {
                        const hours = parseFloat(String(finalDetails.actualDuration)) || 0;
                        const rate = parseFloat(String((finalDetails as any).laborRate)) || 0;
                        const tax = parseFloat(String((finalDetails as any).laborTax)) || 0;
                        const base = hours * rate;
                        const taxAmt = (base * tax) / 100;
                        return `$${(base + taxAmt).toFixed(2)}`;
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Charges (non-labour) */}
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Charges</label>
                <div className="space-y-3">
                  {finalDetails.charges.map((charge, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg bg-gray-50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Charge Name</label>
                          <select
                            value={charge.name}
                            onChange={(e) => updateCharge(index, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">Select charge type</option>
                            {predefinedCharges
                              .filter(pc => pc.name.toLowerCase() !== 'labor' && pc.name.toLowerCase() !== 'labour')
                              .map((predefinedCharge) => (
                                <option key={predefinedCharge.name} value={predefinedCharge.name}>
                                  {predefinedCharge.name}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            value={charge.amount}
                            onChange={(e) => updateCharge(index, 'amount', e.target.value)}
                            placeholder="0.00"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Tax %</label>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={charge.tax}
                            onChange={(e) => updateCharge(index, 'tax', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      {finalDetails.charges.length > 1 && (
                        <div className="mt-2 text-right">
                          <button
                            type="button"
                            onClick={() => removeCharge(index)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="Remove charge"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCharge}
                    className="w-full p-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Add Charge
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <TextArea
                  label="Completion Notes"
                  value={finalDetails.notes}
                  onChange={(e) => setFinalDetails(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  placeholder="Add any completion notes or observations..."
                />
              </div>
            </div>

            {/* Parts Usage */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Parts Usage</h3>
              <div className="space-y-3">
                {populatedJob?.parts?.map((part: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">{part.productName || 'Unnamed Part'}</h4>
                        <p className="text-sm text-gray-600">{part.productSku || 'N/A'} • Stock: {part.product?.inventory?.currentStock || 0}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Unit Price: ${part?.product?.pricing?.sellingPrice || 
                                       part?.unitPrice || 
                                       part?.product?.pricing?.salePrice || 
                                       part?.product?.pricing?.costPrice || 
                                       part?.product?.pricing?.cost || 0}
                        </p>
                        <p className="text-sm text-gray-600">Assigned: {part.quantityRequired || 0}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Used Quantity</label>
                        <input
                          type="number"
                          min="0"
                          max={part.quantityRequired || 0}
                          value={finalDetails.partsUsed[part.product] || finalDetails.partsUsed[part.product._id] || 0}
                          onChange={(e) => updatePartUsed(part.product._id || part.product, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Returned Quantity</label>
                        <input
                          type="number"
                          min="0"
                          max={(finalDetails.partsUsed[part.product] || finalDetails.partsUsed[part.product._id] || 0)}
                          value={finalDetails.partsReturned[part.product] || finalDetails.partsReturned[part.product._id] || 0}
                          onChange={(e) => updatePartReturned(part.product._id || part.product, parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                    </div>
                    <div className="mt-2 text-right space-y-1">
                      {(() => {
                        const qty = (finalDetails.partsUsed[part.product] || finalDetails.partsUsed[part.product._id] || 0);
                        const unit = (
                          part?.product?.pricing?.sellingPrice || 
                          part?.unitPrice || 
                          part?.product?.pricing?.salePrice || 
                          part?.product?.pricing?.costPrice || 
                          part?.product?.pricing?.cost || 0
                        );
                        const taxRate = Number(part?.product?.pricing?.taxRate ?? 0);
                        const base = qty * unit;
                        const taxAmt = (base * taxRate) / 100;
                        const total = base + taxAmt;
                        return (
                          <>
                            <div className="text-sm text-gray-600">Tax Rate: {taxRate}%</div>
                            <div className="text-sm text-gray-600">Tax: ${taxAmt.toFixed(2)}</div>
                            <div className="text-sm font-medium text-gray-900">Subtotal (incl. tax): ${total.toFixed(2)}</div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Calculation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-lg font-medium text-blue-900 mb-2">Total Charges</h3>
                      <div className="space-y-2 text-sm">
                        {(() => {
                          const hours = parseFloat(String(finalDetails.actualDuration)) || 0;
                          const rate = parseFloat(String((finalDetails as any).laborRate)) || 0;
                          const ltax = parseFloat(String((finalDetails as any).laborTax)) || 0;
                          const lbase = hours * rate;
                          const ltaxAmount = (lbase * ltax) / 100;
                          return (
                            <div className="space-y-1">
                              <div className="flex justify-between"><span>Labour Subtotal:</span><span>${lbase.toFixed(2)}</span></div>
                              <div className="flex justify-between"><span>Labour Tax:</span><span>${ltaxAmount.toFixed(2)}</span></div>
                            </div>
                          );
                        })()}
                        {finalDetails.charges.map((charge, index) => {
                          if (!charge.name || !charge.amount) return null;
                          const amount = parseFloat(charge.amount) || 0;
                          const tax = parseFloat(String(charge.tax)) || 0;
                          const taxAmount = (amount * tax) / 100;
                          const total = amount + taxAmount;
                          
                          return (
                            <div key={index} className="space-y-1">
                              <div className="flex justify-between">
                                <span>{charge.name}:</span>
                                <span>${amount.toFixed(2)}</span>
                              </div>
                              {tax > 0 && (
                                <div className="flex justify-between text-gray-600 ml-4">
                                  <span>Tax ({tax}%):</span>
                                  <span>${taxAmount.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="flex justify-between font-medium border-t border-blue-200 pt-1">
                                <span>Subtotal:</span>
                                <span>${total.toFixed(2)}</span>
                              </div>
                            </div>
                          );
                        })}
                {(() => {
                  const hours = parseFloat(String(finalDetails.actualDuration)) || 0;
                  const rate = parseFloat(String((finalDetails as any).laborRate)) || 0;
                  const ltax = parseFloat(String((finalDetails as any).laborTax)) || 0;
                  const labourBase = hours * rate;
                  const labourTax = (labourBase * ltax) / 100;

                  const chargesBase = finalDetails.charges.reduce((sum, c) => sum + (parseFloat(c.amount) || 0), 0);
                  const chargesTax = finalDetails.charges.reduce((sum, c) => {
                    const a = parseFloat(c.amount) || 0;
                    const t = parseFloat(String(c.tax)) || 0;
                    return sum + (a * t) / 100;
                  }, 0);

                  const partsBase = Object.entries(finalDetails.partsUsed).reduce((sum, [partId, qty]) => {
                    const part: any = (populatedJob?.parts || []).find((p: any) => p.product === partId || p.product._id === partId);
                    const unit = part?.product?.pricing?.sellingPrice || part?.unitPrice || part?.product?.pricing?.salePrice || part?.product?.pricing?.costPrice || part?.product?.pricing?.cost || 0;
                    return sum + (Number(qty) || 0) * unit;
                  }, 0);
                  const partsTax = Object.entries(finalDetails.partsUsed).reduce((sum, [partId, qty]) => {
                    const part: any = (populatedJob?.parts || []).find((p: any) => p.product === partId || p.product._id === partId);
                    const unit = part?.product?.pricing?.sellingPrice || part?.unitPrice || part?.product?.pricing?.salePrice || part?.product?.pricing?.costPrice || part?.product?.pricing?.cost || 0;
                    const rate = Number(part?.product?.pricing?.taxRate ?? 0);
                    const base = (Number(qty) || 0) * unit;
                    return sum + (base * rate) / 100;
                  }, 0);

                  const grandTotal = labourBase + labourTax + chargesBase + chargesTax + partsBase + partsTax;

                  return (
                    <div className="mt-2 space-y-1">
                      <div className="flex justify-between"><span>Parts Subtotal:</span><span>${partsBase.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Parts Tax:</span><span>${partsTax.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Charges Subtotal:</span><span>${chargesBase.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Charges Tax:</span><span>${chargesTax.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Labour Subtotal:</span><span>${labourBase.toFixed(2)}</span></div>
                      <div className="flex justify-between"><span>Labour Tax:</span><span>${labourTax.toFixed(2)}</span></div>
                      <div className="border-t border-blue-200 pt-2 flex justify-between font-medium text-blue-900">
                        <span>Grand Total:</span>
                        <span>${grandTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          </div>
        </div>
        
        {/* Footer - Fixed */}
        <div className="border-t border-gray-200 p-6 bg-gray-50">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 w-full sm:w-auto"
            >
              {isSubmitting ? 'Completing...' : 'Complete Job'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkshopPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const { company } = useSettings();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskManagementModalOpen, setIsTaskManagementModalOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isJobCardModalOpen, setIsJobCardModalOpen] = useState(false);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false);
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<WorkshopJob | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch jobs
  const { data: jobsData, isLoading } = useQuery({
    queryKey: ['workshop-jobs', currentPage, pageSize, search, status, priority, overdue],
    queryFn: () => enhancedWorkshopAPI.getJobs({
      page: currentPage,
      limit: pageSize,
      search,
      status,
      priority,
      overdue: overdue ? 'true' : ''
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
    onSuccess: (response, { id }) => {
      // Invalidate multiple query keys to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', id] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-analytics', id] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-visualization', id] });
      queryClient.invalidateQueries({ queryKey: ['workshop-dashboard'] });
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
    onSuccess: (response, { id }) => {
      // Invalidate multiple query keys to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', id] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-analytics', id] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-visualization', id] });
      queryClient.invalidateQueries({ queryKey: ['workshop-dashboard'] });
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
    onSuccess: (response, { jobId }) => {
      // Invalidate multiple query keys to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-analytics', jobId] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-visualization', jobId] });
      queryClient.invalidateQueries({ queryKey: ['workshop-dashboard'] });
      setIsTaskModalOpen(false);
      setSelectedJob(null);
      toast.success('Task added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add task');
    },
  });

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: ({ jobId, taskId, data }: { jobId: string; taskId: string; data: any }) => 
      enhancedWorkshopAPI.updateTaskStatus(jobId, taskId, data),
    onSuccess: (response, { jobId }) => {
      // Invalidate multiple query keys to ensure all related data is refreshed
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', jobId] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-analytics', jobId] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job-visualization', jobId] });
      queryClient.invalidateQueries({ queryKey: ['workshop-dashboard'] });
      toast.success('Task status updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update task status');
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

  const handleCompleteJob = async (completionData: any) => {
    if (!selectedJob) return;

    try {
      // Complete the job with final details
      await api.post(`/workshop/${selectedJob._id}/complete`, {
        ...completionData,
        actualDuration: parseFloat(completionData.actualDuration) || 0,
        labor: {
          hours: parseFloat(String(completionData.actualDuration)) || 0,
          rate: parseFloat(String((completionData as any).laborRate)) || 0,
          tax: parseFloat(String((completionData as any).laborTax)) || 0
        },
        status: 'completed',
        completedAt: new Date().toISOString()
      });

      // Invoice is now created automatically by the backend

      toast.success('Job completed successfully and invoice created');
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setIsCompletionModalOpen(false);
      setSelectedJob(null);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to complete job');
      throw error;
    }
  };

  // Removed handleIncrementProgress - progress is now calculated automatically from task completion

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

  const handleQuickCompleteJob = (jobId: string) => {
    if (confirm('Are you sure you want to complete this job?')) {
      completeJobMutation.mutate(jobId);
    }
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

  const columns = [
    {
      key: 'jobCardNumber',
      label: 'Job Card #',
      render: (job: any) => (
        <span className="text-sm font-mono text-gray-900">
          {job.jobCard?.cardNumber || 'N/A'}
        </span>
      )
    },
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
      key: 'carRegistration',
      label: 'Car Registration',
      render: (job: any) => (
        <span className="text-sm font-mono text-gray-900">
          {job.vehicle?.regNumber || 'N/A'}
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
      render: (job: any) => {
        const isOverdue = job.isOverdue || false;
        return (
          <div className="flex items-center gap-2">
            <Badge color={getStatusColor(job.status)}>
              {job.status?.replace('_', ' ') || 'Unknown'}
            </Badge>
            {isOverdue && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-600" title="Overdue" />
            )}
          </div>
        );
      }
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
      key: 'taskHours',
      label: 'Task Hours',
      render: (job: any) => {
        // Use backend's isOverdue calculation (which considers task hours: actual > estimated)
        const isOverdue = job.isOverdue || false;
        const totalEstimated = job.totalEstimatedDuration || 0;
        const totalActual = job.totalActualDuration || 0;
        
        // If no hours data, show not set
        if (totalEstimated === 0 && totalActual === 0) {
          return <span className="text-gray-500">Not set</span>;
        }
        
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">
              Est: <strong>{totalEstimated.toFixed(1)}h</strong>
            </span>
            {totalActual > 0 && (
              <span className={`text-xs mt-1 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                Actual: <strong>{totalActual.toFixed(1)}h</strong>
                {isOverdue && <ExclamationTriangleIcon className="inline w-3 h-3 ml-1" />}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (job: any) => {
        if (!job.deadline) {
          return <span className="text-gray-500">Not set</span>;
        }
        const deadlineDate = new Date(job.deadline);
        const isOverdue = deadlineDate < new Date() && job.status !== 'completed';
        return (
          <div className="flex flex-col">
            <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
              {deadlineDate.toLocaleDateString()}
            </span>
            {isOverdue && (
              <span className="text-xs text-red-600">Overdue</span>
            )}
          </div>
        );
      }
    },
    {
      key: 'timeIn',
      label: 'Time In',
      render: (job: any) => {
        const timeIn = job.vehicle?.timeIn;
        if (!timeIn) {
          return <span className="text-gray-500">Not set</span>;
        }
        const timeInDate = new Date(timeIn);
        const formattedDate = timeInDate.toLocaleDateString();
        const formattedTime = timeInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">{formattedDate}</span>
            <span className="text-xs text-gray-600">{formattedTime}</span>
          </div>
        );
      }
    },
    {
      key: 'expectedCollection',
      label: 'Expected Collection',
      render: (job: any) => {
        const timeForCollection = job.vehicle?.timeForCollection;
        if (!timeForCollection) {
          return <span className="text-gray-500">Not set</span>;
        }
        const collectionDate = new Date(timeForCollection);
        const formattedDate = collectionDate.toLocaleDateString();
        const formattedTime = collectionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return (
          <div className="flex flex-col">
            <span className="text-sm text-gray-900">{formattedDate}</span>
            <span className="text-xs text-gray-600">{formattedTime}</span>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (job: any) => {
        const handleDownloadJobCard = async () => {
          try {
            // Fetch customer data if available
            let customer = null;
            if (job.customer) {
              try {
                const customerResponse = await customersAPI.getCustomerById(job.customer);
                customer = customerResponse?.data?.data || null;
              } catch (error) {
                console.error('Error fetching customer:', error);
              }
            }
            
            await generateJobCardPDF({
              job: job,
              company: company || {},
              customer: customer
            });
            toast.success('Job card downloaded successfully');
          } catch (error) {
            console.error('Error generating job card PDF:', error);
            toast.error('Failed to generate job card PDF');
          }
        };

        return (
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
          
          {/* 2. Download Job Card */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDownloadJobCard}
            title="Download Job Card PDF"
            className="text-indigo-600 hover:text-indigo-700"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
          </Button>
          
          {/* 3. Assign */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsAssignModalOpen(true);
            }}
            disabled={
              job.status === 'completed' ||
              (job.resources?.assignedTechnicians?.length > 0) || 
              (job.tools?.length > 0)
            }
            title={
              job.status === 'completed'
                ? "Cannot assign resources to completed job"
                : (job.resources?.assignedTechnicians?.length > 0) || (job.tools?.length > 0)
                ? "Resources already assigned - use 'Task Update' to modify"
                : "Assign Resources"
            }
            className={
              job.status === 'completed' ||
              (job.resources?.assignedTechnicians?.length > 0) || (job.tools?.length > 0)
                ? "text-gray-400 cursor-not-allowed"
                : "text-green-600 hover:text-green-700"
            }
          >
            <UserPlusIcon className="h-4 w-4" />
          </Button>
          
          {/* 4. Manage Tasks */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsTaskManagementModalOpen(true);
            }}
            disabled={job.status === 'completed'}
            title={job.status === 'completed' ? "Cannot manage tasks for completed job" : "Manage Tasks"}
            className={
              job.status === 'completed'
                ? "opacity-50 cursor-not-allowed"
                : "text-purple-600 hover:text-purple-700 hover:bg-purple-50"
            }
          >
            <ClipboardDocumentListIcon className="h-4 w-4" />
          </Button>
          
          {/* 5. Task Update */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedJob(job);
              setIsEditModalOpen(true);
            }}
            disabled={job.status === 'completed'}
            title={job.status === 'completed' ? 'Cannot update completed job' : 'Update Job & Resources'}
            className={`${job.status === 'completed' ? 'text-gray-400 cursor-not-allowed' : 'text-purple-600 hover:text-purple-700'}`}
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
          {(job.status === 'in_progress' || job.status === 'overdue') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSelectedJob(job);
                setIsCompletionModalOpen(true);
              }}
              className="text-green-600 hover:text-green-700"
              title="Complete Job"
            >
              <CheckCircleIcon className="h-4 w-4" />
            </Button>
          )}
          
          {/* 6. Delete */}
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
        );
      }
    },
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-gray-900">Workshop Management</h1>
            <p className="text-gray-600">Manage jobs with resource allocation and task tracking</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDashboardOpen(true)}
              className="flex w-full items-center sm:w-auto"
            >
              <ChartBarIcon className="h-5 w-5 mr-2" />
              Dashboard
            </Button>
            {hasPermission('workshop', 'create') && (
              <Button onClick={() => setIsCreateOpen(true)} className="w-full sm:w-auto">
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Job
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
              status === '' && !overdue ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => {
              setStatus('');
              setOverdue(false);
              setCurrentPage(1);
            }}
          >
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
          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
              status === 'in_progress' && !overdue ? 'ring-2 ring-orange-500' : ''
            }`}
            onClick={() => {
              setStatus('in_progress');
              setOverdue(false);
              setCurrentPage(1);
            }}
          >
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
          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
              status === 'completed' && !overdue ? 'ring-2 ring-green-500' : ''
            }`}
            onClick={() => {
              setStatus('completed');
              setOverdue(false);
              setCurrentPage(1);
            }}
          >
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
          <div 
            className={`bg-white p-6 rounded-lg shadow cursor-pointer transition-all hover:shadow-lg ${
              overdue ? 'ring-2 ring-red-500' : ''
            }`}
            onClick={() => {
              setOverdue(true);
              setStatus('');
              setCurrentPage(1);
            }}
          >
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
              placeholder="Search by job title, job card number, or car registration..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            />
            <Select
              value={status}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
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
            onCancel={() => {
              setIsEditModalOpen(false);
              setSelectedJob(null);
            }}
          />
        )}
      </Modal>

      {/* Job Completion Modal */}
      {isCompletionModalOpen && selectedJob && (
        <JobCompletionModal
          job={selectedJob}
          onClose={() => {
            setIsCompletionModalOpen(false);
            setSelectedJob(null);
          }}
          onComplete={handleCompleteJob}
        />
      )}

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

      {/* Comprehensive Task Management Modal */}
      <Modal
        isOpen={isTaskManagementModalOpen}
        onClose={() => {
          setIsTaskManagementModalOpen(false);
          setSelectedJob(null);
        }}
        title="Manage Tasks"
        size="xl"
      >
        {selectedJob && (
          <TaskManagementModal
            job={selectedJob}
            onClose={() => {
              setIsTaskManagementModalOpen(false);
              setSelectedJob(null);
            }}
            addTaskMutation={addTaskMutation}
            updateTaskStatusMutation={updateTaskStatusMutation}
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
          updateTaskStatusMutation={updateTaskStatusMutation}
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
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false);
                setSelectedJob(null);
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => selectedJob && handleDeleteJob(selectedJob._id)}
              loading={deleteJobMutation.isPending}
              className="w-full sm:w-auto"
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
          <JobProgressVisualization 
            jobId={selectedJob._id} 
            onClose={() => {
              setIsVisualizationOpen(false);
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
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    estimatedDuration: 0
  });
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customer: '',
    customerPhone: '',
    priority: 'medium',
    deadline: '',
    estimatedDuration: '',
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
      bufferTime: 0.5,
      isFlexible: false,
      schedulingNotes: ''
    },
    // Tasks
    tasks: [] as any[],
    // Service Template
    serviceTemplate: null as any,
    // Resources from template
    tools: [] as any[],
    parts: [] as any[],
    machines: [] as any[],
    // Assigned technician
    assignedTechnician: null as any
  });

  // Warning state for unavailable resources
  const [resourceWarning, setResourceWarning] = useState<{
    show: boolean;
    unavailableResources: {
      tools: any[];
      machines: any[];
      parts: any[];
    };
  }>({
    show: false,
    unavailableResources: {
      tools: [],
      machines: [],
      parts: []
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
    const cleanedData: any = {
      ...formData,
      title: formData.title.trim(),
      // Ensure odometer is a valid number or empty string
      vehicle: {
        ...formData.vehicle,
        odometer: formData.vehicle.odometer ? 
          (isNaN(Number(formData.vehicle.odometer)) ? '' : Number(formData.vehicle.odometer)) : 
          '',
        // Map timeInfo fields to vehicle fields
        timeIn: formData.timeInfo.timeIn || undefined,
        timeForCollection: formData.timeInfo.timeForCollection || undefined
      },
      // Ensure numeric fields are properly formatted
      jobCard: {
        ...formData.jobCard,
        estimatedCost: Number(formData.jobCard.estimatedCost) || 0,
        laborHours: Number(formData.jobCard.laborHours) || 0,
        warrantyPeriod: Number(formData.jobCard.warrantyPeriod) || 0
      },
      // Estimated duration is already in hours
      estimatedDuration: parseFloat(formData.estimatedDuration) || 0,
      // Clean sublets
      sublets: formData.sublets.map(sublet => ({
        description: sublet.description.trim(),
        amount: Number(sublet.amount) || 0
      })).filter(sublet => sublet.description !== '')
    };
    
    // Remove timeInfo from cleaned data (it's been mapped to vehicle)
    delete cleanedData.timeInfo;

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

  const handleServiceTemplateSelect = async (template: any) => {
    if (template) {
      // Check resource availability first
      const availabilityData = await checkResourceAvailability(template);
      
      // Check for unavailable resources
      const unavailableTools = availabilityData?.tools?.filter((tool: any) => !tool.isAvailable && !tool.optional) || [];
      const unavailableMachines = availabilityData?.machines?.filter((machine: any) => !machine.isAvailable && !machine.optional) || [];
      const unavailableParts = availabilityData?.parts?.filter((part: any) => !part.isAvailable && !part.optional) || [];
      
      // Show warning if there are unavailable resources
      if (unavailableTools.length > 0 || unavailableMachines.length > 0 || unavailableParts.length > 0) {
        setResourceWarning({
          show: true,
          unavailableResources: {
            tools: unavailableTools,
            machines: unavailableMachines,
            parts: unavailableParts
          }
        });
      } else {
        setResourceWarning({
          show: false,
          unavailableResources: {
            tools: [],
            machines: [],
            parts: []
          }
        });
      }
      
      // Apply template data to form
      setFormData(prev => ({
        ...prev,
        title: template.name,
        description: template.description,
        priority: template.priority,
        'scheduled.estimatedDuration': template.estimatedDuration,
        serviceTemplate: template,
        // Add template tasks
        tasks: template.tasks?.map((task: any) => ({
          title: task.name,
          description: task.description,
          priority: template.priority,
          estimatedDuration: task.estimatedDuration,
          status: 'todo'
        })) || [],
               // Add template parts with availability info
               parts: availabilityData?.parts?.map((part: any) => ({
                 productName: part.name,
                 quantityRequired: part.quantity,
                 notes: part.optional ? 'Optional part' : undefined,
                 status: part.isAvailable ? 'pending' : 'shortage',
                 availabilityStatus: part.availabilityStatus,
                 productId: part.productId
               })) || template.requiredParts?.map((part: any) => ({
                 productName: part.name,
                 quantityRequired: part.quantity,
                 notes: part.optional ? 'Optional part' : undefined,
                 status: 'pending'
               })) || [],
        // Add template tools with availability info
        tools: availabilityData?.tools?.map((tool: any) => ({
          name: tool.name,
          category: 'specialty_tool',
          notes: tool.optional ? 'Optional tool' : undefined,
          isAvailable: tool.isAvailable,
          availabilityStatus: tool.availabilityStatus,
          toolId: tool.toolId,
          quantity: tool.quantity
        })) || template.requiredTools?.map((tool: any) => ({
          name: tool.name,
          category: 'specialty_tool',
          notes: tool.optional ? 'Optional tool' : undefined,
          isAvailable: true,
          toolId: tool.toolId,
          quantity: tool.quantity
        })) || [],
        // Add template machines with availability info
        machines: availabilityData?.machines?.map((machine: any) => ({
          name: machine.name,
          category: 'workshop_machine',
          notes: machine.optional ? 'Optional machine' : undefined,
          isAvailable: machine.isAvailable,
          availabilityStatus: machine.availabilityStatus,
          machineId: machine.machineId,
          quantity: machine.quantity
        })) || template.requiredMachines?.map((machine: any) => ({
          name: machine.name,
          category: 'workshop_machine',
          notes: machine.optional ? 'Optional machine' : undefined,
          isAvailable: true,
          machineId: machine.machineId,
          quantity: machine.quantity
        })) || []
      }));
    } else {
      // Clear template data
      setFormData(prev => ({
        ...prev,
        serviceTemplate: null
      }));
    }
  };

  // Check availability of resources from template
  const checkResourceAvailability = async (template: any) => {
    try {
      // Get all resources at once
      const [toolsResponse, machinesResponse] = await Promise.all([
        toolsAPI.getTools(),
        machinesAPI.getMachines()
      ]);

      const allTools = toolsResponse.data?.data || [];
      const allMachines = machinesResponse.data?.data || [];

      // Check tools availability
      const toolsAvailability = template.requiredTools?.map((tool: any) => {
        if (tool.toolId) {
          const toolData = allTools.find((t: any) => t._id === tool.toolId);
          return {
            ...tool,
            isAvailable: toolData?.availability?.isAvailable || false,
            availabilityStatus: toolData?.availability?.isAvailable ? 'Available' : 'In Use',
            toolData
          };
        }
        return tool;
      }) || [];

      // Check machines availability
      const machinesAvailability = template.requiredMachines?.map((machine: any) => {
        if (machine.machineId) {
          const machineData = allMachines.find((m: any) => m._id === machine.machineId);
          return {
            ...machine,
            isAvailable: machineData?.availability?.isAvailable || false,
            availabilityStatus: machineData?.availability?.isAvailable ? 'Available' : 'Booked',
            machineData
          };
        }
        return machine;
      }) || [];

      // Check parts availability
      const partsAvailability = await Promise.all(
        template.requiredParts?.map(async (part: any) => {
          if (part.productId) {
            try {
              const response = await productsAPI.getProductById(part.productId);
              const productData = response.data.data;
              const currentStock = productData.inventory?.currentStock || 0;
              const requiredQuantity = part.quantity || 1;
              return {
                ...part,
                isAvailable: currentStock >= requiredQuantity,
                availabilityStatus: currentStock >= requiredQuantity ? 
                  `Available (${currentStock} in stock)` : 
                  `Low Stock (${currentStock} available, ${requiredQuantity} needed)`,
                productData
              };
            } catch (error) {
              return {
                ...part,
                isAvailable: false,
                availabilityStatus: 'Not Found',
                productData: null
              };
            }
          }
          return part;
        }) || []
      );

      return {
        tools: toolsAvailability,
        machines: machinesAvailability,
        parts: partsAvailability
      };
    } catch (error) {
      console.error('Error checking resource availability:', error);
      toast.error('Failed to check resource availability');
      return null;
    }
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

  // Task management functions
  const addTask = () => {
    if (!newTask.title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, {
        title: newTask.title,
        description: newTask.description,
        priority: newTask.priority,
        estimatedDuration: newTask.estimatedDuration,
        id: Date.now().toString(), // Temporary ID
        status: 'todo'
      }]
    }));
    
    // Reset the new task form
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      estimatedDuration: 0
    });
    
    toast.success('Task added successfully');
  };

  const updateTask = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.map((task, i) => 
        i === index ? { ...task, [field]: value } : task
      )
    }));
  };

  const removeTask = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tasks: prev.tasks.filter((_, i) => i !== index)
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

      {/* Resource Availability Warning */}
      {resourceWarning.show && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg shadow-sm">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-lg font-medium text-yellow-800 mb-2">
                ⚠️ Some Required Resources Are Not Available
              </h3>
              <p className="text-sm text-yellow-700 mb-4">
                The following required resources from the selected service template are currently unavailable. 
                You can still create the job, but these resources will need to be addressed before work can begin.
              </p>
              
              <div className="space-y-4">
                {/* Unavailable Parts */}
                {resourceWarning.unavailableResources.parts.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">📦 Unavailable Parts ({resourceWarning.unavailableResources.parts.length})</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {resourceWarning.unavailableResources.parts.map((part: any, index: number) => (
                        <li key={index} className="text-sm text-yellow-700">
                          <strong>{part.name}</strong> - {part.availabilityStatus}
                          {part.quantity && ` (Qty: ${part.quantity})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Unavailable Tools */}
                {resourceWarning.unavailableResources.tools.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">🔧 Unavailable Tools ({resourceWarning.unavailableResources.tools.length})</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {resourceWarning.unavailableResources.tools.map((tool: any, index: number) => (
                        <li key={index} className="text-sm text-yellow-700">
                          <strong>{tool.name}</strong> - {tool.availabilityStatus}
                          {tool.quantity && ` (Qty: ${tool.quantity})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Unavailable Machines */}
                {resourceWarning.unavailableResources.machines.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-800 mb-2">⚙️ Unavailable Machines ({resourceWarning.unavailableResources.machines.length})</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {resourceWarning.unavailableResources.machines.map((machine: any, index: number) => (
                        <li key={index} className="text-sm text-yellow-700">
                          <strong>{machine.name}</strong> - {machine.availabilityStatus}
                          {machine.quantity && ` (Qty: ${machine.quantity})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setResourceWarning({ show: false, unavailableResources: { tools: [], machines: [], parts: [] } })}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
                >
                  I Understand, Continue Anyway
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResourceWarning({ show: false, unavailableResources: { tools: [], machines: [], parts: [] } });
                    setFormData(prev => ({ ...prev, serviceTemplate: null, parts: [], tools: [], machines: [] }));
                  }}
                  className="px-4 py-2 bg-white text-yellow-700 border border-yellow-600 rounded-md hover:bg-yellow-50 text-sm font-medium"
                >
                  Clear Template Selection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Service Template Selection - HIDDEN */}
      {/* <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Service Template</h3>
        </div>
        <ServiceTemplateSelector
          onSelect={handleServiceTemplateSelect}
          selectedTemplate={formData.serviceTemplate}
        />
        
        {/* Template Resources Display */}
        {/* {formData.serviceTemplate && (
          <div className="mt-6 space-y-4">
            <h4 className="text-md font-medium text-gray-900">Template Resources</h4>
            
            {/* Required Parts */}
            {/* {formData.parts && formData.parts.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">📦</span>
                  Required Parts ({formData.parts.length})
                </h5>
                <div className="space-y-2">
                  {formData.parts.map((part: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-md p-3 border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{part.productName}</div>
                        <div className="text-sm text-gray-600">
                          Quantity: {part.quantityRequired}
                          {part.notes && ` • ${part.notes}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          part.status === 'pending' ? 'bg-green-100 text-green-800' : 
                          part.status === 'shortage' ? 'bg-red-100 text-red-800' : 
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {part.status === 'pending' ? 'Available' : 
                           part.status === 'shortage' ? 'Low Stock' : 
                           part.status}
                        </span>
                        {part.availabilityStatus && (
                          <div className="text-xs text-gray-500 mt-1">
                            {part.availabilityStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Tools */}
            {/* {formData.tools && formData.tools.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">🔧</span>
                  Required Tools ({formData.tools.length})
                </h5>
                <div className="space-y-2">
                  {formData.tools.map((tool: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-md p-3 border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{tool.name}</div>
                        <div className="text-sm text-gray-600">
                          Category: {tool.category}
                          {tool.notes && ` • ${tool.notes}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          tool.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tool.isAvailable ? 'Available' : 'In Use'}
                        </span>
                        {tool.availabilityStatus && (
                          <div className="text-xs text-gray-500 mt-1">
                            {tool.availabilityStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Required Machines */}
            {/* {formData.machines && formData.machines.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">⚙️</span>
                  Required Machines ({formData.machines.length})
                </h5>
                <div className="space-y-2">
                  {formData.machines.map((machine: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-md p-3 border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{machine.name}</div>
                        <div className="text-sm text-gray-600">
                          Category: {machine.category}
                          {machine.notes && ` • ${machine.notes}`}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          machine.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {machine.isAvailable ? 'Available' : 'Booked'}
                        </span>
                        {machine.availabilityStatus && (
                          <div className="text-xs text-gray-500 mt-1">
                            {machine.availabilityStatus}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Template Tasks */}
            {/* {formData.tasks && formData.tasks.length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4">
                <h5 className="font-medium text-gray-800 mb-3 flex items-center">
                  <span className="mr-2">📋</span>
                  Template Tasks ({formData.tasks.length})
                </h5>
                <div className="space-y-2">
                  {formData.tasks.map((task: any, index: number) => (
                    <div key={index} className="flex items-center justify-between bg-white rounded-md p-3 border">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-600">{task.description}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {task.status}
                        </span>
                        {task.estimatedDuration > 0 && (
                          <div className="text-xs text-gray-500 mt-1">
                            Est. {formatDuration(task.estimatedDuration)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div> */}

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
            
            <Input
              label="Order Number"
              name="orderNumber"
              value={formData.customerInfo.orderNumber}
              onChange={(e) => handleInputChange('customerInfo.orderNumber', e.target.value)}
            />
            
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
                label="Deadline"
                name="deadline"
                type="date"
                value={formData.deadline}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
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

      {/* Tasks Section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Tasks</h3>
        </div>

        {/* Add New Task Form */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
          <h4 className="text-md font-medium text-gray-900 mb-3">Add New Task</h4>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Task Title"
                value={newTask.title}
                onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter task title"
              />
              <Select
                label="Priority"
                value={newTask.priority}
                onChange={(e) => setNewTask(prev => ({ ...prev, priority: e.target.value }))}
                options={[
                  { value: 'low', label: 'Low' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'high', label: 'High' }
                ]}
              />
            </div>
            <TextArea
              label="Description"
              value={newTask.description}
              onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Task description"
              rows={2}
            />
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Est. Duration:</label>
                <Input
                  type="number"
                  step="0.5"
                  value={newTask.estimatedDuration}
                  onChange={(e) => setNewTask(prev => ({ ...prev, estimatedDuration: parseFloat(e.target.value) || 0 }))}
                  placeholder="Hours"
                  className="w-20"
                />
                <span className="text-sm text-gray-500">hrs</span>
              </div>
              <Button
                type="button"
                onClick={addTask}
                size="sm"
                className="bg-green-600 hover:bg-green-700"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {formData.tasks.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="mt-2">No tasks added yet</p>
              <p className="text-sm">Add tasks to organize the work steps for this job</p>
            </div>
          ) : (
            formData.tasks.map((task: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(index, 'title', e.target.value)}
                        placeholder="Task title"
                        className="font-medium"
                      />
                      <Select
                        value={task.priority}
                        onChange={(e) => updateTask(index, 'priority', e.target.value)}
                        options={[
                          { value: 'low', label: 'Low' },
                          { value: 'medium', label: 'Medium' },
                          { value: 'high', label: 'High' }
                        ]}
                        className="w-32"
                      />
                    </div>
                    <TextArea
                      value={task.description}
                      onChange={(e) => updateTask(index, 'description', e.target.value)}
                      placeholder="Task description"
                      rows={2}
                      className="mb-2"
                    />
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <label className="text-sm text-gray-600">Est. Duration:</label>
                        <Input
                          type="number"
                          step="0.5"
                          value={task.estimatedDuration}
                          onChange={(e) => updateTask(index, 'estimatedDuration', parseFloat(e.target.value) || 0)}
                          placeholder="Hours"
                          className="w-20"
                        />
                        <span className="text-sm text-gray-500">hrs</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeTask(index)}
                    className="ml-4 text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Task Hours Summary */}
        {formData.tasks.length > 0 && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-900">Total Estimated Hours</div>
                <div className="text-2xl font-bold text-blue-600 mt-1">
                  {formData.tasks.reduce((sum, task) => sum + (task.estimatedDuration || 0), 0).toFixed(1)} hrs
                </div>
              </div>
              <div className="text-sm text-blue-700">
                <ClockIcon className="h-6 w-6 inline mr-1" />
                {formData.tasks.length} task{formData.tasks.length !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-800">
              <ExclamationTriangleIcon className="h-4 w-4 inline mr-1" />
              <strong>Note:</strong> Job will be marked as overdue when actual task hours exceed this total estimate.
            </div>
          </div>
        )}
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

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Close
        </Button>
        <Button type="button" onClick={handleSubmit} loading={loading} className="w-full sm:w-auto">
          Create Job
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
const EditJobForm: React.FC<{
  job: any;
  onCancel: () => void;
}> = ({ job, onCancel }) => {
  const queryClient = useQueryClient();

  // Selection states for all resources
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [partQuantities, setPartQuantities] = useState<{[key: string]: number}>({});
  const [assignedPartQuantities, setAssignedPartQuantities] = useState<{[key: string]: number}>({});

  // Search states for each resource type
  const [searchTechnicians, setSearchTechnicians] = useState('');
  const [searchTools, setSearchTools] = useState('');
  const [searchMachines, setSearchMachines] = useState('');
  const [searchParts, setSearchParts] = useState('');

  // Loading state for bulk operations
  const [isUpdating, setIsUpdating] = useState(false);

  // Task status management
  const updateTaskStatus = async (taskIndex: number, newStatus: string) => {
    try {
      const task = job.tasks[taskIndex];
      if (!task || !task._id) return;

      // Update task status via API
      await api.put(`/workshop/${job._id}/tasks/${task._id}`, {
        status: newStatus,
        ...(newStatus === 'completed' && { completedAt: new Date() }),
        ...(newStatus === 'in_progress' && { startedAt: new Date() })
      });

      // Refresh the job data
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      toast.success(`Task status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

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

  // Fetch available parts (products)
  const { data: availablePartsData, error: partsError, isLoading: partsLoading } = useQuery({
    queryKey: ['available-parts'],
    queryFn: () => api.get('/products'),
  });

  // Job information editing states
  const [isEditingJobInfo, setIsEditingJobInfo] = useState(false);
  const [jobInfo, setJobInfo] = useState({
    title: job?.title || '',
    description: job?.description || '',
    priority: job?.priority || 'medium',
    status: job?.status || 'scheduled',
    deadline: job?.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
    expectedCollection: job?.vehicle?.timeForCollection 
      ? new Date(job.vehicle.timeForCollection).toISOString().slice(0, 16) 
      : ''
  });

  // Update jobInfo when job prop changes
  useEffect(() => {
    if (job) {
      setJobInfo({
        title: job.title || '',
        description: job.description || '',
        priority: job.priority || 'medium',
        status: job.status || 'scheduled',
        deadline: job.deadline ? new Date(job.deadline).toISOString().split('T')[0] : '',
        expectedCollection: job.vehicle?.timeForCollection 
          ? new Date(job.vehicle.timeForCollection).toISOString().slice(0, 16) 
          : ''
      });
    }
  }, [job]);

  // Basic safety check
  if (!job || typeof job !== 'object') {
    console.error('❌ ERROR: Invalid job data provided');
    return (
      <div className="p-4">
        <p className="text-red-600">Invalid job data</p>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  // Safe data extraction with fallbacks
  const technicians = Array.isArray(techniciansData?.data?.technicians) ? techniciansData.data.technicians : [];
  const availableTools = Array.isArray(availableToolsData?.data?.data) ? availableToolsData.data.data : [];
  const availableMachines = Array.isArray(availableMachinesData?.data?.data) ? availableMachinesData.data.data : [];
  const availableParts = Array.isArray(availablePartsData?.data?.data) ? availablePartsData.data.data : [];

  // Filter out already assigned resources with safe property access
  const assignedTechnicianIds = Array.isArray(job?.resources?.assignedTechnicians) 
    ? job.resources.assignedTechnicians.map((tech: any) => tech?.technicianId).filter(Boolean)
    : [];
  const assignedToolIds = Array.isArray(job?.tools) 
    ? job.tools.map((tool: any) => tool?.toolId).filter(Boolean)
    : [];
  const assignedMachineIds = Array.isArray(job?.resources?.requiredMachines) 
    ? job.resources.requiredMachines.map((machine: any) => machine?.machineId).filter(Boolean)
    : [];
  const assignedPartIds = Array.isArray(job?.parts) 
    ? job.parts.map((part: any) => part?.product).filter(Boolean)
    : [];

  // Apply search filters and availability filters
  const filteredTechnicians = technicians
    .filter((tech: any) => !assignedTechnicianIds.includes(tech._id))
    .filter((tech: any) => {
      const searchTerm = searchTechnicians.toLowerCase();
      const name = tech.name || (tech.user ? `${tech.user.firstName || ''} ${tech.user.lastName || ''}`.trim() : tech.employeeId || 'Technician');
      const position = tech.position || '';
      const department = tech.department || '';
      return name.toLowerCase().includes(searchTerm) || 
             position.toLowerCase().includes(searchTerm) || 
             department.toLowerCase().includes(searchTerm);
    });

  const filteredTools = availableTools
    .filter((tool: any) => !assignedToolIds.includes(tool._id))
    .filter((tool: any) => {
      const searchTerm = searchTools.toLowerCase();
      const name = tool.name || '';
      const category = tool.category || '';
      const condition = tool.condition || '';
      return name.toLowerCase().includes(searchTerm) || 
             category.toLowerCase().includes(searchTerm) || 
             condition.toLowerCase().includes(searchTerm);
    });

  const filteredMachines = availableMachines
    .filter((machine: any) => !assignedMachineIds.includes(machine._id))
    .filter((machine: any) => {
      const searchTerm = searchMachines.toLowerCase();
      const name = machine.name || '';
      const model = machine.model || '';
      const category = machine.category || '';
      return name.toLowerCase().includes(searchTerm) || 
             model.toLowerCase().includes(searchTerm) || 
             category.toLowerCase().includes(searchTerm);
    });

  const filteredParts = availableParts
    .filter((part: any) => !assignedPartIds.includes(part._id))
    .filter((part: any) => {
      const searchTerm = searchParts.toLowerCase();
      const name = part.name || '';
      const sku = part.sku || '';
      const category = part.category?.name || part.category || '';
      return name.toLowerCase().includes(searchTerm) || 
             sku.toLowerCase().includes(searchTerm) || 
             String(category).toLowerCase().includes(searchTerm);
    });

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

  const toggleMachineSelection = (machineId: string) => {
    setSelectedMachines(prev => 
      prev.includes(machineId) 
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const togglePartSelection = (partId: string) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
    
    // Set default quantity to 1 when selecting a part
    if (!selectedParts.includes(partId)) {
      setPartQuantities(prev => ({
        ...prev,
        [partId]: prev[partId] || 1
      }));
    } else {
      // Remove quantity when deselecting
      setPartQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[partId];
        return newQuantities;
      });
    }
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    setPartQuantities(prev => ({
      ...prev,
      [partId]: Math.max(1, quantity)
    }));
  };

  const clearAllSelections = () => {
    setSelectedTechnicians([]);
    setSelectedTools([]);
    setSelectedMachines([]);
    setSelectedParts([]);
    setPartQuantities({});
    setAssignedPartQuantities({});
    setSearchTechnicians('');
    setSearchTools('');
    setSearchMachines('');
    setSearchParts('');
  };

  const updateAssignedPartQuantity = (partId: string, quantity: number) => {
    setAssignedPartQuantities(prev => ({
      ...prev,
      [partId]: Math.max(0, quantity)
    }));
  };

  // Separate removals from additions
  const getRemovalIds = () => {
    const removalIds: { technicians: string[]; tools: string[]; machines: string[]; parts: string[] } = {
      technicians: [] as string[],
      tools: [] as string[],
      machines: [] as string[],
      parts: [] as string[]
    };

    // Check if any selected items are actually removals (from currently assigned)
    if (Array.isArray(job?.resources?.assignedTechnicians)) {
      job.resources.assignedTechnicians.forEach((tech: any) => {
        if (selectedTechnicians.includes(tech.technicianId)) {
          removalIds.technicians.push(tech.technicianId);
        }
      });
    }

    if (Array.isArray(job?.tools)) {
      job.tools.forEach((tool: any) => {
        if (selectedTools.includes(tool.toolId)) {
          removalIds.tools.push(tool.toolId);
        }
      });
    }

    if (Array.isArray(job?.resources?.requiredMachines)) {
      job.resources.requiredMachines.forEach((machine: any) => {
        if (selectedMachines.includes(machine.machineId)) {
          removalIds.machines.push(machine.machineId);
        }
      });
    }

    if (Array.isArray(job?.parts)) {
      job.parts.forEach((part: any) => {
        if (selectedParts.includes(part.product)) {
          removalIds.parts.push(part.product);
        }
      });
    }

    return removalIds;
  };

  // Bulk update function
  const handleBulkUpdate = async () => {
    const removalIds = getRemovalIds();
    
    // Filter out removals from additions
    const newTechnicians = selectedTechnicians.filter(id => !removalIds.technicians.includes(id));
    const newTools = selectedTools.filter(id => !removalIds.tools.includes(id));
    const newMachines = selectedMachines.filter(id => !removalIds.machines.includes(id));
    const newParts = selectedParts.filter(id => !removalIds.parts.includes(id));

    if (newTechnicians.length === 0 && newTools.length === 0 && newMachines.length === 0 && newParts.length === 0 &&
        removalIds.technicians.length === 0 && removalIds.tools.length === 0 && removalIds.machines.length === 0 && removalIds.parts.length === 0 &&
        Object.keys(assignedPartQuantities).length === 0) {
      toast.error('Please select at least one resource to update');
      return;
    }

    setIsUpdating(true);
    try {
              // Handle additions if any
              if (newTechnicians.length > 0 || newTools.length > 0 || newMachines.length > 0 || newParts.length > 0) {
                const assignmentData = {
                  technicians: newTechnicians.map(id => ({ technicianId: id, role: 'technician' })),
                  tools: newTools.map(id => ({ toolId: id })),
                  machines: newMachines.map(id => ({ machineId: id })),
                  parts: newParts.map(id => ({ productId: id, quantity: partQuantities[id] || 1 }))
                };

                await api.post(`/workshop/${job._id}/assign-resources`, assignmentData);
              }

              // Prepare update data with part quantities and other changes
              const updateData: any = {};

              // Handle assigned part quantity updates if any
              if (Object.keys(assignedPartQuantities).length > 0) {
                updateData.partQuantities = Object.entries(assignedPartQuantities).map(([partId, quantity]) => ({
                  productId: partId,
                  quantity: quantity
                }));
              }

              // Handle removals if any
              if (removalIds.technicians.length > 0 || removalIds.tools.length > 0 || removalIds.machines.length > 0 || removalIds.parts.length > 0) {
                const removalData = {
                  technicians: removalIds.technicians,
                  tools: removalIds.tools,
                  machines: removalIds.machines,
                  parts: removalIds.parts
                };

                await api.put(`/workshop/${job._id}/update-resources`, removalData);
              }

              // Send all updates in one API call
              if (Object.keys(updateData).length > 0) {
                await api.put(`/workshop/${job._id}`, updateData);
              }

      const totalAdditions = newTechnicians.length + newTools.length + newMachines.length + newParts.length;
      const totalRemovals = removalIds.technicians.length + removalIds.tools.length + removalIds.machines.length + removalIds.parts.length;
      
      let message = 'Successfully updated resources: ';
      if (totalAdditions > 0) {
        message += `${totalAdditions} added`;
      }
      if (totalAdditions > 0 && totalRemovals > 0) {
        message += ', ';
      }
      if (totalRemovals > 0) {
        message += `${totalRemovals} removed`;
      }

      toast.success(message);

      // Clear selections and refresh data
      clearAllSelections();
      queryClient.invalidateQueries({ queryKey: ['available-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['available-machines'] });
      queryClient.invalidateQueries({ queryKey: ['available-tools'] });
      queryClient.invalidateQueries({ queryKey: ['available-parts'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update resources';
      toast.error(errorMessage);
      console.error('Bulk update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle job info update
  const handleJobInfoUpdate = async () => {
    setIsUpdating(true);
    try {
      const updatedJobInfo: any = {
        ...jobInfo
      };
      
      // Include vehicle timeForCollection (even if empty to allow clearing)
      updatedJobInfo.vehicle = {
        timeForCollection: jobInfo.expectedCollection || null
      };
      
      await api.put(`/workshop/${job._id}/update-task`, updatedJobInfo);
      toast.success('Job information updated successfully');
      setIsEditingJobInfo(false);
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update job information');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Information Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-gray-900">Job Information</h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditingJobInfo(!isEditingJobInfo)}
          >
            {isEditingJobInfo ? 'Cancel Edit' : 'Edit Job Info'}
          </Button>
        </div>
        
        {!isEditingJobInfo ? (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Job:</span> {String(job?.title || job?.jobNumber || job?._id || 'N/A')}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Customer:</span> {String(job?.customer?.fullName || (job?.customer?.firstName && job?.customer?.lastName ? `${job.customer.firstName} ${job.customer.lastName}` : 'N/A') || job?.customerName || 'N/A')}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Status:</span> {String(job?.status || 'N/A')}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Priority:</span> {String(job?.priority || 'N/A')}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Progress:</span> {String(job?.progress || 0)}%
            </p>
          </div>
        ) : (
          <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Job Title"
                value={jobInfo.title}
                onChange={(e) => setJobInfo(prev => ({ ...prev, title: e.target.value }))}
            required
          />
          <Select
            label="Priority"
                value={jobInfo.priority}
                onChange={(e) => setJobInfo(prev => ({ ...prev, priority: e.target.value }))}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'urgent', label: 'Urgent' }
            ]}
          />
          <Select
            label="Status"
                value={jobInfo.status}
                onChange={(e) => setJobInfo(prev => ({ ...prev, status: e.target.value }))}
            options={[
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
                value={jobInfo.deadline}
                onChange={(e) => setJobInfo(prev => ({ ...prev, deadline: e.target.value }))}
          />
          <Input
            label="Expected Collection"
            type="datetime-local"
                value={jobInfo.expectedCollection}
                onChange={(e) => setJobInfo(prev => ({ ...prev, expectedCollection: e.target.value }))}
          />
        </div>
        <TextArea
          label="Description"
              value={jobInfo.description}
              onChange={(e) => setJobInfo(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
        />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <Button
                variant="outline"
                onClick={() => setIsEditingJobInfo(false)}
                disabled={isUpdating}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleJobInfoUpdate}
                disabled={isUpdating || job.status === 'completed'}
                className={`w-full sm:w-auto ${job.status === 'completed' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                title={job.status === 'completed' ? 'Cannot update job info for completed job' : ''}
              >
                {isUpdating ? 'Updating...' : 'Update Job Info'}
              </Button>
      </div>
          </div>
        )}
        </div>

      {/* 1. Tools Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">1. Tools Management</h3>
          <span className="text-sm text-gray-500">
            {selectedTools.length} new selected
          </span>
            </div>

        {/* Currently Assigned Tools */}
        {Array.isArray(job?.tools) && job.tools.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Currently Assigned Tools</h4>
            <div className="grid grid-cols-3 gap-3 max-h-32 overflow-y-auto border border-blue-200 rounded-lg p-3 bg-blue-50">
              {job.tools.map((tool: any, index: number) => (
                <div key={`assigned-${index}`} className="flex items-center justify-between bg-white border border-blue-200 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900">{String(tool.name || 'Unnamed Tool')}</p>
                    <p className="text-xs text-blue-600">
                      {String(tool.category || 'N/A')} • {String(tool.condition || 'N/A')}
                    </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                    onClick={() => {
                      // Add to removal list
                      setSelectedTools(prev => [...prev, tool.toolId]);
                    }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                    title="Mark for removal"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
        )}

        {/* Search for New Tools */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Add New Tools</h4>
          <Input
            type="text"
            placeholder="Search tools by name, category, or condition..."
            value={String(searchTools || '')}
            onChange={(e) => setSearchTools(e.target.value)}
            className="w-full"
          />
            </div>

        {/* Available Tools Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
          {filteredTools.map((tool: any) => (
            <label key={tool._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedTools.includes(tool._id)}
                onChange={() => toggleToolSelection(tool._id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{String(tool.name || 'Unnamed Tool')}</p>
                <p className="text-xs text-gray-500">
                  {String(tool.toolNumber && `${tool.toolNumber} • ` || '')}
                  {String(tool.category || 'N/A')} • {String(tool.condition || 'N/A')}
                </p>
              </div>
            </label>
          ))}
          </div>

        {filteredTools.length === 0 && !toolsLoading && (
          <p className="text-gray-500 text-center py-4">No available tools found</p>
        )}

        {toolsError && (
          <p className="text-red-600 text-sm">Error loading tools: {String(toolsError?.message || 'Unknown error')}</p>
        )}
                </div>

      {/* 2. Machines Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">2. Machines Management</h3>
          <span className="text-sm text-gray-500">
            {selectedMachines.length} new selected
                    </span>
        </div>

        {/* Currently Assigned Machines */}
        {Array.isArray(job?.resources?.requiredMachines) && job.resources.requiredMachines.length > 0 && (
              <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Currently Assigned Machines</h4>
            <div className="grid grid-cols-3 gap-3 max-h-32 overflow-y-auto border border-purple-200 rounded-lg p-3 bg-purple-50">
              {job.resources.requiredMachines.map((machine: any, index: number) => (
                <div key={`assigned-${index}`} className="flex items-center justify-between bg-white border border-purple-200 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-purple-900">{String(machine.name || 'Unnamed Machine')}</p>
                        <p className="text-xs text-purple-600">
                      {String(machine.model || 'N/A')} • {String(machine.category || 'N/A')}
                        </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                      // Add to removal list
                      setSelectedMachines(prev => [...prev, machine.machineId]);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                    title="Mark for removal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
        )}

        {/* Search for New Machines */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Add New Machines</h4>
              <Input
            type="text"
            placeholder="Search machines by name, model, or category..."
            value={String(searchMachines || '')}
            onChange={(e) => setSearchMachines(e.target.value)}
            className="w-full"
          />
          </div>

        {/* Available Machines Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
          {filteredMachines.map((machine: any) => (
            <label key={machine._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedMachines.includes(machine._id)}
                onChange={() => toggleMachineSelection(machine._id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{String(machine.name || 'Unnamed Machine')}</p>
                <p className="text-xs text-gray-500">
                  {String(machine.model || 'N/A')} • {String(machine.category || 'N/A')}
                </p>
                </div>
            </label>
          ))}
              </div>

        {filteredMachines.length === 0 && !machinesLoading && (
          <p className="text-gray-500 text-center py-4">No available machines found</p>
        )}

        {machinesError && (
          <p className="text-red-600 text-sm">Error loading machines: {String(machinesError?.message || 'Unknown error')}</p>
        )}
                </div>

      {/* 3. Technicians Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">3. Technicians Management</h3>
          <span className="text-sm text-gray-500">
            {selectedTechnicians.length} new selected
                  </span>
        </div>

        {/* Currently Assigned Technicians */}
        {Array.isArray(job?.resources?.assignedTechnicians) && job.resources.assignedTechnicians.length > 0 && (
              <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Currently Assigned Technicians</h4>
            <div className="grid grid-cols-3 gap-3 max-h-32 overflow-y-auto border border-green-200 rounded-lg p-3 bg-green-50">
              {job.resources.assignedTechnicians.map((tech: any, index: number) => (
                <div key={`assigned-${index}`} className="flex items-center justify-between bg-white border border-green-200 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900">
                      {String(tech.technician?.user ? `${tech.technician.user.firstName || ''} ${tech.technician.user.lastName || ''}`.trim() : tech.technician?.employeeId || 'Technician')}
                    </p>
                    <p className="text-xs text-green-600">
                      {String(tech.role || 'N/A')} • {String(tech.technician?.position || 'N/A')}
                    </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                      // Add to removal list
                      setSelectedTechnicians(prev => [...prev, tech.technicianId]);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                    title="Mark for removal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </Button>
                  </div>
                ))}
                        </div>
                      </div>
        )}

        {/* Search for New Technicians */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Add New Technicians</h4>
          <Input
            type="text"
            placeholder="Search technicians by name, position, or department..."
            value={String(searchTechnicians || '')}
            onChange={(e) => setSearchTechnicians(e.target.value)}
            className="w-full"
          />
                    </div>

        {/* Available Technicians Grid - 3 columns */}
        <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
          {filteredTechnicians.map((tech: any) => (
            <label key={tech._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
              <input
                type="checkbox"
                checked={selectedTechnicians.includes(tech._id)}
                onChange={() => toggleTechnicianSelection(tech._id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {String(tech.name || (tech.user ? `${tech.user.firstName || ''} ${tech.user.lastName || ''}`.trim() : tech.employeeId || 'Technician'))}
                </p>
                <p className="text-xs text-gray-500">
                  {String(tech.position || 'N/A')} - {String(tech.department || 'N/A')}
                </p>
              </div>
            </label>
          ))}
            </div>

        {filteredTechnicians.length === 0 && !techniciansLoading && (
          <p className="text-gray-500 text-center py-4">No available technicians found</p>
        )}

        {techniciansError && (
          <p className="text-red-600 text-sm">Error loading technicians: {String(techniciansError?.message || 'Unknown error')}</p>
        )}
          </div>

      {/* 4. Parts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">4. Parts Management</h3>
          <span className="text-sm text-gray-500">
            {selectedParts.length} new selected
                  </span>
        </div>

        {/* Currently Assigned Parts */}
        {Array.isArray(job?.parts) && job.parts.length > 0 && (
              <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Currently Assigned Parts</h4>
            <div className="grid grid-cols-3 gap-3 max-h-32 overflow-y-auto border border-orange-200 rounded-lg p-3 bg-orange-50">
              {job.parts.map((part: any, index: number) => (
                <div key={`assigned-${index}`} className="flex items-center justify-between bg-white border border-orange-200 rounded-lg p-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orange-900">{String(part.productName || 'Unnamed Part')}</p>
                    <p className="text-xs text-orange-600">
                      {String(part.productSku || 'N/A')} • Stock: {String(part.product?.inventory?.currentStock || 0)}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <label className="text-xs text-orange-600">Qty:</label>
                      <input
                        type="number"
                        min="0"
                        max={part.product?.inventory?.currentStock || 999}
                        value={assignedPartQuantities[part.product] !== undefined ? assignedPartQuantities[part.product] : part.quantityRequired || 0}
                        onChange={(e) => updateAssignedPartQuantity(part.product, parseInt(e.target.value) || 0)}
                        className="w-16 px-2 py-1 text-xs border border-orange-300 rounded focus:ring-orange-500 focus:border-orange-500"
                      />
        </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                      // Add to removal list
                      setSelectedParts(prev => [...prev, part.product]);
                    }}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-2"
                    title="Mark for removal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
                    </Button>
            </div>
                ))}
                        </div>
                      </div>
        )}

        {/* Search for New Parts */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Add New Parts</h4>
          <Input
            type="text"
            placeholder="Search parts by name, SKU, or category..."
            value={String(searchParts || '')}
            onChange={(e) => setSearchParts(e.target.value)}
            className="w-full"
          />
            </div>

                {/* Available Parts Grid - 3 columns */}
                <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                  {filteredParts.map((part: any) => (
                    <div key={part._id} className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedParts.includes(part._id)}
                        onChange={() => togglePartSelection(part._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{String(part.name || 'Unnamed Part')}</p>
                        <p className="text-xs text-gray-500">
                          {String(part.sku || 'N/A')} • {String(part.category?.name || part.category || 'N/A')}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          Stock: {part.inventory?.currentStock || 0}
                        </p>
                      </div>
                      {selectedParts.includes(part._id) && (
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-gray-600">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max={part.inventory?.currentStock || 999}
                            value={partQuantities[part._id] || 1}
                            onChange={(e) => updatePartQuantity(part._id, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
            </div>
                      )}
                    </div>
                  ))}
          </div>

        {filteredParts.length === 0 && !partsLoading && (
          <p className="text-gray-500 text-center py-4">No available parts found</p>
        )}

        {partsError && (
          <p className="text-red-600 text-sm">Error loading parts: {String(partsError?.message || 'Unknown error')}</p>
        )}
      </div>

      {/* Bulk Update Actions */}
      {(selectedTechnicians.length > 0 || selectedTools.length > 0 || selectedMachines.length > 0 || selectedParts.length > 0 || Object.keys(assignedPartQuantities).length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
          <div>
              <h3 className="text-lg font-medium text-blue-900">Ready to Update Resources</h3>
              <div className="text-sm text-blue-700 mt-1">
                {(() => {
                  const removalIds = getRemovalIds();
                  const newTechnicians = selectedTechnicians.filter(id => !removalIds.technicians.includes(id));
                  const newTools = selectedTools.filter(id => !removalIds.tools.includes(id));
                  const newMachines = selectedMachines.filter(id => !removalIds.machines.includes(id));
                  const newParts = selectedParts.filter(id => !removalIds.parts.includes(id));
                  
                  const additions = [];
                  const removals = [];
                  const updates = [];
                  
                  if (newTechnicians.length > 0) additions.push(`${newTechnicians.length} technician${newTechnicians.length !== 1 ? 's' : ''}`);
                  if (newTools.length > 0) additions.push(`${newTools.length} tool${newTools.length !== 1 ? 's' : ''}`);
                  if (newMachines.length > 0) additions.push(`${newMachines.length} machine${newMachines.length !== 1 ? 's' : ''}`);
                  if (newParts.length > 0) additions.push(`${newParts.length} part${newParts.length !== 1 ? 's' : ''}`);
                  
                  if (removalIds.technicians.length > 0) removals.push(`${removalIds.technicians.length} technician${removalIds.technicians.length !== 1 ? 's' : ''}`);
                  if (removalIds.tools.length > 0) removals.push(`${removalIds.tools.length} tool${removalIds.tools.length !== 1 ? 's' : ''}`);
                  if (removalIds.machines.length > 0) removals.push(`${removalIds.machines.length} machine${removalIds.machines.length !== 1 ? 's' : ''}`);
                  if (removalIds.parts.length > 0) removals.push(`${removalIds.parts.length} part${removalIds.parts.length !== 1 ? 's' : ''}`);
                  
                  if (Object.keys(assignedPartQuantities).length > 0) updates.push(`${Object.keys(assignedPartQuantities).length} part quantity${Object.keys(assignedPartQuantities).length !== 1 ? 'ies' : 'y'}`);
                  
                  let message = '';
                  if (additions.length > 0) {
                    message += `Add: ${additions.join(', ')}`;
                  }
                  if (additions.length > 0 && removals.length > 0) {
                    message += ' • ';
                  }
                  if (removals.length > 0) {
                    message += `Remove: ${removals.join(', ')}`;
                  }
                  if ((additions.length > 0 || removals.length > 0) && updates.length > 0) {
                    message += ' • ';
                  }
                  if (updates.length > 0) {
                    message += `Update: ${updates.join(', ')}`;
                  }
                  
                  return message;
                })()}
              </div>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={clearAllSelections}
                disabled={isUpdating}
                className="w-full sm:w-auto"
               >
                 Clear All
                 </Button>
                 <Button
                 onClick={handleBulkUpdate}
                 disabled={isUpdating || job.status === 'completed'}
                 className={`w-full sm:w-auto ${job.status === 'completed' ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                 title={job.status === 'completed' ? 'Cannot update resources for completed job' : ''}
               >
                 {isUpdating ? 'Updating...' : 'Update Resources'}
               </Button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </div>
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

  // Fetch available machines
  const { data: machinesData, isLoading: machinesLoading, error: machinesError } = useQuery({
    queryKey: ['available-machines'],
    queryFn: () => api.get('/workshop/available-machines'),
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
  
  const availableMachines = Array.isArray(machinesData?.data?.data) ? machinesData.data.data : [];
  
  // Get currently assigned machines for this job
  const assignedMachines = Array.isArray(job.resources?.requiredMachines) ? job.resources.requiredMachines : [];
  
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
    if (!selectedMachineId || !machineBookingUntil) {
      toast.error('Please select a machine and booking date');
      return;
    }
    // Use enhanced endpoint and react-query flow
    bookMachineMutation.mutate({
      jobId: job._id,
      data: { machineId: selectedMachineId, until: machineBookingUntil }
    });
    setSelectedMachineId('');
    setMachineBookingUntil('');
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
          label="Estimated Duration (hours)"
          type="number"
          step="0.5"
          value={formData.estimatedDuration}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, estimatedDuration: e.target.value }))}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Close
        </Button>
        <Button type="submit" loading={loading} className="w-full sm:w-auto">
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
  updateTaskStatusMutation: any;
}> = ({ job, onClose, updateTaskStatusMutation }) => {
  const { company } = useSettings();
  
  // Fetch fresh job data to ensure tasks are up-to-date
  const { data: jobData, isLoading: isJobLoading } = useQuery({
    queryKey: ['workshop-job', job._id],
    queryFn: () => enhancedWorkshopAPI.getJobById(job._id),
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch to get latest task status
  });

  // Fetch customer data if available
  const { data: customerData } = useQuery({
    queryKey: ['customer', job.customer],
    queryFn: () => customersAPI.getCustomerById(job.customer),
    enabled: !!job.customer,
    staleTime: 5 * 60 * 1000,
  });

  // Use fresh job data if available, otherwise fall back to prop
  const currentJob = jobData?.data?.data || job;
  const customer = customerData?.data?.data || null;

  // Show loading state if query is loading and no cached data
  if (isJobLoading && !jobData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }
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

  const formatOdometer = (value: any) => {
    if (value === null || value === undefined || value === '') return 'N/A';
    const numericValue = Number(value);
    if (Number.isNaN(numericValue)) return String(value);
    return `${numericValue.toLocaleString()} km`;
  };

  const formatFuelLevel = (level: string | undefined) => {
    if (!level) return 'N/A';
    const fuelMap: Record<string, string> = {
      E: 'Empty',
      '1/4': '¼ Tank',
      '1/2': 'Half Tank',
      '3/4': '¾ Tank',
      F: 'Full'
    };
    return fuelMap[level] || level;
  };

  const precheckIssues = Object.entries(currentJob.precheck || {})
    .filter(([key, value]) => typeof value === 'boolean' && value)
    .map(([key]) => key.replace(/([A-Z])/g, ' $1').trim());

  const handleDownloadJobCard = async () => {
    try {
      await generateJobCardPDF({
        job: currentJob,
        company: company || {},
        customer: customer
      });
      toast.success('Job card downloaded successfully');
    } catch (error) {
      console.error('Error generating job card PDF:', error);
      toast.error('Failed to generate job card PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Job Header */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-900">{currentJob.title}</h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadJobCard}
              className="flex items-center gap-2"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
              Download Job Card
            </Button>
            <Badge color={getStatusColor(currentJob.status)}>
              {currentJob.status.replace('_', ' ')}
            </Badge>
          </div>
        </div>
        {currentJob.description && (
          <p className="text-gray-600">{currentJob.description}</p>
        )}
      </div>

      {/* Job Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Job Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Priority:</span>
              <Badge color={currentJob.priority === 'urgent' ? 'red' : currentJob.priority === 'high' ? 'orange' : 'blue'}>
                {currentJob.priority}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Created:</span>
              <span className="text-sm text-gray-900">{formatDate(currentJob.createdAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Job Card:</span>
              <span className="text-sm text-gray-900">{currentJob.jobCard?.cardNumber || 'N/A'}</span>
            </div>
            {currentJob.deadline && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Deadline:</span>
                <span className={`text-sm ${new Date(currentJob.deadline) < new Date() && currentJob.status !== 'completed' ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                  {formatDate(currentJob.deadline)}
                  {new Date(currentJob.deadline) < new Date() && currentJob.status !== 'completed' && (
                    <span className="ml-1 text-xs">(Overdue)</span>
                  )}
                </span>
              </div>
            )}
            {currentJob.vehicle?.timeIn && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Time In:</span>
                <span className="text-sm text-gray-900">
                  {formatDate(currentJob.vehicle.timeIn)} {new Date(currentJob.vehicle.timeIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )}
            {currentJob.vehicle?.timeForCollection && (
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Expected Collection:</span>
                <span className="text-sm text-gray-900">
                  {formatDate(currentJob.vehicle.timeForCollection)} {new Date(currentJob.vehicle.timeForCollection).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
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
                <span className="text-gray-900">{currentJob.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                  style={{ width: `${currentJob.progress || 0}%` }}
                ></div>
              </div>
            </div>
            {(() => {
              const totalEstimated = currentJob.totalEstimatedDuration || 0;
              const totalActual = currentJob.totalActualDuration || 0;
              const formatDuration = (hours: number) => {
                if (hours < 1) return `${Math.round(hours * 60)}m`;
                const wholeHours = Math.floor(hours);
                const remainingMinutes = Math.round((hours - wholeHours) * 60);
                return remainingMinutes > 0 ? `${wholeHours}h ${remainingMinutes}m` : `${wholeHours}h`;
              };
              return (totalEstimated > 0 || totalActual > 0) ? (
                <div className="mt-4 space-y-2">
                  {totalEstimated > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Estimated Hours:</span>
                      <span className="text-gray-900">{formatDuration(totalEstimated)}</span>
                    </div>
                  )}
                  {totalActual > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Actual Hours:</span>
                      <span className={`font-medium ${totalActual > totalEstimated ? 'text-red-600' : 'text-gray-900'}`}>
                        {formatDuration(totalActual)}
                        {totalActual > totalEstimated && <ExclamationTriangleIcon className="inline w-4 h-4 ml-1" />}
                      </span>
                    </div>
                  )}
                  {totalActual > totalEstimated && (
                    <div className="mt-2 p-2 bg-red-50 rounded text-xs text-red-800">
                      ⚠️ This job is overdue based on actual hours exceeding estimated hours
                    </div>
                  )}
                </div>
              ) : null;
            })()}
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      {currentJob.vehicle && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Vehicle Information</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentJob.vehicle.make && (
                <div>
                  <span className="text-sm text-gray-600">Make:</span>
                  <span className="text-sm text-gray-900 ml-2">{currentJob.vehicle.make}</span>
                </div>
              )}
              {currentJob.vehicle.model && (
                <div>
                  <span className="text-sm text-gray-600">Model:</span>
                  <span className="text-sm text-gray-900 ml-2">{currentJob.vehicle.model}</span>
                </div>
              )}
              {currentJob.vehicle.regNumber && (
                <div>
                  <span className="text-sm text-gray-600">Registration:</span>
                  <span className="text-sm text-gray-900 ml-2">{currentJob.vehicle.regNumber}</span>
                </div>
              )}
              {currentJob.vehicle.vinNumber && (
                <div>
                  <span className="text-sm text-gray-600">VIN:</span>
                  <span className="text-sm text-gray-900 ml-2">{currentJob.vehicle.vinNumber}</span>
                </div>
              )}
              <div>
                <span className="text-sm text-gray-600">Odometer:</span>
                <span className="text-sm text-gray-900 ml-2">{formatOdometer(currentJob.vehicle.odometer)}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">Fuel Level:</span>
                <span className="text-sm text-gray-900 ml-2">{formatFuelLevel(currentJob.precheck?.fuelLevel)}</span>
              </div>
              {currentJob.precheck?.overallCondition && (
                <div>
                  <span className="text-sm text-gray-600">Overall Condition:</span>
                  <span className="text-sm text-gray-900 ml-2 capitalize">{currentJob.precheck.overallCondition}</span>
                </div>
              )}
            </div>
            {currentJob.precheck?.otherComments && (
              <div className="mt-3">
                <span className="text-sm text-gray-600 block">Additional Comments:</span>
                <p className="text-sm text-gray-900">{currentJob.precheck.otherComments}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vehicle Pre-check Summary */}
      {(precheckIssues.length > 0) && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Pre-check Findings</h3>
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
            <p className="text-sm text-yellow-800 mb-2">The following items were flagged during intake:</p>
            <div className="flex flex-wrap gap-2">
              {precheckIssues.map((issue) => (
                <span
                  key={issue}
                  className="text-xs font-medium bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full capitalize"
                >
                  {issue}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Repair Request */}
      {currentJob.repairRequest && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Repair Request</h3>
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-gray-900">{currentJob.repairRequest}</p>
          </div>
        </div>
      )}

      {/* Assigned Technicians */}
      {currentJob.resources?.assignedTechnicians?.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Assigned Technicians</h3>
          <div className="space-y-2">
            {currentJob.resources?.assignedTechnicians?.map((tech: any, index: number) => (
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
      {currentJob.tasks?.length > 0 && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Tasks</h3>
          <div className="space-y-2">
            {currentJob.tasks?.map((task: any, index: number) => (
              <div key={index} className="border border-gray-200 p-3 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                  <div className="flex items-center gap-2">
                    <Badge color={
                      task.status === 'completed' ? 'green' :
                      task.status === 'in_progress' ? 'orange' :
                      task.status === 'todo' ? 'gray' : 'blue'
                    }>
                      {task.status.replace('_', ' ')}
                    </Badge>
                    
                    {/* Task Status Update Buttons */}
                    <div className="flex gap-1">
                      {task.status === 'todo' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentJob.status === 'completed'}
                          onClick={() => updateTaskStatusMutation.mutate({
                            jobId: currentJob._id,
                            taskId: task._id,
                            data: { status: 'in_progress' }
                          })}
                          className={`text-xs px-2 py-1 ${currentJob.status === 'completed' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={currentJob.status === 'completed' ? 'Cannot update tasks in completed job' : 'Start task'}
                        >
                          Start
                        </Button>
                      )}
                      {task.status === 'in_progress' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentJob.status === 'completed'}
                          onClick={() => updateTaskStatusMutation.mutate({
                            jobId: currentJob._id,
                            taskId: task._id,
                            data: { status: 'completed' }
                          })}
                          className={`text-xs px-2 py-1 ${currentJob.status === 'completed' ? 'opacity-50 cursor-not-allowed' : 'text-green-600 hover:text-green-700'}`}
                          title={currentJob.status === 'completed' ? 'Cannot update tasks in completed job' : 'Complete task'}
                        >
                          Complete
                        </Button>
                      )}
                      {task.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={currentJob.status === 'completed'}
                          onClick={() => updateTaskStatusMutation.mutate({
                            jobId: currentJob._id,
                            taskId: task._id,
                            data: { status: 'in_progress' }
                          })}
                          className={`text-xs px-2 py-1 ${currentJob.status === 'completed' ? 'opacity-50 cursor-not-allowed' : 'text-orange-600 hover:text-orange-700'}`}
                          title={currentJob.status === 'completed' ? 'Cannot update tasks in completed job' : 'Reopen task'}
                        >
                          Reopen
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                {task.description && (
                  <p className="text-sm text-gray-600">{task.description}</p>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {task.estimatedDuration > 0 && (
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      <span>Est. {(() => {
                        const hours = task.estimatedDuration;
                        if (hours < 1) return `${Math.round(hours * 60)}m`;
                        const wholeHours = Math.floor(hours);
                        const remainingMinutes = Math.round((hours - wholeHours) * 60);
                        return remainingMinutes > 0 ? `${wholeHours}h ${remainingMinutes}m` : `${wholeHours}h`;
                      })()}</span>
                    </div>
                  )}
                  {task.actualDuration > 0 && (
                    <div className="flex items-center">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      <span className={task.actualDuration > task.estimatedDuration ? 'text-red-600 font-medium' : ''}>
                        Actual: {(() => {
                          const hours = task.actualDuration;
                          if (hours < 1) return `${Math.round(hours * 60)}m`;
                          const wholeHours = Math.floor(hours);
                          const remainingMinutes = Math.round((hours - wholeHours) * 60);
                          return remainingMinutes > 0 ? `${wholeHours}h ${remainingMinutes}m` : `${wholeHours}h`;
                        })()}
                        {task.actualDuration > task.estimatedDuration && <ExclamationTriangleIcon className="inline w-3 h-3 ml-1" />}
                      </span>
                    </div>
                  )}
                  {task.assignee && (
                    <div className="flex items-center">
                      <UserIcon className="h-3 w-3 mr-1" />
                      <span>Assigned to: {task.assignee.firstName} {task.assignee.lastName}</span>
                    </div>
                  )}
                </div>
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
  
  // Selection states for all resources
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedMachines, setSelectedMachines] = useState<string[]>([]);
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [partQuantities, setPartQuantities] = useState<{[key: string]: number}>({});
  
  // Search states for each resource type
  const [searchTechnicians, setSearchTechnicians] = useState('');
  const [searchTools, setSearchTools] = useState('');
  const [searchMachines, setSearchMachines] = useState('');
  const [searchParts, setSearchParts] = useState('');
  
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

  // Fetch available parts (products)
  const { data: availablePartsData, error: partsError, isLoading: partsLoading } = useQuery({
    queryKey: ['available-parts'],
    queryFn: () => api.get('/products'),
  });

  // Basic safety check
  if (!job || typeof job !== 'object') {
    console.error('❌ ERROR: Invalid job data provided');
    return (
      <div className="p-4">
        <p className="text-red-600">Invalid job data</p>
        <Button onClick={onCancel}>Close</Button>
      </div>
    );
  }

  // Safe data extraction with fallbacks
  const technicians = Array.isArray(techniciansData?.data?.technicians) ? techniciansData.data.technicians : [];
  const availableTools = Array.isArray(availableToolsData?.data?.data) ? availableToolsData.data.data : [];
  const availableMachines = Array.isArray(availableMachinesData?.data?.data) ? availableMachinesData.data.data : [];
  const availableParts = Array.isArray(availablePartsData?.data?.data) ? availablePartsData.data.data : [];


  // Filter out already assigned resources with safe property access
  const assignedTechnicianIds = Array.isArray(job?.resources?.assignedTechnicians) 
    ? job.resources.assignedTechnicians.map((tech: any) => tech?.technicianId).filter(Boolean)
    : [];
  const assignedToolIds = Array.isArray(job?.tools) 
    ? job.tools.map((tool: any) => tool?.toolId).filter(Boolean)
    : [];
  const assignedMachineIds = Array.isArray(job?.resources?.requiredMachines) 
    ? job.resources.requiredMachines.map((machine: any) => machine?.machineId).filter(Boolean)
    : [];
  const assignedPartIds = Array.isArray(job?.parts) 
    ? job.parts.map((part: any) => part?.product).filter(Boolean)
    : [];

  // Apply search filters and availability filters
  const filteredTechnicians = technicians
    .filter((tech: any) => !assignedTechnicianIds.includes(tech._id))
    .filter((tech: any) => {
      const searchTerm = searchTechnicians.toLowerCase();
      const name = tech.name || (tech.user ? `${tech.user.firstName || ''} ${tech.user.lastName || ''}`.trim() : tech.employeeId || 'Technician');
      const position = tech.position || '';
      const department = tech.department || '';
      return name.toLowerCase().includes(searchTerm) || 
             position.toLowerCase().includes(searchTerm) || 
             department.toLowerCase().includes(searchTerm);
    });


  const filteredTools = availableTools
    .filter((tool: any) => !assignedToolIds.includes(tool._id))
    .filter((tool: any) => {
      const searchTerm = searchTools.toLowerCase();
      const name = tool.name || '';
      const category = tool.category || '';
      const condition = tool.condition || '';
      return name.toLowerCase().includes(searchTerm) || 
             category.toLowerCase().includes(searchTerm) || 
             condition.toLowerCase().includes(searchTerm);
    });

  const filteredMachines = availableMachines
    .filter((machine: any) => !assignedMachineIds.includes(machine._id))
    .filter((machine: any) => {
      const searchTerm = searchMachines.toLowerCase();
      const name = machine.name || '';
      const model = machine.model || '';
      const category = machine.category || '';
      return name.toLowerCase().includes(searchTerm) || 
             model.toLowerCase().includes(searchTerm) || 
             category.toLowerCase().includes(searchTerm);
    });

  const filteredParts = availableParts
    .filter((part: any) => !assignedPartIds.includes(part._id))
    .filter((part: any) => {
      const searchTerm = searchParts.toLowerCase();
      const name = part.name || '';
      const sku = part.sku || '';
      const category = part.category?.name || part.category || '';
      return name.toLowerCase().includes(searchTerm) || 
             sku.toLowerCase().includes(searchTerm) || 
             String(category).toLowerCase().includes(searchTerm);
    });

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

  const toggleMachineSelection = (machineId: string) => {
    setSelectedMachines(prev => 
      prev.includes(machineId) 
        ? prev.filter(id => id !== machineId)
        : [...prev, machineId]
    );
  };

  const togglePartSelection = (partId: string) => {
    setSelectedParts(prev => 
      prev.includes(partId) 
        ? prev.filter(id => id !== partId)
        : [...prev, partId]
    );
    
    // Set default quantity to 1 when selecting a part
    if (!selectedParts.includes(partId)) {
      setPartQuantities(prev => ({
        ...prev,
        [partId]: prev[partId] || 1
      }));
    } else {
      // Remove quantity when deselecting
      setPartQuantities(prev => {
        const newQuantities = { ...prev };
        delete newQuantities[partId];
        return newQuantities;
      });
    }
  };

  const updatePartQuantity = (partId: string, quantity: number) => {
    setPartQuantities(prev => ({
      ...prev,
      [partId]: Math.max(1, quantity)
    }));
  };

  const clearAllSelections = () => {
    setSelectedTechnicians([]);
    setSelectedTools([]);
    setSelectedMachines([]);
    setSelectedParts([]);
    setPartQuantities({});
    setSearchTechnicians('');
    setSearchTools('');
    setSearchMachines('');
    setSearchParts('');
  };

  // Bulk assignment function
  const handleBulkAssign = async () => {
    if (selectedTechnicians.length === 0 && selectedTools.length === 0 && selectedMachines.length === 0 && selectedParts.length === 0) {
      toast.error('Please select at least one resource to assign');
      return;
    }

    setIsUpdating(true);
    try {
      // Create bulk assignment payload
    const assignmentData = {
      technicians: selectedTechnicians.map(id => ({ technicianId: id, role: 'technician' })),
      tools: selectedTools.map(id => ({ toolId: id })),
      machines: selectedMachines.map(id => ({ machineId: id })),
      parts: selectedParts.map(id => ({ productId: id, quantity: partQuantities[id] || 1 }))
    };

      // Call single bulk assignment API
      await api.post(`/workshop/${job._id}/assign-resources`, assignmentData);
      
      toast.success(`Successfully assigned ${selectedTechnicians.length} technicians, ${selectedTools.length} tools, ${selectedMachines.length} machines, and ${selectedParts.length} parts`);
      
      // Clear selections and refresh data
      clearAllSelections();
      queryClient.invalidateQueries({ queryKey: ['available-technicians'] });
      queryClient.invalidateQueries({ queryKey: ['available-machines'] });
        queryClient.invalidateQueries({ queryKey: ['available-tools'] });
      queryClient.invalidateQueries({ queryKey: ['available-parts'] });
        queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });

    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to assign resources';
      toast.error(errorMessage);
      console.error('Bulk assignment error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Safety check to ensure job is valid
  if (!job || typeof job !== 'object') {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">Invalid job data provided</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <Button variant="outline" onClick={onCancel}>
            Close
          </Button>
        </div>
      </div>
    );
  }


  return (
    <div className="space-y-6">
      {/* Job Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium text-gray-900 mb-2">
          Job: {String(job?.title || job?.jobNumber || job?._id || 'N/A')}
        </h3>
        <p className="text-sm text-gray-600">
          Customer: {String(job?.customer?.fullName || job?.customer?.firstName + ' ' + job?.customer?.lastName || job?.customerName || 'N/A')}
        </p>
        <p className="text-sm text-gray-600">Status: {String(job?.status || 'N/A')}</p>
        <p className="text-sm text-gray-600">
          Priority: {String(job?.priority || 'N/A')}
        </p>
      </div>

      {/* 1. Tools Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">1. Select Tools</h3>
            <span className="text-sm text-gray-500">
            {selectedTools.length} selected
            </span>
          </div>
        
        {/* Search for Tools */}
        <Input
          type="text"
          placeholder="Search tools by name, category, or condition..."
          value={String(searchTools || '')}
          onChange={(e) => setSearchTools(e.target.value)}
          className="w-full"
        />

                {/* Tools Grid - 3 columns */}
                <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                  {filteredTools.map((tool: any) => (
                    <label key={tool._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                        checked={selectedTools.includes(tool._id)}
                        onChange={() => toggleToolSelection(tool._id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{String(tool.name || 'Unnamed Tool')}</p>
                        <p className="text-xs text-gray-500">
                          {String(tool.toolNumber && `${tool.toolNumber} • ` || '')}
                          {String(tool.category || 'N/A')} • {String(tool.condition || 'N/A')}
                        </p>
                </div>
              </label>
            ))}
          </div>
        
        {filteredTools.length === 0 && !toolsLoading && (
          <p className="text-gray-500 text-center py-4">No available tools found</p>
        )}
        
        {toolsError && (
          <p className="text-red-600 text-sm">Error loading tools: {String(toolsError?.message || 'Unknown error')}</p>
        )}
      </div>

      {/* 2. Machines Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">2. Select Machines</h3>
            <span className="text-sm text-gray-500">
            {selectedMachines.length} selected
            </span>
          </div>
        
        {/* Search for Machines */}
        <Input
          type="text"
          placeholder="Search machines by name, model, or category..."
          value={String(searchMachines || '')}
          onChange={(e) => setSearchMachines(e.target.value)}
          className="w-full"
        />

                {/* Machines Grid - 3 columns */}
                <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                  {filteredMachines.map((machine: any) => (
                    <label key={machine._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                <input
                  type="checkbox"
                        checked={selectedMachines.includes(machine._id)}
                        onChange={() => toggleMachineSelection(machine._id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{String(machine.name || 'Unnamed Machine')}</p>
                  <p className="text-xs text-gray-500">
                          {String(machine.model || 'N/A')} • {String(machine.category || 'N/A')}
                  </p>
                </div>
              </label>
            ))}
          </div>
        
        {filteredMachines.length === 0 && !machinesLoading && (
          <p className="text-gray-500 text-center py-4">No available machines found</p>
        )}
        
        {machinesError && (
          <p className="text-red-600 text-sm">Error loading machines: {String(machinesError?.message || 'Unknown error')}</p>
        )}
      </div>

      {/* 3. Technicians Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">3. Select Technicians</h3>
          <span className="text-sm text-gray-500">
            {selectedTechnicians.length} selected
          </span>
            </div>
        
        {/* Search for Technicians */}
        <Input
          type="text"
          placeholder="Search technicians by name, position, or department..."
          value={String(searchTechnicians || '')}
          onChange={(e) => setSearchTechnicians(e.target.value)}
          className="w-full"
        />

                {/* Technicians Grid - 3 columns */}
                <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                  {filteredTechnicians.map((tech: any) => (
                    <label key={tech._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedTechnicians.includes(tech._id)}
                        onChange={() => toggleTechnicianSelection(tech._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {String(tech.name || (tech.user ? `${tech.user.firstName || ''} ${tech.user.lastName || ''}`.trim() : tech.employeeId || 'Technician'))}
                        </p>
                        <p className="text-xs text-gray-500">
                          {String(tech.position || 'N/A')} - {String(tech.department || 'N/A')}
              </p>
            </div>
                    </label>
                  ))}
          </div>
        
        {filteredTechnicians.length === 0 && !techniciansLoading && (
          <p className="text-gray-500 text-center py-4">No available technicians found</p>
        )}
        
        {techniciansError && (
          <p className="text-red-600 text-sm">Error loading technicians: {String(techniciansError?.message || 'Unknown error')}</p>
          )}
        </div>

      {/* 4. Parts Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">4. Select Parts</h3>
          <span className="text-sm text-gray-500">
            {selectedParts.length} selected
          </span>
            </div>
        
        {/* Search for Parts */}
        <Input
          type="text"
          placeholder="Search parts by name, SKU, or category..."
          value={String(searchParts || '')}
          onChange={(e) => setSearchParts(e.target.value)}
          className="w-full"
        />

                {/* Parts Grid - 3 columns */}
                <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto border rounded-lg p-4">
                  {filteredParts.map((part: any) => (
                    <div key={part._id} className="flex items-center space-x-3 hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={selectedParts.includes(part._id)}
                        onChange={() => togglePartSelection(part._id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{String(part.name || 'Unnamed Part')}</p>
                        <p className="text-xs text-gray-500">
                          {String(part.sku || 'N/A')} • {String(part.category?.name || part.category || 'N/A')}
                        </p>
                        <p className="text-xs text-green-600 font-medium">
                          Stock: {part.inventory?.currentStock || 0}
              </p>
            </div>
                      {selectedParts.includes(part._id) && (
                        <div className="flex items-center space-x-2">
                          <label className="text-xs text-gray-600">Qty:</label>
                          <input
                            type="number"
                            min="1"
                            max={part.inventory?.currentStock || 999}
                            value={partQuantities[part._id] || 1}
                            onChange={(e) => updatePartQuantity(part._id, parseInt(e.target.value) || 1)}
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                            onClick={(e) => e.stopPropagation()}
                          />
            </div>
                      )}
        </div>
                  ))}
                </div>
        
        {filteredParts.length === 0 && !partsLoading && (
          <p className="text-gray-500 text-center py-4">No available parts found</p>
      )}
        
        {partsError && (
          <p className="text-red-600 text-sm">Error loading parts: {String(partsError?.message || 'Unknown error')}</p>
        )}
      </div>

      {/* Bulk Assignment Actions */}
      {(selectedTechnicians.length > 0 || selectedTools.length > 0 || selectedMachines.length > 0 || selectedParts.length > 0) && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-blue-900">Ready to Assign</h3>
              <p className="text-sm text-blue-700 mt-1">
                {selectedTechnicians.length} technician{selectedTechnicians.length !== 1 ? 's' : ''}, {' '}
                {selectedTools.length} tool{selectedTools.length !== 1 ? 's' : ''}, {' '}
                {selectedMachines.length} machine{selectedMachines.length !== 1 ? 's' : ''}, and {' '}
                {selectedParts.length} part{selectedParts.length !== 1 ? 's' : ''} selected
              </p>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={clearAllSelections}
                disabled={isUpdating}
                className="w-full sm:w-auto"
               >
                 Clear All
                 </Button>
                 <Button
                 onClick={handleBulkAssign}
                 disabled={isUpdating}
                 className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
               >
                 {isUpdating ? 'Assigning...' : 'Assign Resources'}
               </Button>
             </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </div>
  );
};

// Work Progress Visualization Component

export default WorkshopPage;
