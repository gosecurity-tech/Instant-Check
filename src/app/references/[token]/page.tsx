'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { referenceResponseSchema } from '@/lib/validators/domain';
import type { z } from 'zod';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { FormField, FormSection, FormActions } from '@/components/forms/FormField';

type ReferenceFormData = z.input<typeof referenceResponseSchema>;

interface ReferenceRequest {
  request_id: string;
  referee_name: string;
  referee_email: string;
  reference_type: string;
  organisation_name: string | null;
  candidate_name: string;
}

export default function RefereeSubmissionPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [refData, setRefData] = useState<ReferenceRequest | null>(null);

  const form = useForm<ReferenceFormData>({
    resolver: zodResolver(referenceResponseSchema),
    mode: 'onBlur',
    defaultValues: {
      respondentName: '',
      respondentEmail: '',
      respondentJobTitle: '',
      candidateKnown: undefined,
      datesConfirmed: undefined,
      dateFromConfirmed: '',
      dateToConfirmed: '',
      jobTitleConfirmed: '',
      reasonForLeaving: '',
      performanceRating: '',
      conductIssues: undefined,
      conductDetails: '',
      wouldReemploy: undefined,
      additionalComments: '',
    },
  });

  const candidateKnownValue = form.watch('candidateKnown');
  const datesConfirmedValue = form.watch('datesConfirmed');
  const conductIssuesValue = form.watch('conductIssues');

  // Fetch reference request data on mount
  useEffect(() => {
    const fetchReferenceData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/references/${token}`);

        if (!response.ok) {
          if (response.status === 404) {
            setError('This reference link is invalid, expired, or has already been submitted.');
          } else {
            setError('Failed to load reference form. Please try again.');
          }
          setLoading(false);
          return;
        }

        const data: ReferenceRequest = await response.json();
        setRefData(data);

        // Pre-fill referee details
        form.setValue('respondentName', data.referee_name);
        form.setValue('respondentEmail', data.referee_email);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching reference data:', err);
        setError('An unexpected error occurred. Please try again.');
        setLoading(false);
      }
    };

    fetchReferenceData();
  }, [token, form]);

  const onSubmit = async (data: ReferenceFormData) => {
    try {
      setSubmitting(true);
      const response = await fetch(`/api/references/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      setSuccess(true);
      form.reset();
    } catch (err) {
      console.error('Submission error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to submit reference. Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center mb-8">
            <div className="h-8 w-40 mx-auto bg-slate-200 rounded mb-2"></div>
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 flex items-center">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Instant Check</h1>
            <p className="text-slate-600 mt-2">Reference Submission</p>
          </div>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-800 font-medium mb-4">{error}</p>
                <p className="text-red-700 text-sm mb-6">
                  If you believe this is an error, please contact the recruiting team.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4 flex items-center">
        <div className="max-w-3xl mx-auto w-full">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-slate-900">Instant Check</h1>
            <p className="text-slate-600 mt-2">Reference Submission</p>
          </div>
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-green-200 flex items-center justify-center mx-auto mb-4">
                  <svg
                    className="w-6 h-6 text-green-700"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-900 mb-2">Thank You</h2>
                <p className="text-green-800 mb-4">
                  Your reference has been submitted successfully. We appreciate your time in
                  completing this form.
                </p>
                <p className="text-green-700 text-sm">
                  The recruiting team will use your response as part of their vetting process.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Form state
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-12 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Instant Check</h1>
          <p className="text-slate-600 mt-2">Reference Submission</p>
        </div>

        {/* Candidate & Reference Type Info */}
        {refData && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Candidate
                  </p>
                  <p className="text-lg font-semibold text-slate-900">{refData.candidate_name}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
                    Reference Type
                  </p>
                  <p className="text-lg font-semibold text-slate-900 capitalize">
                    {refData.reference_type}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Your Details */}
          <FormSection title="Your Details" description="Please provide your contact information.">
            <div className="space-y-4">
              <FormField
                label="Full Name"
                required
                error={form.formState.errors.respondentName?.message}
              >
                <Input
                  placeholder="Enter your full name"
                  {...form.register('respondentName')}
                  disabled={submitting}
                />
              </FormField>

              <FormField
                label="Email Address"
                required
                error={form.formState.errors.respondentEmail?.message}
              >
                <Input
                  type="email"
                  placeholder="Enter your email address"
                  {...form.register('respondentEmail')}
                  disabled={submitting}
                />
              </FormField>

              <FormField
                label="Job Title (Optional)"
                error={form.formState.errors.respondentJobTitle?.message}
              >
                <Input
                  placeholder="Enter your job title"
                  {...form.register('respondentJobTitle')}
                  disabled={submitting}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Section 2: Candidate Confirmation */}
          <FormSection title="Candidate Confirmation" description="Please confirm your knowledge of the candidate.">
            <div className="space-y-4">
              {/* Candidate Known */}
              <FormField
                label="Did you know the candidate during their employment?"
                required
                error={form.formState.errors.candidateKnown?.message}
              >
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      checked={candidateKnownValue === true}
                      onChange={() => form.setValue('candidateKnown', true)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      checked={candidateKnownValue === false}
                      onChange={() => form.setValue('candidateKnown', false)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">No</span>
                  </label>
                </div>
              </FormField>

              {/* Dates Confirmed */}
              <FormField
                label="Can you confirm the dates of employment?"
                required
                error={form.formState.errors.datesConfirmed?.message}
              >
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      checked={datesConfirmedValue === true}
                      onChange={() => form.setValue('datesConfirmed', true)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      checked={datesConfirmedValue === false}
                      onChange={() => form.setValue('datesConfirmed', false)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">No</span>
                  </label>
                </div>
              </FormField>

              {/* Conditional: Date Range */}
              {datesConfirmedValue === true && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
                  <FormField
                    label="From Date"
                    error={form.formState.errors.dateFromConfirmed?.message}
                  >
                    <Input
                      type="date"
                      {...form.register('dateFromConfirmed')}
                      disabled={submitting}
                    />
                  </FormField>
                  <FormField
                    label="To Date"
                    error={form.formState.errors.dateToConfirmed?.message}
                  >
                    <Input
                      type="date"
                      {...form.register('dateToConfirmed')}
                      disabled={submitting}
                    />
                  </FormField>
                </div>
              )}

              {/* Job Title Confirmed */}
              <FormField
                label="Job Title (as employed)"
                error={form.formState.errors.jobTitleConfirmed?.message}
              >
                <Input
                  placeholder="Enter the job title"
                  {...form.register('jobTitleConfirmed')}
                  disabled={submitting}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Section 3: Employment Details */}
          <FormSection title="Employment Details" description="Please provide details about the candidate's employment.">
            <div className="space-y-4">
              {/* Reason for Leaving */}
              <FormField
                label="Reason for Leaving"
                error={form.formState.errors.reasonForLeaving?.message}
              >
                <Textarea
                  placeholder="Please describe the reason for leaving"
                  {...form.register('reasonForLeaving')}
                  disabled={submitting}
                  rows={3}
                />
              </FormField>

              {/* Performance Rating */}
              <FormField
                label="Performance Rating"
                error={form.formState.errors.performanceRating?.message}
              >
                <Select
                  value={form.watch('performanceRating') || ''}
                  onValueChange={(value) => form.setValue('performanceRating', value)}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a rating" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not applicable</SelectItem>
                    <SelectItem value="excellent">Excellent</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="satisfactory">Satisfactory</SelectItem>
                    <SelectItem value="poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </FormField>

              {/* Conduct Issues */}
              <FormField
                label="Were there any conduct issues during employment?"
                required
                error={form.formState.errors.conductIssues?.message}
              >
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      checked={conductIssuesValue === true}
                      onChange={() => form.setValue('conductIssues', true)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      checked={conductIssuesValue === false}
                      onChange={() => form.setValue('conductIssues', false)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">No</span>
                  </label>
                </div>
              </FormField>

              {/* Conditional: Conduct Details */}
              {conductIssuesValue === true && (
                <FormField
                  label="Please describe the conduct issues"
                  error={form.formState.errors.conductDetails?.message}
                >
                  <Textarea
                    placeholder="Please provide details about the conduct issues"
                    {...form.register('conductDetails')}
                    disabled={submitting}
                    rows={3}
                  />
                </FormField>
              )}

              {/* Would Reemploy */}
              <FormField
                label="Would you re-employ this candidate?"
                error={form.formState.errors.wouldReemploy?.message}
              >
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="true"
                      checked={form.watch('wouldReemploy') === true}
                      onChange={() => form.setValue('wouldReemploy', true)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">Yes</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="false"
                      checked={form.watch('wouldReemploy') === false}
                      onChange={() => form.setValue('wouldReemploy', false)}
                      disabled={submitting}
                      className="w-4 h-4 text-blue-600 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">No</span>
                  </label>
                </div>
              </FormField>
            </div>
          </FormSection>

          {/* Section 4: Additional Information */}
          <FormSection title="Additional Information" description="Please provide any additional comments or information.">
            <div className="space-y-4">
              <FormField
                label="Additional Comments (Optional)"
                error={form.formState.errors.additionalComments?.message}
              >
                <Textarea
                  placeholder="Please provide any additional comments"
                  {...form.register('additionalComments')}
                  disabled={submitting}
                  rows={4}
                />
              </FormField>
            </div>
          </FormSection>

          {/* Form Actions */}
          <FormActions>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full md:w-auto"
            >
              {submitting ? 'Submitting...' : 'Submit Reference'}
            </Button>
          </FormActions>

          {/* Error Message Display */}
          {error && !success && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="text-center text-sm text-slate-600 pt-4 border-t border-slate-200">
          <p>
            Your information is confidential and will be stored securely in accordance with data
            protection regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
