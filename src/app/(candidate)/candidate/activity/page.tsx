'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
// Date formatting helper (no date-fns needed)
function formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { FormField, FormSection, FormActions } from '@/components/forms/FormField';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';

import { activitySchema } from '@/lib/validators/domain';
import type { z } from 'zod';

type ActivityFormData = z.input<typeof activitySchema>;
import { validateActivityTimeline } from '@/lib/timeline';
import { ActivityType } from '@/types/enums';

import {
  getMyActivities,
  getSubmissionStatus,
  saveActivity,
  deleteActivity,
} from '../actions';

// ============================================================
// Types
// ============================================================

interface Activity {
  id: string;
  candidate_id: string;
  activity_type: string;
  organisation_name: string | null;
  job_title: string | null;
  description: string | null;
  date_from: string;
  date_to: string | null;
  is_current: boolean;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

// ============================================================
// Helper Functions
// ============================================================

function formatActivityType(type: string): string {
  return type
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function shouldShowField(field: 'organisationName' | 'jobTitle', activityType: string): boolean {
  const typesWithOrgName = ['employed', 'self_employed', 'education', 'volunteering'];
  const typesWithJobTitle = ['employed', 'self_employed'];

  if (field === 'organisationName') return typesWithOrgName.includes(activityType);
  if (field === 'jobTitle') return typesWithJobTitle.includes(activityType);

  return false;
}

// ============================================================
// Main Component
// ============================================================

export default function CandidateActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ActivityFormData>({
    resolver: zodResolver(activitySchema),
  });

  const activityType = watch('activityType');
  const isCurrent = watch('isCurrent');

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [activitiesData, statusData] = await Promise.all([
          getMyActivities(),
          getSubmissionStatus(),
        ]);
        setActivities(activitiesData);
        setHasSubmitted(statusData.hasSubmitted);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Handle form submission
  const onSubmit = async (data: ActivityFormData) => {
    setSubmitting(true);
    try {
      const result = await saveActivity({
        ...(data as import('@/lib/validators/domain').ActivityInput),
        ...(editingId && { id: editingId }),
      });

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        // Refresh activities list
        const updatedActivities = await getMyActivities();
        setActivities(updatedActivities);
        reset();
        setIsEditing(false);
        setEditingId(null);
      }
    } catch (err) {
      console.error('Error saving activity:', err);
      alert('An unexpected error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setSubmitting(true);
    try {
      const result = await deleteActivity(deleteConfirm);

      if (result.error) {
        alert(`Error: ${result.error}`);
      } else {
        setActivities(activities.filter((a) => a.id !== deleteConfirm));
      }
    } catch (err) {
      console.error('Error deleting activity:', err);
      alert('An unexpected error occurred');
    } finally {
      setSubmitting(false);
      setDeleteConfirm(null);
    }
  };

  // Handle edit
  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
    reset({
      activityType: activity.activity_type as ActivityType,
      organisationName: activity.organisation_name || '',
      jobTitle: activity.job_title || '',
      description: activity.description || '',
      dateFrom: activity.date_from,
      dateTo: activity.date_to,
      isCurrent: activity.is_current,
      contactName: activity.contact_name || '',
      contactEmail: activity.contact_email || '',
      contactPhone: activity.contact_phone || '',
    });
    setIsEditing(true);
  };

  // Calculate timeline coverage
  const timeline = validateActivityTimeline(activities);

  // Read-only view if submitted
  if (hasSubmitted) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity History</h1>
          <p className="mt-2 text-sm text-gray-600">
            Your submission has been completed. No further changes are allowed.
          </p>
        </div>

        <div className="rounded-md bg-blue-50 p-4 text-sm text-blue-700">
          Your vetting submission is now under review. You will be notified of the outcome via email.
        </div>

        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="pt-6">
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-gray-900">
                    {formatActivityType(activity.activity_type)}
                  </p>
                  {activity.organisation_name && (
                    <p className="text-gray-700">{activity.organisation_name}</p>
                  )}
                  {activity.job_title && (
                    <p className="text-gray-600">{activity.job_title}</p>
                  )}
                  {activity.description && (
                    <p className="text-gray-600">{activity.description}</p>
                  )}
                  <p className="text-gray-500">
                    {formatMonthYear(activity.date_from)}
                    {' - '}
                    {activity.is_current
                      ? 'Present'
                      : formatMonthYear(activity.date_to!)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity History</h1>
        <p className="mt-2 text-sm text-gray-600">
          Provide your employment, education, travel, and any gaps for the last 5 years. BS7858
          requires a complete timeline with no gaps.
        </p>
      </div>

      {/* Timeline Coverage */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">5-Year Coverage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Coverage Progress</span>
              <span className="font-semibold text-gray-900">{timeline.coveragePercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-full transition-all ${
                  timeline.coveragePercent === 100 ? 'bg-green-500' : 'bg-yellow-500'
                }`}
                style={{ width: `${timeline.coveragePercent}%` }}
              />
            </div>
          </div>

          {timeline.gaps.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-red-600">Gaps detected:</p>
              {timeline.gaps.map((gap, idx) => (
                <p key={idx} className="text-sm text-red-600">
                  {gap.days} days from {gap.from} to {gap.to}
                </p>
              ))}
            </div>
          )}

          {timeline.gaps.length === 0 && activities.length > 0 && (
            <p className="text-sm text-green-600">Complete 5-year history!</p>
          )}

          {activities.length === 0 && (
            <p className="text-sm text-gray-500">Add activities to get started.</p>
          )}
        </CardContent>
      </Card>

      {/* Existing Activities */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity) => (
            <Card key={activity.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2 text-sm">
                    <p className="font-semibold text-gray-900">
                      {formatActivityType(activity.activity_type)}
                    </p>
                    {activity.organisation_name && (
                      <p className="text-gray-700">{activity.organisation_name}</p>
                    )}
                    {activity.job_title && (
                      <p className="text-gray-600">{activity.job_title}</p>
                    )}
                    {activity.description && (
                      <p className="whitespace-pre-wrap text-gray-600">{activity.description}</p>
                    )}
                    <p className="pt-2 text-xs text-gray-500">
                      {formatMonthYear(activity.date_from)}
                      {' - '}
                      {activity.is_current
                        ? 'Present'
                        : formatMonthYear(activity.date_to!)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(activity)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDeleteConfirm(activity.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit Form */}
      <Card className={!isEditing ? 'border-dashed' : ''}>
        <CardHeader>
          <CardTitle className="text-base">
            {isEditing ? 'Edit Activity' : 'Add Activity'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <FormSection title="Activity Details">
              <FormField label="Activity Type" required error={errors.activityType?.message}>
                <Select
                  value={activityType || ''}
                  onValueChange={(value) => setValue('activityType', value as ActivityType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select activity type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ActivityType.Employed}>
                      Employed
                    </SelectItem>
                    <SelectItem value={ActivityType.SelfEmployed}>
                      Self-employed
                    </SelectItem>
                    <SelectItem value={ActivityType.Unemployed}>
                      Unemployed
                    </SelectItem>
                    <SelectItem value={ActivityType.Education}>
                      Education
                    </SelectItem>
                    <SelectItem value={ActivityType.Travel}>Travel</SelectItem>
                    <SelectItem value={ActivityType.CareerBreak}>
                      Career Break
                    </SelectItem>
                    <SelectItem value={ActivityType.MaternityPaternity}>
                      Maternity/Paternity
                    </SelectItem>
                    <SelectItem value={ActivityType.Volunteering}>
                      Volunteering
                    </SelectItem>
                    <SelectItem value={ActivityType.Other}>Other</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {shouldShowField('organisationName', activityType) && (
                <FormField
                  label={
                    activityType === ActivityType.Education
                      ? 'School/University'
                      : 'Organisation Name'
                  }
                  required={shouldShowField('organisationName', activityType)}
                  error={errors.organisationName?.message}
                >
                  <Input
                    placeholder={
                      activityType === ActivityType.Education
                        ? 'e.g., University of London'
                        : 'e.g., Acme Corp'
                    }
                    {...register('organisationName')}
                  />
                </FormField>
              )}

              {shouldShowField('jobTitle', activityType) && (
                <FormField
                  label="Job Title"
                  required={shouldShowField('jobTitle', activityType)}
                  error={errors.jobTitle?.message}
                >
                  <Input
                    placeholder="e.g., Senior Developer"
                    {...register('jobTitle')}
                  />
                </FormField>
              )}

              <FormField label="Description" error={errors.description?.message}>
                <Textarea
                  placeholder="Additional details about this activity (optional)"
                  className="resize-none"
                  rows={4}
                  {...register('description')}
                />
              </FormField>
            </FormSection>

            <FormSection title="Date Range">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="From" required error={errors.dateFrom?.message}>
                  <Input type="date" {...register('dateFrom')} />
                </FormField>

                <FormField
                  label="To"
                  error={errors.dateTo?.message}
                  description={isCurrent ? 'Not applicable for ongoing activity' : undefined}
                >
                  <Input
                    type="date"
                    disabled={isCurrent}
                    {...register('dateTo')}
                  />
                </FormField>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  {...register('isCurrent')}
                />
                <label htmlFor="isCurrent" className="text-sm font-medium text-gray-700">
                  This is my current activity
                </label>
              </div>
            </FormSection>

            <FormSection title="Contact Information (Optional)">
              <FormField label="Contact Name" error={errors.contactName?.message}>
                <Input
                  placeholder="e.g., John Manager"
                  {...register('contactName')}
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Contact Email" error={errors.contactEmail?.message}>
                  <Input
                    type="email"
                    placeholder="e.g., john@example.com"
                    {...register('contactEmail')}
                  />
                </FormField>

                <FormField label="Contact Phone" error={errors.contactPhone?.message}>
                  <Input
                    type="tel"
                    placeholder="e.g., 020 7946 0958"
                    {...register('contactPhone')}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormActions>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setEditingId(null);
                  reset();
                }}
              >
                {isEditing ? 'Cancel' : 'Clear'}
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting
                  ? 'Saving...'
                  : editingId
                    ? 'Update Activity'
                    : 'Add Activity'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-gray-200 pt-6">
        <Link
          href="/candidate/address"
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Addresses
        </Link>

        <Link
          href="/candidate/referees"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Next: Referees →
        </Link>
      </div>

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Activity"
        description="Are you sure you want to delete this activity? This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
      />
    </div>
  );
}
