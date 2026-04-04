'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { cn } from '@/lib/utils';
import { refereeSchema } from '@/lib/validators/domain';
import type { z } from 'zod';

type RefereeFormData = z.input<typeof refereeSchema>;
import {
  getMyReferees,
  saveReferee,
  deleteReferee,
  getSubmissionStatus,
} from '../actions';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  FormField,
  FormSection,
  FormActions,
  FormError,
  FormSuccess,
} from '@/components/forms/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { ReferenceType } from '@/types/enums';

interface RefereeData {
  id: string;
  candidate_id: string;
  reference_type: string;
  referee_name: string;
  referee_email: string;
  referee_phone?: string | null;
  organisation_name?: string | null;
  job_title?: string | null;
  relationship?: string | null;
  date_from: string;
  date_to?: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

const REFERENCE_TYPE_LABELS: Record<string, string> = {
  [ReferenceType.Employment]: 'Employment',
  [ReferenceType.Education]: 'Education',
  [ReferenceType.Character]: 'Character',
  [ReferenceType.Landlord]: 'Landlord',
};

export default function CandidateRefereesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [referees, setReferees] = useState<RefereeData[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const {
    register,
    watch,
    setValue,
    formState: { errors },
    handleSubmit,
    reset,
  } = useForm<RefereeFormData>({
    resolver: zodResolver(refereeSchema),
    defaultValues: {
      referenceType: ReferenceType.Employment,
      refereePhone: undefined,
      organisationName: undefined,
      jobTitle: undefined,
      relationship: undefined,
      dateTo: undefined,
    },
  });

  // Load existing referees and submission status
  useEffect(() => {
    async function loadData() {
      try {
        const [refereesData, status] = await Promise.all([
          getMyReferees(),
          getSubmissionStatus(),
        ]);

        setHasSubmitted(status.hasSubmitted);
        setReferees(refereesData || []);
      } catch (err) {
        console.error('Failed to load referees:', err);
        setSubmitError('Failed to load referees');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  const onSubmit = async (data: RefereeFormData) => {
    setSubmitError(null);
    setSubmitSuccess(false);

    const result = await saveReferee({
      ...(data as import('@/lib/validators/domain').RefereeInput),
      id: editingId || undefined,
    });

    if (result.error) {
      setSubmitError(result.error);
    } else {
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 5000);

      // Refresh referees list
      const updated = await getMyReferees();
      setReferees(updated || []);

      // Reset form
      reset();
      setShowForm(false);
      setEditingId(null);
    }
  };

  const handleEdit = (referee: RefereeData) => {
    reset({
      referenceType: referee.reference_type as ReferenceType,
      refereeName: referee.referee_name,
      refereeEmail: referee.referee_email,
      refereePhone: referee.referee_phone || undefined,
      organisationName: referee.organisation_name || undefined,
      jobTitle: referee.job_title || undefined,
      relationship: referee.relationship || undefined,
      dateFrom: referee.date_from.split('T')[0],
      dateTo: referee.date_to ? referee.date_to.split('T')[0] : undefined,
    });
    setEditingId(referee.id);
    setShowForm(true);
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;

    const result = await deleteReferee(deleteConfirmId);
    if (result.error) {
      setSubmitError(result.error);
    } else {
      const updated = await getMyReferees();
      setReferees(updated || []);
      setDeleteConfirmId(null);
    }
  };

  const referenceType = watch('referenceType');

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
        <div className="h-64 animate-pulse rounded-lg bg-gray-200" />
      </div>
    );
  }

  const meetsRequirement = referees.length >= 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Referees</h2>
        <p className="mt-1 text-sm text-gray-500">
          Provide contact details for referees who can verify your employment
          history.
        </p>
      </div>

      {hasSubmitted && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm text-blue-700">
            <span className="font-semibold">Submitted.</span> Your referees have been submitted and are no longer editable.
          </p>
        </div>
      )}

      {/* Requirement Indicator */}
      <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <div
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white',
            meetsRequirement ? 'bg-green-500' : 'bg-gray-400'
          )}
        >
          {referees.length}
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {meetsRequirement ? 'Requirement met' : 'At least 1 referee is required'}
          </p>
          <p className="text-xs text-gray-500">
            {referees.length === 0
              ? 'Please add at least one referee to proceed'
              : `${referees.length} referee${referees.length !== 1 ? 's' : ''} added`}
          </p>
        </div>
      </div>

      <FormError message={submitError} />
      <FormSuccess message={submitSuccess ? 'Referee saved successfully.' : null} />

      {/* Referees List */}
      {referees.length > 0 && (
        <div className="space-y-3">
          {referees.map((referee) => (
            <Card key={referee.id} className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">
                        {referee.referee_name}
                      </h3>
                      <Badge variant="secondary">
                        {REFERENCE_TYPE_LABELS[referee.reference_type] || referee.reference_type}
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-gray-600">
                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Email
                        </p>
                        <p>{referee.referee_email}</p>
                      </div>

                      {referee.referee_phone && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Phone
                          </p>
                          <p>{referee.referee_phone}</p>
                        </div>
                      )}

                      {referee.organisation_name && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Organisation
                          </p>
                          <p>{referee.organisation_name}</p>
                        </div>
                      )}

                      {referee.job_title && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Job Title
                          </p>
                          <p>{referee.job_title}</p>
                        </div>
                      )}

                      {referee.relationship && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase">
                            Relationship
                          </p>
                          <p>{referee.relationship}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-medium text-gray-500 uppercase">
                          Period
                        </p>
                        <p>
                          {new Date(referee.date_from).toLocaleDateString('en-GB')}
                          {referee.date_to
                            ? ` - ${new Date(referee.date_to).toLocaleDateString('en-GB')}`
                            : ' onwards'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {!hasSubmitted && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(referee)}
                        className="rounded px-3 py-1 text-sm font-medium text-blue-600 hover:bg-blue-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(referee.id)}
                        className="rounded px-3 py-1 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Referee Form */}
      {!hasSubmitted && (
        <Card>
          <CardHeader>
            <CardTitle>
              {showForm
                ? editingId
                  ? 'Edit Referee'
                  : 'Add New Referee'
                : 'Add Referee'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!showForm ? (
              <Button
                onClick={() => {
                  reset();
                  setEditingId(null);
                  setShowForm(true);
                }}
                className="w-full"
              >
                + Add Referee
              </Button>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Reference Type */}
                <FormField
                  label="Reference Type"
                  error={errors.referenceType?.message}
                  required
                >
                  <Select
                    value={watch('referenceType')}
                    onValueChange={(value) =>
                      setValue('referenceType', value as ReferenceType)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={ReferenceType.Employment}>
                        Employment
                      </SelectItem>
                      <SelectItem value={ReferenceType.Education}>
                        Education
                      </SelectItem>
                      <SelectItem value={ReferenceType.Character}>
                        Character
                      </SelectItem>
                      <SelectItem value={ReferenceType.Landlord}>
                        Landlord
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                {/* Referee Name */}
                <FormField
                  label="Referee Name"
                  error={errors.refereeName?.message}
                  required
                >
                  <Input
                    placeholder="Full name of referee"
                    {...register('refereeName')}
                  />
                </FormField>

                {/* Referee Email */}
                <FormField
                  label="Referee Email"
                  error={errors.refereeEmail?.message}
                  required
                >
                  <Input
                    type="email"
                    placeholder="referee@example.com"
                    {...register('refereeEmail')}
                  />
                </FormField>

                {/* Referee Phone */}
                <FormField
                  label="Referee Phone"
                  error={errors.refereePhone?.message}
                  description="Optional"
                >
                  <Input
                    type="tel"
                    placeholder="07700 123456"
                    {...register('refereePhone')}
                  />
                </FormField>

                {/* Organisation Name */}
                <FormField
                  label="Organisation Name"
                  error={errors.organisationName?.message}
                  description="Optional"
                >
                  <Input
                    placeholder="Company or institution name"
                    {...register('organisationName')}
                  />
                </FormField>

                {/* Job Title */}
                {(referenceType === ReferenceType.Employment ||
                  referenceType === ReferenceType.Education) && (
                  <FormField
                    label="Job Title"
                    error={errors.jobTitle?.message}
                    description="Optional"
                  >
                    <Input
                      placeholder="Your job title or course name"
                      {...register('jobTitle')}
                    />
                  </FormField>
                )}

                {/* Relationship */}
                <FormField
                  label="Relationship"
                  error={errors.relationship?.message}
                  description="Optional - e.g. 'Direct Manager', 'Course Tutor', etc."
                >
                  <Input
                    placeholder="Your relationship to this referee"
                    {...register('relationship')}
                  />
                </FormField>

                {/* Date From */}
                <FormField
                  label="From Date"
                  error={errors.dateFrom?.message}
                  required
                >
                  <Input
                    type="date"
                    {...register('dateFrom')}
                  />
                </FormField>

                {/* Date To */}
                <FormField
                  label="To Date"
                  error={errors.dateTo?.message}
                  description="Optional - leave blank if current"
                >
                  <Input
                    type="date"
                    {...register('dateTo')}
                  />
                </FormField>

                {/* Form Actions */}
                <FormActions>
                  <button
                    type="button"
                    onClick={() => {
                      reset();
                      setShowForm(false);
                      setEditingId(null);
                    }}
                    className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                    {editingId ? 'Update' : 'Add'} Referee
                  </Button>
                </FormActions>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteConfirmId}
        onOpenChange={() => setDeleteConfirmId(null)}
        title="Delete Referee"
        description="Are you sure you want to delete this referee? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Navigation Footer */}
      <div className="border-t border-gray-200 pt-6">
        <div className="flex justify-between">
          <a
            href="/candidate/activity"
            className="rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Activity
          </a>
          {meetsRequirement && (
            <a
              href="/candidate/declarations"
              className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Next: Declarations →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
