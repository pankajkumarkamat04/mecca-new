'use client';

import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { enhancedWorkshopAPI } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import TextArea from '@/components/ui/TextArea';
import Select from '@/components/ui/Select';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import toast from 'react-hot-toast';
import { 
  DocumentTextIcon,
  PencilIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  HistoryIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface JobCardManagerProps {
  job: any;
  onClose: () => void;
}

const JobCardManager: React.FC<JobCardManagerProps> = ({ job, onClose }) => {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showHistory, setShowHistory] = useState(false);
  const [showComments, setShowComments] = useState(false);

  // Update job card mutation
  const updateJobCardMutation = useMutation({
    mutationFn: (data: any) => enhancedWorkshopAPI.updateJobCard(job._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', job._id] });
      toast.success('Job card updated successfully');
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update job card');
    },
  });

  // Add customer comment mutation
  const addCommentMutation = useMutation({
    mutationFn: (data: any) => enhancedWorkshopAPI.addCustomerComment(job._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', job._id] });
      toast.success('Comment added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add comment');
    },
  });

  // Add status update mutation
  const addStatusUpdateMutation = useMutation({
    mutationFn: (data: any) => enhancedWorkshopAPI.addStatusUpdate(job._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workshop-jobs'] });
      queryClient.invalidateQueries({ queryKey: ['workshop-job', job._id] });
      toast.success('Status update added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add status update');
    },
  });

  const handleUpdateJobCard = (formData: any) => {
    updateJobCardMutation.mutate({
      ...formData,
      changes: `Updated job card fields: ${Object.keys(formData).join(', ')}`
    });
  };

  const handleAddComment = (comment: string, customerName: string) => {
    addCommentMutation.mutate({ comment, customerName });
  };

  const handleAddStatusUpdate = (status: string, message: string) => {
    addStatusUpdateMutation.mutate({ status, message, notifyCustomer: true });
  };

  const tabs = [
    { id: 'overview', name: 'Overview', icon: DocumentTextIcon },
    { id: 'costs', name: 'Costs', icon: CurrencyDollarIcon },
    { id: 'quality', name: 'Quality', icon: ShieldCheckIcon },
    { id: 'warranty', name: 'Warranty', icon: ClockIcon },
  ];

  return (
    <Modal isOpen={true} onClose={onClose} title="Job Card Manager" size="xl">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{job.title}</h2>
            <p className="text-sm text-gray-600">
              Job Card: {job.jobCard?.cardNumber || 'Not generated'} | 
              Work Order: {job.jobCard?.workOrderNumber || 'Not generated'}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowHistory(true)}
              className="flex items-center"
            >
              <HistoryIcon className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowComments(true)}
              className="flex items-center"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
              Comments
            </Button>
            <Button
              onClick={() => setIsEditing(!isEditing)}
              className="flex items-center"
            >
              <PencilIcon className="h-4 w-4 mr-2" />
              {isEditing ? 'Cancel Edit' : 'Edit'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <OverviewTab 
              job={job} 
              isEditing={isEditing} 
              onUpdate={handleUpdateJobCard}
              loading={updateJobCardMutation.isPending}
            />
          )}
          
          {activeTab === 'costs' && (
            <CostsTab 
              job={job} 
              isEditing={isEditing} 
              onUpdate={handleUpdateJobCard}
              loading={updateJobCardMutation.isPending}
            />
          )}
          
          {activeTab === 'quality' && (
            <QualityTab 
              job={job} 
              isEditing={isEditing} 
              onUpdate={handleUpdateJobCard}
              loading={updateJobCardMutation.isPending}
            />
          )}
          
          {activeTab === 'warranty' && (
            <WarrantyTab 
              job={job} 
              isEditing={isEditing} 
              onUpdate={handleUpdateJobCard}
              loading={updateJobCardMutation.isPending}
            />
          )}
        </div>

        {/* Comments Modal */}
        <Modal
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          title="Job Comments"
        >
          <CommentsSection 
            job={job}
            onAddComment={handleAddComment}
            loading={addCommentMutation.isPending}
          />
        </Modal>

        {/* History Modal */}
        <Modal
          isOpen={showHistory}
          onClose={() => setShowHistory(false)}
          title="Job Card History"
        >
          <HistorySection job={job} />
        </Modal>
      </div>
    </Modal>
  );
};

// Overview Tab Component
const OverviewTab: React.FC<{
  job: any;
  isEditing: boolean;
  onUpdate: (data: any) => void;
  loading: boolean;
}> = ({ job, isEditing, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    workOrderNumber: job.jobCard?.workOrderNumber || '',
    estimatedCost: job.jobCard?.estimatedCost || 0,
    laborHours: job.jobCard?.laborHours || 0,
    schedulingNotes: job.scheduled?.schedulingNotes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Work Order Number"
            value={formData.workOrderNumber}
            onChange={(e) => setFormData(prev => ({ ...prev, workOrderNumber: e.target.value }))}
          />
          <Input
            label="Estimated Cost"
            type="number"
            value={formData.estimatedCost}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) }))}
          />
          <Input
            label="Labor Hours"
            type="number"
            value={formData.laborHours}
            onChange={(e) => setFormData(prev => ({ ...prev, laborHours: parseFloat(e.target.value) }))}
          />
        </div>
        <TextArea
          label="Scheduling Notes"
          value={formData.schedulingNotes}
          onChange={(e) => setFormData(prev => ({ ...prev, schedulingNotes: e.target.value }))}
          rows={3}
        />
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Job Information</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Job Card Number:</span>
              <span className="text-sm text-gray-900">{job.jobCard?.cardNumber || 'Not generated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Work Order Number:</span>
              <span className="text-sm text-gray-900">{job.jobCard?.workOrderNumber || 'Not generated'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Version:</span>
              <span className="text-sm text-gray-900">{job.jobCard?.version || 1}</span>
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
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Scheduling</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Scheduled Start:</span>
              <span className="text-sm text-gray-900">
                {job.scheduled?.start ? formatDate(job.scheduled.start) : 'Not scheduled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Scheduled End:</span>
              <span className="text-sm text-gray-900">
                {job.scheduled?.end ? formatDate(job.scheduled.end) : 'Not scheduled'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Duration:</span>
              <span className="text-sm text-gray-900">
                {job.scheduled?.estimatedDuration ? `${job.scheduled.estimatedDuration} min` : 'Not set'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Actual Duration:</span>
              <span className="text-sm text-gray-900">
                {job.scheduled?.actualDuration ? `${job.scheduled.actualDuration} min` : 'Not completed'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {job.scheduled?.schedulingNotes && (
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Scheduling Notes</h3>
          <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">
            {job.scheduled.schedulingNotes}
          </p>
        </div>
      )}
    </div>
  );
};

// Costs Tab Component
const CostsTab: React.FC<{
  job: any;
  isEditing: boolean;
  onUpdate: (data: any) => void;
  loading: boolean;
}> = ({ job, isEditing, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    estimatedCost: job.jobCard?.estimatedCost || 0,
    actualCost: job.jobCard?.actualCost || 0,
    materialCost: job.jobCard?.materialCost || 0,
    laborCost: job.jobCard?.laborCost || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Estimated Cost"
            type="number"
            step="0.01"
            value={formData.estimatedCost}
            onChange={(e) => setFormData(prev => ({ ...prev, estimatedCost: parseFloat(e.target.value) }))}
          />
          <Input
            label="Actual Cost"
            type="number"
            step="0.01"
            value={formData.actualCost}
            onChange={(e) => setFormData(prev => ({ ...prev, actualCost: parseFloat(e.target.value) }))}
          />
          <Input
            label="Material Cost"
            type="number"
            step="0.01"
            value={formData.materialCost}
            onChange={(e) => setFormData(prev => ({ ...prev, materialCost: parseFloat(e.target.value) }))}
          />
          <Input
            label="Labor Cost"
            type="number"
            step="0.01"
            value={formData.laborCost}
            onChange={(e) => setFormData(prev => ({ ...prev, laborCost: parseFloat(e.target.value) }))}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Cost Breakdown</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Estimated Cost:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(job.jobCard?.estimatedCost || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Actual Cost:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(job.jobCard?.actualCost || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Material Cost:</span>
              <span className="text-sm text-gray-900">
                {formatCurrency(job.jobCard?.materialCost || 0)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Labor Cost:</span>
              <span className="text-sm text-gray-900">
                {formatCurrency(job.jobCard?.laborCost || 0)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Cost Analysis</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Variance:</span>
              <span className={`text-sm font-medium ${
                (job.jobCard?.actualCost || 0) > (job.jobCard?.estimatedCost || 0) 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {formatCurrency((job.jobCard?.actualCost || 0) - (job.jobCard?.estimatedCost || 0))}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Variance %:</span>
              <span className={`text-sm font-medium ${
                (job.jobCard?.actualCost || 0) > (job.jobCard?.estimatedCost || 0) 
                  ? 'text-red-600' 
                  : 'text-green-600'
              }`}>
                {job.jobCard?.estimatedCost 
                  ? `${(((job.jobCard?.actualCost || 0) - (job.jobCard?.estimatedCost || 0)) / job.jobCard.estimatedCost * 100).toFixed(1)}%`
                  : '0%'
                }
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Quality Tab Component
const QualityTab: React.FC<{
  job: any;
  isEditing: boolean;
  onUpdate: (data: any) => void;
  loading: boolean;
}> = ({ job, isEditing, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    qualityCheck: {
      checked: job.jobCard?.qualityCheck?.checked || false,
      passed: job.jobCard?.qualityCheck?.passed || false,
      notes: job.jobCard?.qualityCheck?.notes || '',
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="qualityChecked"
              checked={formData.qualityCheck.checked}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                qualityCheck: { ...prev.qualityCheck, checked: e.target.checked }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="qualityChecked" className="ml-2 text-sm text-gray-700">
              Quality Check Completed
            </label>
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="qualityPassed"
              checked={formData.qualityCheck.passed}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                qualityCheck: { ...prev.qualityCheck, passed: e.target.checked }
              }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="qualityPassed" className="ml-2 text-sm text-gray-700">
              Quality Check Passed
            </label>
          </div>

          <TextArea
            label="Quality Check Notes"
            value={formData.qualityCheck.notes}
            onChange={(e) => setFormData(prev => ({
              ...prev,
              qualityCheck: { ...prev.qualityCheck, notes: e.target.value }
            }))}
            rows={3}
          />
        </div>
        
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Quality Control</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Quality Check:</span>
            <Badge color={job.jobCard?.qualityCheck?.checked ? 'green' : 'gray'}>
              {job.jobCard?.qualityCheck?.checked ? 'Completed' : 'Pending'}
            </Badge>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Status:</span>
            <Badge color={job.jobCard?.qualityCheck?.passed ? 'green' : 'red'}>
              {job.jobCard?.qualityCheck?.passed ? 'Passed' : 'Failed'}
            </Badge>
          </div>
          {job.jobCard?.qualityCheck?.notes && (
            <div>
              <span className="text-sm text-gray-600">Notes:</span>
              <p className="text-sm text-gray-900 mt-1">{job.jobCard.qualityCheck.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Warranty Tab Component
const WarrantyTab: React.FC<{
  job: any;
  isEditing: boolean;
  onUpdate: (data: any) => void;
  loading: boolean;
}> = ({ job, isEditing, onUpdate, loading }) => {
  const [formData, setFormData] = useState({
    warrantyPeriod: job.jobCard?.warrantyPeriod || 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(formData);
  };

  if (isEditing) {
    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Warranty Period (days)"
          type="number"
          value={formData.warrantyPeriod}
          onChange={(e) => setFormData(prev => ({ ...prev, warrantyPeriod: parseInt(e.target.value) }))}
        />
        <div className="flex justify-end space-x-3">
          <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={loading}>
            Update
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Warranty Information</h3>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Warranty Period:</span>
            <span className="text-sm text-gray-900">
              {job.jobCard?.warrantyPeriod ? `${job.jobCard.warrantyPeriod} days` : 'Not set'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-gray-600">Warranty Expiry:</span>
            <span className="text-sm text-gray-900">
              {job.jobCard?.warrantyExpiry ? formatDate(job.jobCard.warrantyExpiry) : 'Not set'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Comments Section Component
const CommentsSection: React.FC<{
  job: any;
  onAddComment: (comment: string, customerName: string) => void;
  loading: boolean;
}> = ({ job, onAddComment, loading }) => {
  const [comment, setComment] = useState('');
  const [customerName, setCustomerName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (comment.trim() && customerName.trim()) {
      onAddComment(comment, customerName);
      setComment('');
      setCustomerName('');
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Customer Name"
          value={customerName}
          onChange={(e) => setCustomerName(e.target.value)}
          required
        />
        <TextArea
          label="Comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          rows={3}
          required
        />
        <Button type="submit" loading={loading}>
          Add Comment
        </Button>
      </form>

      <div className="space-y-3">
        <h3 className="text-lg font-medium text-gray-900">Comments</h3>
        {job.customerPortal?.customerComments?.map((comment: any, index: number) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-gray-900">{comment.commentedBy}</span>
              <span className="text-xs text-gray-500">{formatDate(comment.commentedAt)}</span>
            </div>
            <p className="text-sm text-gray-700">{comment.comment}</p>
          </div>
        ))}
        {(!job.customerPortal?.customerComments || job.customerPortal.customerComments.length === 0) && (
          <p className="text-gray-500 text-sm">No comments yet</p>
        )}
      </div>
    </div>
  );
};

// History Section Component
const HistorySection: React.FC<{ job: any }> = ({ job }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-gray-900">Job Card History</h3>
      {job.jobCard?.history?.map((entry: any, index: number) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-medium text-gray-900">Version {entry.version}</span>
            <span className="text-xs text-gray-500">{formatDate(entry.changedAt)}</span>
          </div>
          <p className="text-sm text-gray-700 mb-2">{entry.changes}</p>
          <p className="text-xs text-gray-500">
            Changed by: {entry.changedBy?.firstName} {entry.changedBy?.lastName}
          </p>
        </div>
      ))}
      {(!job.jobCard?.history || job.jobCard.history.length === 0) && (
        <p className="text-gray-500 text-sm">No history available</p>
      )}
    </div>
  );
};

export default JobCardManager;
