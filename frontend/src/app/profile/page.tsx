'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  UserIcon,
  ShieldCheckIcon,
  PaintBrushIcon,
  KeyIcon,
  PhotoIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const ProfilePage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    { id: 'appearance', name: 'Appearance', icon: PaintBrushIcon },
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadAvatar = () => {
    if (avatarFile) {
      // TODO: Implement avatar upload API call
      toast.success('Avatar uploaded successfully');
      setAvatarFile(null);
      setAvatarPreview(null);
    }
  };

  const handleDeleteAvatar = () => {
    // TODO: Implement avatar delete API call
    toast.success('Avatar deleted successfully');
  };

  const handleSaveProfile = async (data: any) => {
    setLoading(true);
    try {
      // TODO: Implement profile update API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      updateUser(data);
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (data: any) => {
    setLoading(true);
    try {
      // TODO: Implement password change API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Password changed successfully');
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Profile Information</h3>
        <p className="text-sm text-gray-600">Update your personal information and preferences.</p>
        </div>

      <div className="space-y-6">
        {/* Avatar Section */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Profile Picture</h4>
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              {avatarPreview || user?.avatar ? (
                <img
                  className="h-20 w-20 rounded-full object-cover border border-gray-300"
                  src={avatarPreview || user?.avatar}
                  alt="Profile picture"
                    />
                  ) : (
                <div className="h-20 w-20 bg-gray-100 border border-gray-300 rounded-full flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-gray-400" />
                </div>
                  )}
                </div>
            <div className="flex-1">
              <div className="flex space-x-3">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <Button variant="outline" leftIcon={<PhotoIcon className="h-4 w-4" />}>
                    {avatarFile ? 'Change Photo' : 'Upload Photo'}
                  </Button>
                </label>
                {avatarFile && (
                  <Button onClick={handleUploadAvatar} loading={loading}>
                    Upload
                </Button>
                )}
                {user?.avatar && (
                <Button
                  variant="outline"
                    onClick={handleDeleteAvatar} 
                    leftIcon={<TrashIcon className="h-4 w-4" />}
                    loading={loading}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Recommended size: 200x200px. Max file size: 5MB
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information */}
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Personal Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="First Name"
                defaultValue={user?.firstName || ''}
                fullWidth
              onChange={(e) => {
                const updatedUser = { ...user, firstName: e.target.value };
                updateUser(updatedUser);
              }}
              />
              <Input
                label="Last Name"
                defaultValue={user?.lastName || ''}
                fullWidth
              onChange={(e) => {
                const updatedUser = { ...user, lastName: e.target.value };
                updateUser(updatedUser);
              }}
              />
            <Input
              label="Email"
              type="email"
              defaultValue={user?.email || ''}
              fullWidth
              disabled
            />
            <Input
              label="Role"
              defaultValue={user?.role || ''}
              fullWidth
              disabled
            />
          </div>
        </div>

        {/* Preferences */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Preferences</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Language"
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Spanish' },
                { value: 'fr', label: 'French' },
                { value: 'de', label: 'German' },
              ]}
              defaultValue={user?.preferences?.language || 'en'}
              fullWidth
            />
            <Select
              label="Timezone"
              options={[
                { value: 'UTC', label: 'UTC' },
                { value: 'America/New_York', label: 'Eastern Time' },
                { value: 'America/Chicago', label: 'Central Time' },
                { value: 'America/Denver', label: 'Mountain Time' },
                { value: 'America/Los_Angeles', label: 'Pacific Time' },
              ]}
              defaultValue={user?.preferences?.timezone || 'UTC'}
              fullWidth
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => handleSaveProfile(user)} loading={loading}>
          Save Profile
              </Button>
            </div>
          </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Security Settings</h3>
        <p className="text-sm text-gray-600">Manage your password and security preferences.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Change Password</h4>
          <div className="space-y-4">
            <Input
              label="Current Password"
              type="password"
              fullWidth
            />
            <Input
              label="New Password"
              type="password"
              fullWidth
            />
            <Input
              label="Confirm New Password"
              type="password"
              fullWidth
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable 2FA</label>
              <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
            </div>
            <input
              type="checkbox"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Active Sessions</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">Current Session</p>
                <p className="text-sm text-gray-500">Chrome on Windows • {formatDate(new Date().toISOString())}</p>
              </div>
              <Button variant="outline" size="sm">
                Revoke
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => handleChangePassword({})} loading={loading}>
          Update Security
        </Button>
      </div>
    </div>
  );


  const renderAppearanceTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Appearance Settings</h3>
        <p className="text-sm text-gray-600">Customize how the application looks and feels.</p>
      </div>

      <div className="space-y-6">
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Theme</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="theme"
                  value="light"
                  defaultChecked={(user as any)?.preferences?.theme !== 'dark'}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Light</p>
                  <p className="text-sm text-gray-500">Clean and bright interface</p>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="theme"
                  value="dark"
                  defaultChecked={(user as any)?.preferences?.theme === 'dark'}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Dark</p>
                  <p className="text-sm text-gray-500">Easy on the eyes</p>
                </div>
              </div>
            </div>
            <div className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500">
              <div className="flex items-center space-x-3">
                <input
                  type="radio"
                  name="theme"
                  value="auto"
                  defaultChecked={(user as any)?.preferences?.theme === 'auto'}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900">Auto</p>
                  <p className="text-sm text-gray-500">Follow system preference</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Display Settings</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Date Format"
              options={[
                { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY' },
                { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY' },
                { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD' },
              ]}
              defaultValue={(user as any)?.preferences?.dateFormat || 'MM/DD/YYYY'}
              fullWidth
            />
            <Select
              label="Time Format"
              options={[
                { value: '12h', label: '12 Hour (AM/PM)' },
                { value: '24h', label: '24 Hour' },
              ]}
              defaultValue="12h"
              fullWidth
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => {}} loading={loading}>
          Save Appearance
              </Button>
            </div>
          </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return renderProfileTab();
      case 'security':
        return renderSecurityTab();
      case 'appearance':
        return renderAppearanceTab();
      default:
        return renderProfileTab();
    }
  };

  return (
    <Layout title="Profile">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600">Manage your personal information and preferences</p>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`
                      flex items-center py-4 px-1 border-b-2 font-medium text-sm
                      ${
                        activeTab === tab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="h-5 w-5 mr-2" />
                    {tab.name}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ProfilePage;
