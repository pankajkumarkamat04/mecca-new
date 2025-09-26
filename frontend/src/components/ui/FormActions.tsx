'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import Button from './Button';

interface FormActionsProps {
  children: React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between';
}

const FormActions: React.FC<FormActionsProps> = ({
  children,
  className,
  align = 'right'
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between'
  };

  return (
    <div className={cn(
      'flex items-center space-x-3 pt-4 border-t border-gray-200',
      alignClasses[align],
      className
    )}>
      {children}
    </div>
  );
};

export default FormActions;
