'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'gray' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline';
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  children,
  color = 'gray',
  size = 'sm',
  variant = 'solid',
  icon: Icon,
  className,
}) => {
  const colorClasses = {
    blue: {
      solid: 'bg-blue-100 text-blue-800',
      outline: 'border-blue-200 text-blue-800',
    },
    green: {
      solid: 'bg-green-100 text-green-800',
      outline: 'border-green-200 text-green-800',
    },
    yellow: {
      solid: 'bg-yellow-100 text-yellow-800',
      outline: 'border-yellow-200 text-yellow-800',
    },
    red: {
      solid: 'bg-red-100 text-red-800',
      outline: 'border-red-200 text-red-800',
    },
    purple: {
      solid: 'bg-purple-100 text-purple-800',
      outline: 'border-purple-200 text-purple-800',
    },
    gray: {
      solid: 'bg-gray-100 text-gray-800',
      outline: 'border-gray-200 text-gray-800',
    },
    orange: {
      solid: 'bg-orange-100 text-orange-800',
      outline: 'border-orange-200 text-orange-800',
    },
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-2.5 py-1.5 text-sm',
    lg: 'px-3 py-2 text-base',
  };

  const baseClasses = 'inline-flex items-center rounded-full font-medium';
  const colorClass = colorClasses[color][variant];
  const sizeClass = sizeClasses[size];
  const borderClass = variant === 'outline' ? 'border' : '';

  return (
    <span
      className={cn(
        baseClasses,
        colorClass,
        sizeClass,
        borderClass,
        className
      )}
    >
      {Icon && <Icon className="h-3 w-3 mr-1" />}
      {children}
    </span>
  );
};

export default Badge;
