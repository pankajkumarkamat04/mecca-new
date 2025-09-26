'use client';

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { settingsAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  UserIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  CurrencyDollarIcon,
  PaintBrushIcon,
  PhotoIcon,
  TrashIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline';

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const queryClient = useQueryClient();
  const { data: settingsData } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsAPI.getSettings()
  });
  const updateSettings = useMutation({
    mutationFn: (data: any) => settingsAPI.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    }
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (formData: FormData) => settingsAPI.uploadLogo(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Logo uploaded successfully');
      setLogoFile(null);
      setLogoPreview(null);
    },
    onError: () => {
      toast.error('Failed to upload logo');
    }
  });

  const deleteLogoMutation = useMutation({
    mutationFn: () => settingsAPI.deleteLogo(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Logo deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete logo');
    }
  });

  const tabs = [
    { id: 'company', name: 'Company', icon: CogIcon },
    { id: 'system', name: 'System', icon: ComputerDesktopIcon },
    { id: 'billing', name: 'Billing', icon: CurrencyDollarIcon },
  ];

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadLogo = () => {
    if (logoFile) {
      const formData = new FormData();
      formData.append('logo', logoFile);
      uploadLogoMutation.mutate(formData);
    }
  };

  const handleDeleteLogo = () => {
    deleteLogoMutation.mutate();
  };






  const renderCompanyTab = () => {
    const settings = settingsData?.data?.data;
    const company = settings?.company || {};
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Company Settings</h3>
          <p className="text-sm text-gray-600">Manage your company information and preferences.</p>
        </div>

        <div className="space-y-6">
          {/* Logo Section */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Company Logo</h4>
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {logoPreview || company.logo?.url ? (
                  <img
                    className="h-20 w-20 object-contain border border-gray-300 rounded-lg"
                    src={logoPreview || company.logo?.url}
                    alt="Company logo"
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex space-x-3">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    <Button variant="outline" leftIcon={<PhotoIcon className="h-4 w-4" />}>
                      {logoFile ? 'Change Logo' : 'Upload Logo'}
                    </Button>
                  </label>
                  {logoFile && (
                    <Button onClick={handleUploadLogo} loading={uploadLogoMutation.isPending}>
                      Upload
                    </Button>
                  )}
                  {company.logo?.url && (
                    <Button 
                      variant="outline" 
                      onClick={handleDeleteLogo} 
                      leftIcon={<TrashIcon className="h-4 w-4" />}
                      loading={deleteLogoMutation.isPending}
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

          {/* Company Information */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Company Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Company Name"
                defaultValue={company.name || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, name: e.target.value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="Company Code"
                defaultValue={company.code || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, code: e.target.value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="Tax ID"
                defaultValue={company.taxId || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, taxId: e.target.value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="Website"
                defaultValue={company.website || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, website: e.target.value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="Email"
                type="email"
                defaultValue={company.email || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, email: e.target.value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="Phone"
                defaultValue={company.phone || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, phone: e.target.value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Street Address"
                defaultValue={company.address?.street || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { 
                    ...company, 
                    address: { ...company.address, street: e.target.value }
                  };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="City"
                defaultValue={company.address?.city || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { 
                    ...company, 
                    address: { ...company.address, city: e.target.value }
                  };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="State/Province"
                defaultValue={company.address?.state || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { 
                    ...company, 
                    address: { ...company.address, state: e.target.value }
                  };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="ZIP/Postal Code"
                defaultValue={company.address?.zipCode || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { 
                    ...company, 
                    address: { ...company.address, zipCode: e.target.value }
                  };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
              <Input
                label="Country"
                defaultValue={company.address?.country || ''}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { 
                    ...company, 
                    address: { ...company.address, country: e.target.value }
                  };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
            </div>
          </div>

          {/* Default Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Default Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Select
                label="Default Currency"
                options={[
                  { value: 'USD', label: 'USD - US Dollar' },
                  { value: 'EUR', label: 'EUR - Euro' },
                  { value: 'GBP', label: 'GBP - British Pound' },
                  { value: 'CAD', label: 'CAD - Canadian Dollar' },
                  { value: 'AUD', label: 'AUD - Australian Dollar' },
                ]}
                value={company.defaultCurrency || 'USD'}
                onChange={(value) => {
                  const updatedCompany = { ...company, defaultCurrency: value };
                  updateSettings.mutate({ company: updatedCompany });
                }}
                fullWidth
              />
              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={company.defaultTaxRate || 10}
                fullWidth
                onChange={(e) => {
                  const updatedCompany = { ...company, defaultTaxRate: parseFloat(e.target.value) };
                  updateSettings.mutate({ company: updatedCompany });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemTab = () => {
    const settings = settingsData?.data?.data;
    const system = settings?.system || {};
    
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
          <p className="text-sm text-gray-600">Configure system-wide settings and security policies.</p>
        </div>

        <div className="space-y-6">
          {/* Security Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Security Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Maintenance Mode</label>
                  <p className="text-sm text-gray-500">Enable maintenance mode to restrict access</p>
                </div>
                <input
                  type="checkbox"
                  checked={system.maintenanceMode || false}
                  onChange={(e) => {
                    const updatedSystem = { ...system, maintenanceMode: e.target.checked };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Allow Registration</label>
                  <p className="text-sm text-gray-500">Allow new users to register</p>
                </div>
                <input
                  type="checkbox"
                  checked={system.allowRegistration !== false}
                  onChange={(e) => {
                    const updatedSystem = { ...system, allowRegistration: e.target.checked };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Session Timeout (minutes)"
                  type="number"
                  value={system.sessionTimeout || 30}
                  onChange={(e) => {
                    const updatedSystem = { ...system, sessionTimeout: parseInt(e.target.value) };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  fullWidth
                />
                <Input
                  label="Max Login Attempts"
                  type="number"
                  value={system.maxLoginAttempts || 5}
                  onChange={(e) => {
                    const updatedSystem = { ...system, maxLoginAttempts: parseInt(e.target.value) };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  fullWidth
                />
              </div>
            </div>
          </div>

          {/* Password Policy */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Password Policy</h4>
            <div className="space-y-4">
              <Input
                label="Minimum Password Length"
                type="number"
                value={system.passwordPolicy?.minLength || 8}
                onChange={(e) => {
                  const updatedSystem = { 
                    ...system, 
                    passwordPolicy: { 
                      ...system.passwordPolicy, 
                      minLength: parseInt(e.target.value) 
                    }
                  };
                  updateSettings.mutate({ system: updatedSystem });
                }}
                fullWidth
              />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Uppercase Letters</label>
                  <input
                    type="checkbox"
                    checked={system.passwordPolicy?.requireUppercase !== false}
                    onChange={(e) => {
                      const updatedSystem = { 
                        ...system, 
                        passwordPolicy: { 
                          ...system.passwordPolicy, 
                          requireUppercase: e.target.checked 
                        }
                      };
                      updateSettings.mutate({ system: updatedSystem });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Lowercase Letters</label>
                  <input
                    type="checkbox"
                    checked={system.passwordPolicy?.requireLowercase !== false}
                    onChange={(e) => {
                      const updatedSystem = { 
                        ...system, 
                        passwordPolicy: { 
                          ...system.passwordPolicy, 
                          requireLowercase: e.target.checked 
                        }
                      };
                      updateSettings.mutate({ system: updatedSystem });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Numbers</label>
                  <input
                    type="checkbox"
                    checked={system.passwordPolicy?.requireNumbers !== false}
                    onChange={(e) => {
                      const updatedSystem = { 
                        ...system, 
                        passwordPolicy: { 
                          ...system.passwordPolicy, 
                          requireNumbers: e.target.checked 
                        }
                      };
                      updateSettings.mutate({ system: updatedSystem });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Special Characters</label>
                  <input
                    type="checkbox"
                    checked={system.passwordPolicy?.requireSpecialChars || false}
                    onChange={(e) => {
                      const updatedSystem = { 
                        ...system, 
                        passwordPolicy: { 
                          ...system.passwordPolicy, 
                          requireSpecialChars: e.target.checked 
                        }
                      };
                      updateSettings.mutate({ system: updatedSystem });
                    }}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Backup Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Backup Settings</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Auto Backup</label>
                  <p className="text-sm text-gray-500">Automatically backup data</p>
                </div>
                <input
                  type="checkbox"
                  checked={system.backupSettings?.autoBackup !== false}
                  onChange={(e) => {
                    const updatedSystem = { 
                      ...system, 
                      backupSettings: { 
                        ...system.backupSettings, 
                        autoBackup: e.target.checked 
                      }
                    };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select
                  label="Backup Frequency"
                  options={[
                    { value: 'daily', label: 'Daily' },
                    { value: 'weekly', label: 'Weekly' },
                    { value: 'monthly', label: 'Monthly' },
                  ]}
                  value={system.backupSettings?.backupFrequency || 'daily'}
                  onChange={(value) => {
                    const updatedSystem = { 
                      ...system, 
                      backupSettings: { 
                        ...system.backupSettings, 
                        backupFrequency: value 
                      }
                    };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  fullWidth
                />
                <Input
                  label="Retention Days"
                  type="number"
                  value={system.backupSettings?.retentionDays || 30}
                  onChange={(e) => {
                    const updatedSystem = { 
                      ...system, 
                      backupSettings: { 
                        ...system.backupSettings, 
                        retentionDays: parseInt(e.target.value) 
                      }
                    };
                    updateSettings.mutate({ system: updatedSystem });
                  }}
                  fullWidth
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBillingTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Billing & Subscription</h3>
        <p className="text-sm text-gray-600">Manage your subscription and billing information.</p>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-lg">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="h-8 w-8 text-blue-600" />
            </div>
            <div className="ml-4">
              <h4 className="text-lg font-medium text-blue-900">Professional Plan</h4>
              <p className="text-sm text-blue-700">$99/month • Next billing: January 15, 2025</p>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-md font-medium text-gray-900 mb-4">Payment Method</h4>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="h-8 w-12 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">•••• •••• •••• 4242</p>
                  <p className="text-sm text-gray-500">Expires 12/25</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Update
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Billing History</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">December 2024</p>
                <p className="text-sm text-gray-500">Professional Plan</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">$99.00</p>
                <p className="text-sm text-gray-500">Paid</p>
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">November 2024</p>
                <p className="text-sm text-gray-500">Professional Plan</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">$99.00</p>
                <p className="text-sm text-gray-500">Paid</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="outline">
          Download Invoice
        </Button>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyTab();
      case 'system':
        return renderSystemTab();
      case 'billing':
        return renderBillingTab();
      default:
        return renderCompanyTab();
    }
  };

  return (
    <Layout title="Settings">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="bg-white rounded-lg shadow">
              <div className="p-6">
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;
