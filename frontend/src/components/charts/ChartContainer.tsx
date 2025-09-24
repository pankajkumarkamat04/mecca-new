'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import {
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';

interface ChartContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  loading?: boolean;
  error?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  actions?: React.ReactNode;
}

const ChartContainer: React.FC<ChartContainerProps> = ({
  title,
  description,
  children,
  className,
  loading = false,
  error,
  trend,
  actions,
}) => {
  if (loading) {
    return (
      <div className={cn('bg-white p-6 rounded-lg shadow', className)}>
        <div className="animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="h-4 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
            <div className="h-8 w-8 bg-gray-200 rounded"></div>
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('bg-white p-6 rounded-lg shadow', className)}>
        <div className="text-center py-8">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading chart</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('bg-white p-6 rounded-lg shadow', className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {trend && (
              <div className="flex items-center">
                {trend.isPositive ? (
                  <ArrowUpIcon className="h-4 w-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4 text-red-500" />
                )}
                <span
                  className={cn(
                    'ml-1 text-sm font-medium',
                    trend.isPositive ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {Math.abs(trend.value)}%
                </span>
                <span className="ml-1 text-sm text-gray-500">{trend.label}</span>
              </div>
            )}
          </div>
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        {actions && (
          <div className="ml-4">{actions}</div>
        )}
      </div>
      <div className="h-64 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default ChartContainer;
