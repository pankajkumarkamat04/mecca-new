'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const Select: React.FC<SelectProps> = ({
  label,
  error,
  helperText,
  options,
  placeholder,
  fullWidth = false,
  className,
  id,
  ...props
}) => {
  const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = 'block rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm';
  const errorClasses = error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : '';
  const widthClasses = fullWidth ? 'w-full' : '';
  
  return (
    <div className={fullWidth ? 'w-full' : ''}>
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <select
        id={selectId}
        className={cn(
          baseClasses,
          errorClasses,
          widthClasses,
          className
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
};

export default Select;
