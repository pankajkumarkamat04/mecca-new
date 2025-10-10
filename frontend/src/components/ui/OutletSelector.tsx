'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { salesOutletsAPI } from '@/lib/api';
import Select from './Select';

interface OutletSelectorProps {
  value?: string;
  onChange: (outletId: string, outlet?: any) => void;
  label?: string;
  required?: boolean;
  fullWidth?: boolean;
  disabled?: boolean;
}

const OutletSelector: React.FC<OutletSelectorProps> = ({
  value,
  onChange,
  label = 'Sales Outlet',
  required = false,
  fullWidth = false,
  disabled = false,
}) => {
  const { data: outletsData } = useQuery({
    queryKey: ['active-outlets'],
    queryFn: () => salesOutletsAPI.getActiveOutlets(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const outlets = outletsData?.data?.data || [];

  const options = outlets.map((outlet: any) => ({
    value: outlet._id,
    label: `${outlet.outletCode} - ${outlet.name} ${outlet.address?.city ? `(${outlet.address.city})` : ''}`,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const selectedOutlet = outlets.find((o: any) => o._id === selectedId);
    onChange(selectedId, selectedOutlet);
  };

  return (
    <div>
      <Select
        label={label}
        options={options}
        value={value || ''}
        onChange={handleChange as any}
        fullWidth={fullWidth}
        disabled={disabled}
        placeholder="Select sales outlet..."
        required={required}
      />
      {required && !value && (
        <p className="mt-1 text-xs text-red-600">Please select a sales outlet to continue</p>
      )}
    </div>
  );
};

export default OutletSelector;

