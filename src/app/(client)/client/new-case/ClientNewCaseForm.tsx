'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { createCaseAction } from './actions';
import {
  FormField,
  FormSection,
  FormActions,
  FormError,
} from '@/components/forms/FormField';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const createCaseSchema = z.object({
  candidate_first_name: z.string().min(1, 'First name is required'),
  candidate_last_name: z.string().min(1, 'Last name is required'),
  candidate_email: z.string().email('Valid email is required'),
  candidate_phone: z.string().optional(),
  package_id: z.string().uuid('Package is required'),
  notes: z.string().optional(),
});

type CreateCaseInput = z.infer<typeof createCaseSchema>;

interface ClientNewCaseFormProps {
  packages: Array<{ id: string; name: string; check_types: string[] }>;
  clientId: string;
}

function formatEnumValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function ClientNewCaseForm({
  packages,
  clientId,
}: ClientNewCaseFormProps) {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
    watch,
    setValue,
  } = useForm<CreateCaseInput>({
    resolver: zodResolver(createCaseSchema),
  });

  const packageId = watch('package_id');
  const selectedPackage = packages.find((p) => p.id === packageId);

  async function onSubmit(data: CreateCaseInput) {
    startTransition(async () => {
      const result = await createCaseAction({
        client_id: clientId,
        candidate_first_name: data.candidate_first_name,
        candidate_last_name: data.candidate_last_name,
        candidate_email: data.candidate_email,
        candidate_phone: data.candidate_phone,
        package_id: data.package_id,
        notes: data.notes,
      });

      if (result.error) {
        setError('root', { message: result.error });
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Screening Case</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormError message={errors.root?.message} />

          {/* Candidate Details Section */}
          <FormSection
            title="Candidate Details"
            description="Enter the candidate's personal information"
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                label="First Name"
                htmlFor="candidate_first_name"
                required
                error={errors.candidate_first_name?.message}
              >
                <Input
                  id="candidate_first_name"
                  placeholder="John"
                  {...register('candidate_first_name')}
                />
              </FormField>

              <FormField
                label="Last Name"
                htmlFor="candidate_last_name"
                required
                error={errors.candidate_last_name?.message}
              >
                <Input
                  id="candidate_last_name"
                  placeholder="Doe"
                  {...register('candidate_last_name')}
                />
              </FormField>
            </div>

            <FormField
              label="Email Address"
              htmlFor="candidate_email"
              required
              error={errors.candidate_email?.message}
            >
              <Input
                id="candidate_email"
                type="email"
                placeholder="john.doe@example.com"
                {...register('candidate_email')}
              />
            </FormField>

            <FormField
              label="Phone Number"
              htmlFor="candidate_phone"
              description="Optional - UK phone number"
              error={errors.candidate_phone?.message}
            >
              <Input
                id="candidate_phone"
                type="tel"
                placeholder="020 1234 5678"
                {...register('candidate_phone')}
              />
            </FormField>
          </FormSection>

          {/* Screening Package Section */}
          <FormSection
            title="Screening Package"
            description="Select the BS7858 screening package for this candidate"
          >
            <FormField
              label="Package"
              htmlFor="package_id"
              required
              error={errors.package_id?.message}
            >
              <Select
                onValueChange={(value) => {
                  setValue('package_id', value);
                }}
                defaultValue=""
              >
                <SelectTrigger id="package_id">
                  <SelectValue placeholder="Select a package..." />
                </SelectTrigger>
                <SelectContent>
                  {packages.map((pkg) => (
                    <SelectItem key={pkg.id} value={pkg.id}>
                      {pkg.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            {/* Show selected package checks */}
            {selectedPackage && (
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm font-medium text-gray-900 mb-2">
                  Checks Included:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPackage.check_types.map((checkType) => (
                    <Badge key={checkType} variant="secondary">
                      {formatEnumValue(checkType)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </FormSection>

          {/* Notes Section */}
          <FormSection title="Additional Information">
            <FormField
              label="Notes"
              htmlFor="notes"
              description="Any additional notes or special requirements"
              error={errors.notes?.message}
            >
              <Textarea
                id="notes"
                placeholder="E.g., specific dates for employment history, known name changes..."
                rows={4}
                {...register('notes')}
              />
            </FormField>
          </FormSection>

          {/* Form Actions */}
          <FormActions>
            <Button type="button" variant="outline" disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Case'}
            </Button>
          </FormActions>
        </form>
      </CardContent>
    </Card>
  );
}
