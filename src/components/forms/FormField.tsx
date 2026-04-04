'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ============================================================
// FormField — wraps a label + input + error message
// ============================================================

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  description?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  description,
  required,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={htmlFor} className={cn(error && 'text-red-600')}>
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </Label>
      {children}
      {description && !error && (
        <p className="text-sm text-gray-500">{description}</p>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// ============================================================
// FormSection — groups related fields with a heading
// ============================================================

interface FormSectionProps {
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  className,
  children,
}: FormSectionProps) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </fieldset>
  );
}

// ============================================================
// FormActions — button row at the bottom of a form
// ============================================================

interface FormActionsProps {
  className?: string;
  children: React.ReactNode;
}

export function FormActions({ className, children }: FormActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-end gap-3 border-t border-gray-200 pt-4',
        className,
      )}
    >
      {children}
    </div>
  );
}

// ============================================================
// FormError — standalone server-level error display
// ============================================================

interface FormErrorProps {
  message?: string | null;
  className?: string;
}

export function FormError({ message, className }: FormErrorProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'rounded-md bg-red-50 p-3 text-sm text-red-700',
        className,
      )}
    >
      {message}
    </div>
  );
}

// ============================================================
// FormSuccess — standalone success message
// ============================================================

interface FormSuccessProps {
  message?: string | null;
  className?: string;
}

export function FormSuccess({ message, className }: FormSuccessProps) {
  if (!message) return null;

  return (
    <div
      className={cn(
        'rounded-md bg-green-50 p-3 text-sm text-green-700',
        className,
      )}
    >
      {message}
    </div>
  );
}
