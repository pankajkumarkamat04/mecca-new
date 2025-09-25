'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { settingsAPI } from '@/lib/api';
import { useQuery } from 'react-query';

interface CompanySettings {
  name: string;
  code: string;
  taxId: string;
  website: string;
  email: string;
  phone: string;
  logo: {
    url: string;
    filename: string;
    originalName: string;
  };
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  defaultCurrency: string;
  defaultTaxRate: number;
  invoiceSettings: {
    prefix: string;
    numberFormat: string;
    footerText: string;
    termsAndConditions: string;
  };
  posSettings: {
    receiptHeader: string;
    receiptFooter: string;
    showTaxBreakdown: boolean;
    autoPrint: boolean;
  };
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
}


interface SystemSettings {
  maintenanceMode: boolean;
  allowRegistration: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordPolicy: {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
  };
  backupSettings: {
    autoBackup: boolean;
    backupFrequency: 'daily' | 'weekly' | 'monthly';
    retentionDays: number;
  };
}

interface Settings {
  company: CompanySettings;
  appearance: AppearanceSettings;
  system: SystemSettings;
}

interface SettingsContextType {
  settings: Settings | null;
  isLoading: boolean;
  company: CompanySettings | null;
  appearance: AppearanceSettings | null;
  system: SystemSettings | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const { data: settingsData, isLoading } = useQuery(
    ['app-settings'],
    () => settingsAPI.getSettings(),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  const settings = settingsData?.data?.data || null;
  const company = settings?.company || null;
  const appearance = settings?.appearance || null;
  const system = settings?.system || null;

  const value: SettingsContextType = {
    settings,
    isLoading,
    company,
    appearance,
    system,
  };

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
