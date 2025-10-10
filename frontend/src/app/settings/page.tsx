'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { useAuth } from '@/contexts/AuthContext';
import { settingsAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDate, getLogoUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import {
  UserIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  GlobeAltIcon,
  PaintBrushIcon,
  PhotoIcon,
  TrashIcon,
  ComputerDesktopIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const SettingsPage: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('company');
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const queryClient = useQueryClient();
  const { data: settingsData } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => settingsAPI.getSettings()
  });
  const updateSettings = useMutation({
    mutationFn: (data: any) => settingsAPI.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      toast.success('Settings saved successfully');
      setHasChanges(false);
      setFormData({});
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

  const refreshExchangeRatesMutation = useMutation({
    mutationFn: () => settingsAPI.refreshExchangeRates(),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['app-settings'] });
      const data = response.data?.data;
      toast.success(`Updated ${data?.updatedCount || 0} exchange rates successfully`);
    },
    onError: () => {
      toast.error('Failed to refresh exchange rates');
    }
  });

  const tabs = [
    { id: 'company', name: 'Company', icon: CogIcon },
    { id: 'system', name: 'System', icon: ComputerDesktopIcon },
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

  const handleInputChange = (field: string, value: any, section: string = 'company') => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const handleNestedInputChange = (field: string, value: any, parentField: string, section: string = 'company') => {
    setFormData((prev: Record<string, any>) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [parentField]: {
          ...prev[section]?.[parentField],
          [field]: value
        }
      }
    }));
    setHasChanges(true);
  };

  const handleSaveSettings = () => {
    if (Object.keys(formData).length > 0) {
      updateSettings.mutate(formData);
    }
  };

  const handleCancelChanges = () => {
    setFormData({});
    setHasChanges(false);
  };






  const renderCompanyTab = () => {
    const settings = settingsData?.data?.data;
    const company = settings?.company || {};
    const currentCompany = { ...company, ...formData.company };
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Company Settings</h3>
            <p className="text-sm text-gray-600">Manage your company information and preferences.</p>
          </div>
          {hasChanges && (
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleCancelChanges}
                disabled={updateSettings.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings}
                loading={updateSettings.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          {/* Logo Section */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Company Logo</h4>
            <div className="flex items-center space-x-6">
              <div className="flex-shrink-0">
                {logoPreview || currentCompany.logo?.url ? (
                  <Image
                    width={80}
                    height={80}
                    className="object-contain border border-gray-300 rounded-lg"
                    src={logoPreview || getLogoUrl(currentCompany.logo?.url || '')}
                    alt="Company logo"
                    onError={(e) => {
                      console.error('Logo failed to load:', (e.target as HTMLImageElement).src);
                    }}
                  />
                ) : (
                  <div className="h-20 w-20 bg-gray-100 border border-gray-300 rounded-lg flex items-center justify-center">
                    <PhotoIcon className="h-8 w-8 text-gray-400" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex space-x-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label htmlFor="logo-upload" className="cursor-pointer">
                    <div className="inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500 px-4 py-2 text-sm">
                      <PhotoIcon className="h-4 w-4 mr-2" />
                      {logoFile ? 'Change Logo' : 'Upload Logo'}
                    </div>
                  </label>
                  {logoFile && (
                    <Button onClick={handleUploadLogo} loading={uploadLogoMutation.isPending}>
                      Upload
                    </Button>
                  )}
                  {currentCompany.logo?.url && (
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
                value={currentCompany.name || ''}
                fullWidth
                onChange={(e) => handleInputChange('name', e.target.value)}
              />
              <Input
                label="Company Code"
                value={currentCompany.code || ''}
                fullWidth
                onChange={(e) => handleInputChange('code', e.target.value)}
              />
              <Input
                label="Tax ID"
                value={currentCompany.taxId || ''}
                fullWidth
                onChange={(e) => handleInputChange('taxId', e.target.value)}
              />
              <Input
                label="Website"
                value={currentCompany.website || ''}
                fullWidth
                onChange={(e) => handleInputChange('website', e.target.value)}
              />
              <Input
                label="Email"
                type="email"
                value={currentCompany.email || ''}
                fullWidth
                onChange={(e) => handleInputChange('email', e.target.value)}
              />
              <Input
                label="Phone"
                value={currentCompany.phone || ''}
                fullWidth
                onChange={(e) => handleInputChange('phone', e.target.value)}
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Street Address"
                value={currentCompany.address?.street || ''}
                fullWidth
                onChange={(e) => handleNestedInputChange('street', e.target.value, 'address')}
              />
              <Input
                label="City"
                value={currentCompany.address?.city || ''}
                fullWidth
                onChange={(e) => handleNestedInputChange('city', e.target.value, 'address')}
              />
              <Input
                label="State/Province"
                value={currentCompany.address?.state || ''}
                fullWidth
                onChange={(e) => handleNestedInputChange('state', e.target.value, 'address')}
              />
              <Input
                label="ZIP/Postal Code"
                value={currentCompany.address?.zipCode || ''}
                fullWidth
                onChange={(e) => handleNestedInputChange('zipCode', e.target.value, 'address')}
              />
              <Input
                label="Country"
                value={currentCompany.address?.country || ''}
                fullWidth
                onChange={(e) => handleNestedInputChange('country', e.target.value, 'address')}
              />
            </div>
          </div>

          {/* Default Settings */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Default Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Default Tax Rate (%)"
                type="number"
                value={currentCompany.defaultTaxRate || 10}
                fullWidth
                onChange={(e) => handleInputChange('defaultTaxRate', parseFloat(e.target.value))}
              />
            </div>
          </div>

          {/* Currency Settings */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-md font-medium text-gray-900">Multi-Currency Settings</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Exchange rates are updated automatically using real-time APIs.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refreshExchangeRatesMutation.mutate()}
                loading={refreshExchangeRatesMutation.isPending}
                leftIcon={<ArrowPathIcon className="h-4 w-4" />}
              >
                Refresh Rates
              </Button>
            </div>
            
            {currentCompany.currencySettings?.lastAutoUpdate && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">Last automatic update:</span>{' '}
                  {new Date(currentCompany.currencySettings.lastAutoUpdate).toLocaleString()}
                </p>
              </div>
            )}
            
            <div className="space-y-4">
              {/* USD Currency */}
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="font-medium text-gray-900">$ USD - US Dollar</h5>
                    <p className="text-sm text-gray-500">Base Currency (Exchange Rate: 1.00)</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                    Base Currency
                  </span>
                </div>
              </div>

              {/* ZWL Currency */}
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h5 className="font-medium text-gray-900">Z$ ZWL - Zimbabwean Dollar (ZIG)</h5>
                    <p className="text-sm text-gray-500">1 USD = {currentCompany.currencySettings?.supportedCurrencies?.find((c: any) => c.code === 'ZWL')?.exchangeRate || 30} ZWL</p>
                  </div>
                  <span className="px-3 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                    Active
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Exchange Rate (1 USD = X ZWL)"
                    type="number"
                    step="0.01"
                    value={
                      formData.company?.currencySettings?.supportedCurrencies?.find((c: any) => c.code === 'ZWL')?.exchangeRate ||
                      currentCompany.currencySettings?.supportedCurrencies?.find((c: any) => c.code === 'ZWL')?.exchangeRate ||
                      30
                    }
                    fullWidth
                    onChange={(e) => {
                      const newRate = parseFloat(e.target.value);
                      const currencies = currentCompany.currencySettings?.supportedCurrencies || [];
                      const updatedCurrencies = currencies.map((c: any) => 
                        c.code === 'ZWL' ? { ...c, exchangeRate: newRate, lastUpdated: new Date() } : c
                      );
                      setFormData((prev: any) => ({
                        ...prev,
                        company: {
                          ...prev.company,
                          currencySettings: {
                            ...currentCompany.currencySettings,
                            supportedCurrencies: updatedCurrencies
                          }
                        }
                      }));
                      setHasChanges(true);
                    }}
                  />
                  <div className="flex items-end">
                    <p className="text-xs text-gray-500 pb-2">
                      Last updated: {new Date(currentCompany.currencySettings?.supportedCurrencies?.find((c: any) => c.code === 'ZWL')?.lastUpdated || Date.now()).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Default Display Currency */}
              <div className="mt-4">
                <Select
                  label="Default Display Currency"
                  options={[
                    { value: 'USD', label: '$ USD - US Dollar' },
                    { value: 'ZWL', label: 'Z$ ZWL - Zimbabwean Dollar (ZIG)' },
                  ]}
                  value={
                    formData.company?.currencySettings?.defaultDisplayCurrency ||
                    currentCompany.currencySettings?.defaultDisplayCurrency ||
                    'USD'
                  }
                  onChange={(value) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      company: {
                        ...prev.company,
                        currencySettings: {
                          ...currentCompany.currencySettings,
                          defaultDisplayCurrency: value
                        }
                      }
                    }));
                    setHasChanges(true);
                  }}
                  fullWidth
                />
                <p className="text-xs text-gray-500 mt-1">
                  This currency will be selected by default in transactions and reports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSystemTab = () => {
    const settings = settingsData?.data?.data;
    const system = settings?.system || {};
    const currentSystem = { ...system, ...formData.system };
    
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900">System Settings</h3>
            <p className="text-sm text-gray-600">Configure system-wide settings and security policies.</p>
          </div>
          {hasChanges && (
            <div className="flex space-x-3">
              <Button 
                variant="outline" 
                onClick={handleCancelChanges}
                disabled={updateSettings.isPending}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings}
                loading={updateSettings.isPending}
              >
                Save Changes
              </Button>
            </div>
          )}
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
                  checked={currentSystem.maintenanceMode || false}
                  onChange={(e) => handleInputChange('maintenanceMode', e.target.checked, 'system')}
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
                  checked={currentSystem.allowRegistration !== false}
                  onChange={(e) => handleInputChange('allowRegistration', e.target.checked, 'system')}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Session Timeout (minutes)"
                  type="number"
                  value={currentSystem.sessionTimeout || 30}
                  onChange={(e) => handleInputChange('sessionTimeout', parseInt(e.target.value), 'system')}
                  fullWidth
                />
                <Input
                  label="Max Login Attempts"
                  type="number"
                  value={currentSystem.maxLoginAttempts || 5}
                  onChange={(e) => handleInputChange('maxLoginAttempts', parseInt(e.target.value), 'system')}
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
                value={currentSystem.passwordPolicy?.minLength || 8}
                onChange={(e) => handleNestedInputChange('minLength', parseInt(e.target.value), 'passwordPolicy', 'system')}
                fullWidth
              />
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Uppercase Letters</label>
                  <input
                    type="checkbox"
                    checked={currentSystem.passwordPolicy?.requireUppercase !== false}
                    onChange={(e) => handleNestedInputChange('requireUppercase', e.target.checked, 'passwordPolicy', 'system')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Lowercase Letters</label>
                  <input
                    type="checkbox"
                    checked={currentSystem.passwordPolicy?.requireLowercase !== false}
                    onChange={(e) => handleNestedInputChange('requireLowercase', e.target.checked, 'passwordPolicy', 'system')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Numbers</label>
                  <input
                    type="checkbox"
                    checked={currentSystem.passwordPolicy?.requireNumbers !== false}
                    onChange={(e) => handleNestedInputChange('requireNumbers', e.target.checked, 'passwordPolicy', 'system')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">Require Special Characters</label>
                  <input
                    type="checkbox"
                    checked={currentSystem.passwordPolicy?.requireSpecialChars || false}
                    onChange={(e) => handleNestedInputChange('requireSpecialChars', e.target.checked, 'passwordPolicy', 'system')}
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


  const renderTabContent = () => {
    switch (activeTab) {
      case 'company':
        return renderCompanyTab();
      case 'system':
        return renderSystemTab();
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
