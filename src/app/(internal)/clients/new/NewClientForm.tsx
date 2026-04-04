'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { FormField, FormSection, FormActions, FormError, FormSuccess } from '@/components/forms/FormField';
import { createClientSchema } from '@/lib/validators/domain';
import { createClientAction } from './actions';

type CreateClientFormData = z.infer<typeof createClientSchema>;

export function NewClientForm() {
  const [isPending, startTransition] = useTransition();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CreateClientFormData>({
    resolver: zodResolver(createClientSchema),
    mode: 'onBlur',
  });

  const onSubmit = (data: CreateClientFormData) => {
    startTransition(async () => {
      try {
        setErrorMessage(null);
        await createClientAction(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'An error occurred';
        setErrorMessage(message);
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Client Information</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {errorMessage && (
            <FormError message={errorMessage} />
          )}

          {successMessage && (
            <FormSuccess message={successMessage} />
          )}

          {/* Company Information Section */}
          <FormSection title="Company Information">
            <FormField
              label="Company Name"
              htmlFor="companyName"
              error={errors.companyName?.message}
              required
            >
              <Input
                id="companyName"
                placeholder="Enter company name"
                {...register('companyName')}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="Address"
              htmlFor="address"
              error={errors.address?.message}
            >
              <Textarea
                id="address"
                placeholder="Enter company address"
                {...register('address')}
                disabled={isPending}
                rows={3}
              />
            </FormField>
          </FormSection>

          {/* Primary Contact Section */}
          <FormSection title="Primary Contact">
            <FormField
              label="Contact Name"
              htmlFor="contactName"
              error={errors.contactName?.message}
              required
            >
              <Input
                id="contactName"
                placeholder="Enter contact full name"
                {...register('contactName')}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="Contact Email"
              htmlFor="contactEmail"
              error={errors.contactEmail?.message}
              required
            >
              <Input
                id="contactEmail"
                type="email"
                placeholder="Enter contact email address"
                {...register('contactEmail')}
                disabled={isPending}
              />
            </FormField>

            <FormField
              label="Contact Phone"
              htmlFor="contactPhone"
              error={errors.contactPhone?.message}
              description="UK phone number format (e.g., 020 7946 0958 or +44 20 7946 0958)"
            >
              <Input
                id="contactPhone"
                type="tel"
                placeholder="Enter contact phone number"
                {...register('contactPhone')}
                disabled={isPending}
              />
            </FormField>
          </FormSection>

          {/* Notes Section */}
          <FormSection title="Notes">
            <FormField
              label="Notes"
              htmlFor="notes"
              error={errors.notes?.message}
              description="Internal notes about this client"
            >
              <Textarea
                id="notes"
                placeholder="Enter any internal notes about this client..."
                {...register('notes')}
                disabled={isPending}
                rows={4}
              />
            </FormField>
          </FormSection>

          {/* Form Actions */}
          <FormActions>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending ? 'Creating...' : 'Create Client'}
            </Button>
          </FormActions>
        </form>
      </CardContent>
    </Card>
  );
}
