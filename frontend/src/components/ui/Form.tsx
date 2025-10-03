'use client';

import React from 'react';
import { useForm, FormProvider, UseFormReturn, FieldValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { cn } from '@/lib/utils';
import Button from './Button';

interface FormProps<T extends FieldValues> {
  schema: z.ZodSchema<T>;
  defaultValues?: Partial<T>;
  onSubmit?: (data: T) => void | Promise<void>;
  children: (methods: UseFormReturn<T>) => React.ReactNode;
  className?: string;
  loading?: boolean;
}

function Form<T extends FieldValues>({
  schema,
  defaultValues,
  onSubmit,
  children,
  className,
  loading = false,
}: FormProps<T>) {
  const methods = useForm<T>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues as any,
  });

  const handleSubmit = async (data: T) => {
    try {
      if (onSubmit) {
        await onSubmit(data);
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(handleSubmit)}
        className={cn('space-y-6', className)}
      >
        {children(methods)}
      </form>
    </FormProvider>
  );
}

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

function FormField({
  label,
  error,
  required = false,
  helperText,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-gray-500">{helperText}</p>
      )}
    </div>
  );
}

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

function FormSection({
  title,
  description,
  children,
  className,
}: FormSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}

interface FormActionsProps {
  onCancel?: () => void;
  onSubmit?: () => void;
  submitText?: string;
  cancelText?: string;
  loading?: boolean;
  className?: string;
}

function FormActions({
  onCancel,
  onSubmit,
  submitText = 'Save',
  cancelText = 'Cancel',
  loading = false,
  className,
}: FormActionsProps) {
  return (
    <div className={cn('flex justify-end space-x-3 pt-6 border-t border-gray-200', className)}>
      {onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          {cancelText}
        </Button>
      )}
      <Button
        type="button"
        onClick={onSubmit}
        loading={loading}
      >
        {submitText}
      </Button>
    </div>
  );
}

export { Form, FormField, FormSection, FormActions };
