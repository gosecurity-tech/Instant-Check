'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rtwDocumentSchema, rtwShareCodeSchema, rtwReviewSchema } from '@/lib/validators/domain';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField, FormSection, FormActions } from '@/components/forms/FormField';
import {
  submitRtwDocumentAction,
  submitRtwShareCodeAction,
  startRtwReviewAction,
  completeRtwReviewAction,
  markRtwExpiredAction,
} from './actions';

type DocumentFormData = z.infer<typeof rtwDocumentSchema>;
type ShareCodeFormData = z.infer<typeof rtwShareCodeSchema>;
type ReviewFormData = z.input<typeof rtwReviewSchema>;

interface RtwActionsProps {
  rtwCheckId: string;
  status: string;
  organisationId: string;
  caseId: string;
  checkMethod: string;
}

const isDocumentBasedMethod = (method: string): boolean => {
  return ['manual_document', 'idvt', 'employer_checking_service'].includes(method);
};

const isShareCodeMethod = (method: string): boolean => {
  return method === 'share_code';
};

export function RtwActions({
  rtwCheckId,
  status,
  organisationId,
  caseId,
  checkMethod,
}: RtwActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Document submission form
  const documentForm = useForm<DocumentFormData>({
    resolver: zodResolver(rtwDocumentSchema),
    defaultValues: {
      documentType: '',
      documentReference: '',
      expiryDate: '',
    },
  });

  const handleDocumentSubmit = (data: DocumentFormData) => {
    setError(null);
    startTransition(async () => {
      const result = await submitRtwDocumentAction({
        rtwCheckId,
        documentType: data.documentType,
        documentReference: data.documentReference,
        expiryDate: data.expiryDate,
        organisationId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  // Share code submission form
  const shareCodeForm = useForm<ShareCodeFormData>({
    resolver: zodResolver(rtwShareCodeSchema),
    defaultValues: {
      shareCode: '',
    },
  });

  const handleShareCodeSubmit = (data: ShareCodeFormData) => {
    setError(null);
    startTransition(async () => {
      const result = await submitRtwShareCodeAction({
        rtwCheckId,
        shareCode: data.shareCode,
        organisationId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  // Review form
  const reviewForm = useForm<ReviewFormData>({
    resolver: zodResolver(rtwReviewSchema),
    defaultValues: {
      verified: true,
      reviewNotes: '',
      hasTimeLimit: false,
      timeLimitEnd: '',
    },
  });

  const handleReviewSubmit = (data: ReviewFormData) => {
    setError(null);
    startTransition(async () => {
      const result = await completeRtwReviewAction({
        rtwCheckId,
        verified: data.verified as boolean,
        reviewNotes: data.reviewNotes,
        hasTimeLimit: data.hasTimeLimit as boolean,
        timeLimitEnd: data.timeLimitEnd,
        organisationId,
      });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleStartReview = () => {
    setError(null);
    startTransition(async () => {
      const result = await startRtwReviewAction({ rtwCheckId, organisationId });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const handleMarkExpired = () => {
    setError(null);
    startTransition(async () => {
      const result = await markRtwExpiredAction({ rtwCheckId, organisationId });
      if (result.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  // Not started state - show document or share code form
  if (status === 'not_started') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit Right to Work Information</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>
          )}

          {isDocumentBasedMethod(checkMethod) && (
            <form onSubmit={documentForm.handleSubmit(handleDocumentSubmit)}>
              <FormSection title="Document Details">
                <FormField
                  label="Document Type"
                  error={documentForm.formState.errors.documentType?.message}
                >
                  <Input
                    placeholder="e.g., Passport, Visa, Permit"
                    {...documentForm.register('documentType')}
                  />
                </FormField>

                <FormField
                  label="Document Reference"
                  error={documentForm.formState.errors.documentReference?.message}
                >
                  <Input
                    placeholder="e.g., Document number or reference"
                    {...documentForm.register('documentReference')}
                  />
                </FormField>

                <FormField
                  label="Expiry Date"
                  error={documentForm.formState.errors.expiryDate?.message}
                >
                  <Input
                    type="date"
                    {...documentForm.register('expiryDate')}
                  />
                </FormField>
              </FormSection>

              <FormActions>
                <Button
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? 'Submitting...' : 'Submit Document'}
                </Button>
              </FormActions>
            </form>
          )}

          {isShareCodeMethod(checkMethod) && (
            <form onSubmit={shareCodeForm.handleSubmit(handleShareCodeSubmit)}>
              <FormSection title="Share Code">
                <FormField
                  label="Share Code"
                  error={shareCodeForm.formState.errors.shareCode?.message}
                >
                  <Input
                    placeholder="Enter the share code from the candidate"
                    {...shareCodeForm.register('shareCode')}
                  />
                </FormField>
              </FormSection>

              <FormActions>
                <Button
                  type="submit"
                  disabled={isPending}
                >
                  {isPending ? 'Submitting...' : 'Submit Share Code'}
                </Button>
              </FormActions>
            </form>
          )}
        </CardContent>
      </Card>
    );
  }

  // Document submitted state - show start review button
  if (status === 'document_submitted') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Ready for Review</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>
          )}
          <p className="mb-4 text-gray-700">
            The Right to Work documentation has been submitted. You can now start the review process.
          </p>
          <Button
            onClick={handleStartReview}
            disabled={isPending}
          >
            {isPending ? 'Starting Review...' : 'Start Review'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Under review state - show review completion form
  if (status === 'under_review') {
    const hasTimeLimit = reviewForm.watch('hasTimeLimit');

    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete Review</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>
          )}

          <form onSubmit={reviewForm.handleSubmit(handleReviewSubmit)}>
            <FormSection title="Review Decision">
              {/* Verified radio buttons */}
              <div>
                <p className="mb-3 text-sm font-medium text-gray-700">Verification Result</p>
                <div className="space-y-2">
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      value="true"
                      checked={reviewForm.watch('verified') === true}
                      onChange={() => reviewForm.setValue('verified', true)}
                      className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600"
                    />
                    <span className="text-gray-900">Verified</span>
                  </label>
                  <label className="flex items-center gap-3">
                    <input
                      type="radio"
                      value="false"
                      checked={reviewForm.watch('verified') === false}
                      onChange={() => reviewForm.setValue('verified', false)}
                      className="h-4 w-4 cursor-pointer border-gray-300 text-blue-600"
                    />
                    <span className="text-gray-900">Failed</span>
                  </label>
                </div>
                {reviewForm.formState.errors.verified && (
                  <p className="mt-1 text-sm text-red-600">{reviewForm.formState.errors.verified.message}</p>
                )}
              </div>

              <FormField
                label="Review Notes"
                error={reviewForm.formState.errors.reviewNotes?.message}
              >
                <Textarea
                  placeholder="Add any notes about your review decision..."
                  rows={4}
                  {...reviewForm.register('reviewNotes')}
                />
              </FormField>

              {/* Has time limit checkbox */}
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={hasTimeLimit}
                    onChange={(e) => reviewForm.setValue('hasTimeLimit', e.target.checked)}
                    className="h-4 w-4 cursor-pointer rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-sm text-gray-700">This check has a time limit</span>
                </label>
              </div>

              {/* Time limit end date (conditional) */}
              {hasTimeLimit && (
                <FormField
                  label="Time Limit End Date"
                  error={reviewForm.formState.errors.timeLimitEnd?.message}
                >
                  <Input
                    type="date"
                    {...reviewForm.register('timeLimitEnd')}
                  />
                </FormField>
              )}
            </FormSection>

            <FormActions>
              <Button
                type="submit"
                disabled={isPending}
              >
                {isPending ? 'Saving Review...' : 'Save Review'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    );
  }

  // Verified state - show mark expired button and success message
  if (status === 'verified') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Verification Complete</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>
          )}
          <div className="mb-4 rounded-md bg-green-50 p-3 text-green-800">
            Right to Work verification has been successfully completed.
          </div>
          <p className="mb-4 text-gray-700">
            When the candidate's Right to Work validity lapses, mark this check as expired.
          </p>
          <Button
            onClick={handleMarkExpired}
            disabled={isPending}
            variant="secondary"
          >
            {isPending ? 'Marking as Expired...' : 'Mark as Expired'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Failed or expired state - show status message, no actions
  if (status === 'failed' || status === 'expired') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Check Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`rounded-md p-3 ${
            status === 'failed'
              ? 'bg-red-50 text-red-800'
              : 'bg-yellow-50 text-yellow-800'
          }`}>
            {status === 'failed'
              ? 'This Right to Work check has failed verification. Please contact the candidate for additional documentation.'
              : 'This Right to Work check has expired. The candidate will need to provide updated documentation.'}
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
