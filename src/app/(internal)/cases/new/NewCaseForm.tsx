'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createCaseSchema, type CreateCaseInput } from '@/lib/validators/domain';
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
import { CasePriority } from '@/types/enums';

interface NewCaseFormProps {
  clients: Array<{ id: string; company_name: string }>;
  packages: Array<{ id: string; name: string; check_types: string[] }>;
}

const PRIORITY_OPTIONS = [
  { value: CasePriority.Standard, label: 'Standard' },
  { value: CasePriority.Urgent, label: 'Urgent' },
  { value: CasePriority.Critical, label: 'Critical' },
];

export function NewCaseForm({ clients, packages }: NewCaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedPackage, setSelectedPackage] = useState<string | undefined>();

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
  const selectedPkgData = packages.find((p) => p.id === packageId);

  async function onSubmit(data: CreateCaseInput) {
    startTransition(async () => {
      const result = await createCaseAction({
        client_id: data.client_id,
        candidate_first_name: data.candidate_first_name,
        candidate_last_name: data.candidate_last_name,
        candidate_email: data.candidate_email,
        candidate_phone: data.candidate_phone,
        package_id: data.package_id,
        priority: data.priority,
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
        <CardTitle>Create New Case</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <FormError message={errors.root?.message} />

          {/* Section 1: Client Selection */}
          <FormSection title="Client Selection">
            <FormField
              label="Client"
              htmlFor="client_id"
              required
              error={errors.client_id?.message}
            >
              <Select
                onValueChange={(value) => setValue('client_id', value)}
                defaultValue=""
              >
                <SelectTrigger id="client_id">
                  <SelectValue placeholder="Select a client..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </FormSection>

          {/* Section 2: Candidate Details */}
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
              description="UK phone number (optional)"
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

          {/* Section 3: Screening Package */}
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
                  setSelectedPackage(value);
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

            {selectedPkgData && selectedPkgData.check_types.length > 0 && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="mb-2 text-sm font-medium text-gray-900">
                  Checks included:
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedPkgData.check_types.map((checkType) => (
                    <Badge key={checkType} variant="secondary">
                      {checkType.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </FormSection>

          {/* Section 4: Case Options */}
          <FormSection title="Case Options">
            <FormField
              label="Priority"
              htmlFor="priority"
              error={errors.priority?.message}
            >
              <Select
                onValueChange={(value) =>
                  setValue('priority', value as any)
                }
                defaultValue=""
              >
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority..." />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>

            <FormField
              label="Notes"
              htmlFor="notes"
              description="Optional internal notes (max 2000 characters)"
              error={errors.notes?.message}
            >
              <Textarea
                id="notes"
                placeholder="Add any relevant notes about this case..."
                rows={4}
                {...register('notes')}
              />
            </FormField>
          </FormSection>

          {/* Form Actions */}
          <FormActions>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Creating...' : 'Create Case'}
            </Button>
          </FormActions>
        </form>
      </CardContent>
    </Card>
  );
}
