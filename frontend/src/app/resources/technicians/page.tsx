'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import Badge from '@/components/ui/Badge';
import { Technician } from '@/types';
import { techniciansAPI, usersAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { 
  UserIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  AcademicCapIcon,
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const TechniciansPage: React.FC = () => {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [position, setPosition] = useState('');
  const [status, setStatus] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSkillOpen, setIsSkillOpen] = useState(false);
  const [isCertificationOpen, setIsCertificationOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Fetch technicians
  const { data: techniciansData, isLoading } = useQuery({
    queryKey: ['technicians', currentPage, pageSize, search, department, position, status],
    queryFn: () => techniciansAPI.getTechnicians({
      page: currentPage,
      limit: pageSize,
      search,
      department,
      position,
      status
    }),
  });

  // Fetch users for technician creation
  const { data: usersData } = useQuery({
    queryKey: ['users-for-technicians'],
    queryFn: () => usersAPI.getUsers({ limit: 100 }),
  });

  // Fetch technician stats
  const { data: statsData } = useQuery({
    queryKey: ['technician-stats'],
    queryFn: () => techniciansAPI.getTechnicianStats(),
  });

  const technicians = techniciansData?.data?.data?.technicians || [];
  const pagination = techniciansData?.data?.data?.pagination || {};
  const users = usersData?.data?.data?.users || [];
  const stats = statsData?.data?.data || {};

  // Create technician mutation
  const createTechnicianMutation = useMutation({
    mutationFn: (data: any) => techniciansAPI.createTechnician(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['technician-stats'] });
      setIsCreateOpen(false);
      toast.success('Technician created successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create technician');
    },
  });

  // Update technician mutation
  const updateTechnicianMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => techniciansAPI.updateTechnician(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['technician-stats'] });
      setIsEditOpen(false);
      setSelectedTechnician(null);
      toast.success('Technician updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update technician');
    },
  });

  // Delete technician mutation
  const deleteTechnicianMutation = useMutation({
    mutationFn: (id: string) => techniciansAPI.deleteTechnician(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      queryClient.invalidateQueries({ queryKey: ['technician-stats'] });
      toast.success('Technician deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete technician');
    },
  });

  // Add skill mutation
  const addSkillMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => techniciansAPI.addSkill(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsSkillOpen(false);
      setSelectedTechnician(null);
      toast.success('Skill added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add skill');
    },
  });

  // Add certification mutation
  const addCertificationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => techniciansAPI.addCertification(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technicians'] });
      setIsCertificationOpen(false);
      setSelectedTechnician(null);
      toast.success('Certification added successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add certification');
    },
  });

  const handleCreateTechnician = (data: any) => {
    createTechnicianMutation.mutate(data);
  };

  const handleUpdateTechnician = (data: any) => {
    if (selectedTechnician) {
      updateTechnicianMutation.mutate({ id: selectedTechnician._id, data });
    }
  };

  const handleDeleteTechnician = (technician: any) => {
    if (window.confirm('Are you sure you want to delete this technician?')) {
      deleteTechnicianMutation.mutate(technician._id);
    }
  };

  const handleAddSkill = (data: any) => {
    if (selectedTechnician) {
      addSkillMutation.mutate({ id: selectedTechnician._id, data });
    }
  };

  const handleAddCertification = (data: any) => {
    if (selectedTechnician) {
      addCertificationMutation.mutate({ id: selectedTechnician._id, data });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'green';
      case 'on_leave': return 'orange';
      case 'terminated': return 'red';
      case 'retired': return 'gray';
      default: return 'gray';
    }
  };

  const getPositionColor = (position: string) => {
    switch (position) {
      case 'lead_technician': return 'purple';
      case 'senior_technician': return 'blue';
      case 'technician': return 'green';
      case 'junior_technician': return 'orange';
      default: return 'gray';
    }
  };

  const columns = [
    {
      key: 'user',
      label: 'Name',
      render: (technician: any) => (
        <div className="flex items-center">
          <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center">
            <UserIcon className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">
              {technician.user?.firstName} {technician.user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{technician.user?.email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'employeeId',
      label: 'Employee ID',
      className: 'text-gray-900'
    },
    {
      key: 'department',
      label: 'Department',
      render: (technician: any) => (
        <Badge color="blue">
          {technician.department.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'position',
      label: 'Position',
      render: (technician: any) => (
        <Badge color={getPositionColor(technician.position)}>
          {technician.position.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'employmentStatus',
      label: 'Status',
      render: (technician: any) => (
        <Badge color={getStatusColor(technician.employmentStatus)}>
          {technician.employmentStatus.replace('_', ' ')}
        </Badge>
      )
    },
    {
      key: 'skills',
      label: 'Skills',
      render: (technician: any) => (
        <div className="flex flex-wrap gap-1">
          {technician.skills?.slice(0, 3).map((skill: any, index: number) => (
            <Badge key={index} color="gray" size="sm">
              {skill.name}
            </Badge>
          ))}
          {technician.skills?.length > 3 && (
            <Badge color="gray" size="sm">
              +{technician.skills.length - 3}
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'currentJobs',
      label: 'Current Jobs',
      render: (technician: any) => (
        <span className="text-sm text-gray-900">
          {technician.currentJobs?.length || 0}
        </span>
      )
    },
    {
      key: 'expiredCertifications',
      label: 'Certifications',
      render: (technician: any) => {
        const expiredCount = technician.expiredCertifications?.length || 0;
        return (
          <div className="flex items-center">
            <span className="text-sm text-gray-900">
              {technician.certifications?.length || 0}
            </span>
            {expiredCount > 0 && (
              <ExclamationTriangleIcon className="h-4 w-4 text-red-500 ml-1" />
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (technician: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTechnician(technician);
              setIsEditOpen(true);
            }}
          >
            <PencilIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTechnician(technician);
              setIsSkillOpen(true);
            }}
          >
            <AcademicCapIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTechnician(technician);
              setIsCertificationOpen(true);
            }}
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteTechnician(technician)}
          >
            <TrashIcon className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  ];

  if (!hasPermission('technicians', 'read')) {
    return (
      <Layout>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="text-gray-600">You don't have permission to view technicians.</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Technician Management</h1>
            <p className="text-gray-600">Manage workshop technicians and their skills</p>
          </div>
          {hasPermission('technicians', 'create') && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Technician
            </Button>
          )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <UserIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Technicians</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <ClockIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CalendarIcon className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">On Leave</p>
                <p className="text-2xl font-bold text-gray-900">{stats.onLeave || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Expired Certifications</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiredCertifications || 0}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search technicians..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              options={[
                { value: '', label: 'All Departments' },
                { value: 'workshop', label: 'Workshop' },
                { value: 'diagnostics', label: 'Diagnostics' },
                { value: 'body_shop', label: 'Body Shop' },
                { value: 'paint_shop', label: 'Paint Shop' },
                { value: 'assembly', label: 'Assembly' },
                { value: 'quality_control', label: 'Quality Control' }
              ]}
            />
            <Select
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              options={[
                { value: '', label: 'All Positions' },
                { value: 'junior_technician', label: 'Junior Technician' },
                { value: 'technician', label: 'Technician' },
                { value: 'senior_technician', label: 'Senior Technician' },
                { value: 'lead_technician', label: 'Lead Technician' },
                { value: 'specialist', label: 'Specialist' },
                { value: 'supervisor', label: 'Supervisor' }
              ]}
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: '', label: 'All Status' },
                { value: 'active', label: 'Active' },
                { value: 'on_leave', label: 'On Leave' },
                { value: 'terminated', label: 'Terminated' },
                { value: 'retired', label: 'Retired' }
              ]}
            />
          </div>
        </div>

        {/* Technicians Table */}
        <div className="bg-white rounded-lg shadow">
          <DataTable
            data={technicians}
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

      {/* Create Technician Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Add New Technician"
      >
        <CreateTechnicianForm
          users={users}
          onSubmit={handleCreateTechnician}
          onCancel={() => setIsCreateOpen(false)}
          loading={createTechnicianMutation.isPending}
        />
      </Modal>

      {/* Edit Technician Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedTechnician(null);
        }}
        title="Edit Technician"
      >
        {selectedTechnician && (
          <EditTechnicianForm
            technician={selectedTechnician}
            onSubmit={handleUpdateTechnician}
            onCancel={() => {
              setIsEditOpen(false);
              setSelectedTechnician(null);
            }}
            loading={updateTechnicianMutation.isPending}
          />
        )}
      </Modal>

      {/* Add Skill Modal */}
      <Modal
        isOpen={isSkillOpen}
        onClose={() => {
          setIsSkillOpen(false);
          setSelectedTechnician(null);
        }}
        title="Add Skill"
      >
        {selectedTechnician && (
          <AddSkillForm
            technician={selectedTechnician}
            onSubmit={handleAddSkill}
            onCancel={() => {
              setIsSkillOpen(false);
              setSelectedTechnician(null);
            }}
            loading={addSkillMutation.isPending}
          />
        )}
      </Modal>

      {/* Add Certification Modal */}
      <Modal
        isOpen={isCertificationOpen}
        onClose={() => {
          setIsCertificationOpen(false);
          setSelectedTechnician(null);
        }}
        title="Add Certification"
      >
        {selectedTechnician && (
          <AddCertificationForm
            technician={selectedTechnician}
            onSubmit={handleAddCertification}
            onCancel={() => {
              setIsCertificationOpen(false);
              setSelectedTechnician(null);
            }}
            loading={addCertificationMutation.isPending}
          />
        )}
      </Modal>
    </Layout>
  );
};

// Create Technician Form Component
const CreateTechnicianForm: React.FC<{
  users: any[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ users, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    userId: '',
    employeeId: '',
    department: 'workshop',
    position: 'technician',
    hireDate: '',
    workInfo: {
      hourlyRate: '',
      maxHoursPerWeek: '40',
      preferredShift: 'morning'
    }
  });

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
        <Select
          label="User"
          value={formData.userId}
          onChange={(e) => handleInputChange('userId', e.target.value)}
          required
          options={[
            { value: '', label: 'Select User' },
            ...users.map((user: any) => ({
              value: user._id,
              label: `${user.firstName} ${user.lastName} (${user.email})`
            }))
          ]}
        />
        <Input
          label="Employee ID"
          value={formData.employeeId}
          onChange={(e) => handleInputChange('employeeId', e.target.value)}
          required
        />
        <Select
          label="Department"
          value={formData.department}
          onChange={(e) => handleInputChange('department', e.target.value)}
          required
          options={[
            { value: 'workshop', label: 'Workshop' },
            { value: 'diagnostics', label: 'Diagnostics' },
            { value: 'body_shop', label: 'Body Shop' },
            { value: 'paint_shop', label: 'Paint Shop' },
            { value: 'assembly', label: 'Assembly' },
            { value: 'quality_control', label: 'Quality Control' }
          ]}
        />
        <Select
          label="Position"
          value={formData.position}
          onChange={(e) => handleInputChange('position', e.target.value)}
          required
          options={[
            { value: 'junior_technician', label: 'Junior Technician' },
            { value: 'technician', label: 'Technician' },
            { value: 'senior_technician', label: 'Senior Technician' },
            { value: 'lead_technician', label: 'Lead Technician' },
            { value: 'specialist', label: 'Specialist' },
            { value: 'supervisor', label: 'Supervisor' }
          ]}
        />
        <Input
          label="Hire Date"
          type="date"
          value={formData.hireDate}
          onChange={(e) => handleInputChange('hireDate', e.target.value)}
          required
        />
        <Input
          label="Hourly Rate"
          type="number"
          value={formData.workInfo.hourlyRate}
          onChange={(e) => handleInputChange('workInfo.hourlyRate', e.target.value)}
        />
        <Input
          label="Max Hours Per Week"
          type="number"
          value={formData.workInfo.maxHoursPerWeek}
          onChange={(e) => handleInputChange('workInfo.maxHoursPerWeek', e.target.value)}
        />
        <Select
          label="Preferred Shift"
          value={formData.workInfo.preferredShift}
          onChange={(e) => handleInputChange('workInfo.preferredShift', e.target.value)}
          options={[
            { value: 'morning', label: 'Morning' },
            { value: 'afternoon', label: 'Afternoon' },
            { value: 'night', label: 'Night' },
            { value: 'flexible', label: 'Flexible' }
          ]}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Create Technician
        </Button>
      </div>
    </form>
  );
};

// Edit Technician Form Component
const EditTechnicianForm: React.FC<{
  technician: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ technician, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    employeeId: technician.employeeId || '',
    department: technician.department || 'workshop',
    position: technician.position || 'technician',
    employmentStatus: technician.employmentStatus || 'active',
    workInfo: {
      hourlyRate: technician.workInfo?.hourlyRate || '',
      maxHoursPerWeek: technician.workInfo?.maxHoursPerWeek || '40',
      preferredShift: technician.workInfo?.preferredShift || 'morning'
    }
  });

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
          label="Employee ID"
          value={formData.employeeId}
          onChange={(e) => handleInputChange('employeeId', e.target.value)}
          required
        />
        <Select
          label="Department"
          value={formData.department}
          onChange={(e) => handleInputChange('department', e.target.value)}
          required
          options={[
            { value: 'workshop', label: 'Workshop' },
            { value: 'diagnostics', label: 'Diagnostics' },
            { value: 'body_shop', label: 'Body Shop' },
            { value: 'paint_shop', label: 'Paint Shop' },
            { value: 'assembly', label: 'Assembly' },
            { value: 'quality_control', label: 'Quality Control' }
          ]}
        />
        <Select
          label="Position"
          value={formData.position}
          onChange={(e) => handleInputChange('position', e.target.value)}
          required
          options={[
            { value: 'junior_technician', label: 'Junior Technician' },
            { value: 'technician', label: 'Technician' },
            { value: 'senior_technician', label: 'Senior Technician' },
            { value: 'lead_technician', label: 'Lead Technician' },
            { value: 'specialist', label: 'Specialist' },
            { value: 'supervisor', label: 'Supervisor' }
          ]}
        />
        <Select
          label="Employment Status"
          value={formData.employmentStatus}
          onChange={(e) => handleInputChange('employmentStatus', e.target.value)}
          options={[
            { value: 'active', label: 'Active' },
            { value: 'on_leave', label: 'On Leave' },
            { value: 'terminated', label: 'Terminated' },
            { value: 'retired', label: 'Retired' }
          ]}
        />
        <Input
          label="Hourly Rate"
          type="number"
          value={formData.workInfo.hourlyRate}
          onChange={(e) => handleInputChange('workInfo.hourlyRate', e.target.value)}
        />
        <Input
          label="Max Hours Per Week"
          type="number"
          value={formData.workInfo.maxHoursPerWeek}
          onChange={(e) => handleInputChange('workInfo.maxHoursPerWeek', e.target.value)}
        />
        <Select
          label="Preferred Shift"
          value={formData.workInfo.preferredShift}
          onChange={(e) => handleInputChange('workInfo.preferredShift', e.target.value)}
          options={[
            { value: 'morning', label: 'Morning' },
            { value: 'afternoon', label: 'Afternoon' },
            { value: 'night', label: 'Night' },
            { value: 'flexible', label: 'Flexible' }
          ]}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Update Technician
        </Button>
      </div>
    </form>
  );
};

// Add Skill Form Component
const AddSkillForm: React.FC<{
  technician: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ technician, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'mechanical',
    level: 'intermediate',
    yearsExperience: '0'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Skill Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <Select
          label="Category"
          value={formData.category}
          onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
          required
          options={[
            { value: 'mechanical', label: 'Mechanical' },
            { value: 'electrical', label: 'Electrical' },
            { value: 'diagnostic', label: 'Diagnostic' },
            { value: 'welding', label: 'Welding' },
            { value: 'painting', label: 'Painting' },
            { value: 'assembly', label: 'Assembly' },
            { value: 'other', label: 'Other' }
          ]}
        />
        <Select
          label="Level"
          value={formData.level}
          onChange={(e) => setFormData(prev => ({ ...prev, level: e.target.value }))}
          required
          options={[
            { value: 'beginner', label: 'Beginner' },
            { value: 'intermediate', label: 'Intermediate' },
            { value: 'advanced', label: 'Advanced' },
            { value: 'expert', label: 'Expert' }
          ]}
        />
        <Input
          label="Years of Experience"
          type="number"
          value={formData.yearsExperience}
          onChange={(e) => setFormData(prev => ({ ...prev, yearsExperience: e.target.value }))}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Add Skill
        </Button>
      </div>
    </form>
  );
};

// Add Certification Form Component
const AddCertificationForm: React.FC<{
  technician: any;
  onSubmit: (data: any) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ technician, onSubmit, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    issuingBody: '',
    certificateNumber: '',
    issuedDate: '',
    expiryDate: '',
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <Input
          label="Certification Name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          required
        />
        <Input
          label="Issuing Body"
          value={formData.issuingBody}
          onChange={(e) => setFormData(prev => ({ ...prev, issuingBody: e.target.value }))}
          required
        />
        <Input
          label="Certificate Number"
          value={formData.certificateNumber}
          onChange={(e) => setFormData(prev => ({ ...prev, certificateNumber: e.target.value }))}
        />
        <Input
          label="Issued Date"
          type="date"
          value={formData.issuedDate}
          onChange={(e) => setFormData(prev => ({ ...prev, issuedDate: e.target.value }))}
          required
        />
        <Input
          label="Expiry Date"
          type="date"
          value={formData.expiryDate}
          onChange={(e) => setFormData(prev => ({ ...prev, expiryDate: e.target.value }))}
          required
        />
        <Input
          label="Notes"
          value={formData.notes}
          onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
        />
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" loading={loading}>
          Add Certification
        </Button>
      </div>
    </form>
  );
};

export default TechniciansPage;
