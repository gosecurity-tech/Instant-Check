'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  dbsApplicationSchema,
  dbsCertificateSchema,
  dbsReviewSchema,
} from '@/lib/validators/domain';
import type { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormField, FormSection, FormActions } from '@/components/forms/FormField';
import {
  submitDbsApplicationAction,
  verifyDbsIdAction,
  markSentToDbsAction,
  recordDbsReceivedAction,
  completeDbsReviewAction,
  disputeDbsResultAction,
} from './actions';

type ApplicationFormData = z.infer<typeof dbsApplicationSchema>;
type CertificateFormData = z.input<typeof dbsCertificateSchema>;
type ReviewFormData = z.infer<typeof dbsReviewSchema>;

interface DbsActionsProps {
  dbsCheckId: string;
  status: string;
  organisationId: string;
  caseId: string;
}

export function DbsActions({
  dbsCheckId,
  status,
  organisationId,
  caseId,
}: DbsActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Application submission form
  const applicationForm = useForm<ApplicationFormData>({
    resolver: zodResolver(dbsApplicationSchema),
    defaultValues: {
      applicationReference: '',
    },
  });

  const handleApplicationSubmit = (data: ApplicationFormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await submitDbsApplicationAction({
          dbsCheckId,
          applicationReference: data.applicationReference,
          organisationId,
        });
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to submit application');
      }
    });
  };

  // Certificate received form
  const certificateForm = useForm<CertificateFormData>({
    resolver: zodResolver(dbsCertificateSchema),
    defaultValues: {
      certificateNumber: '',
      certificateDate: '',
      hasAdverse: false,
      adverseDetails: '',
    },
  });

  const handleCertificateSubmit = (data: CertificateFormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const castData = data as z.infer<typeof dbsCertificateSchema>;
        const result = await recordDbsReceivedAction({
          dbsCheckId,
          certificateNumber: castData.certificateNumber,
          certificateDate: castData.certificateDate,
          hasAdverse: castData.hasAdverse,
          adverseDetails: castData.adverseDetails,
          organisationId,
        });
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to record certificate');
      }
    });
  };

  // Review form
  const reviewForm = useForm<ReviewFormData>({
    resolver: zodResolver(dbsReviewSchema),
    defaultValues: {
      clear: true,
      reviewNotes: '',
    },
  });

  const handleReviewSubmit = (data: ReviewFormData) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await completeDbsReviewAction({
          dbsCheckId,
          clear: data.clear,
          reviewNotes: data.reviewNotes,
          organisationId,
        });
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to complete review');
      }
    });
  };

  // Handle verify ID
  const handleVerifyId = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await verifyDbsIdAction({
          dbsCheckId,
          organisationId,
        });
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to verify ID');
      }
    });
  };

  // Handle mark sent to DBS
  const handleMarkSentToDbs = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await markSentToDbsAction({
          dbsCheckId,
          organisationId,
        });
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to mark as sent');
      }
    });
  };

  // Handle dispute
  const [disputeNotes, setDisputeNotes] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);

  const handleDispute = () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await disputeDbsResultAction({
          dbsCheckId,
          notes: disputeNotes,
          organisationId,
        });
        if (result.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to dispute result');
      }
    });
  };

  const hasAdverse = certificateForm.watch('hasAdverse');

  // not_started: Show application form
  if (status === 'not_started') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Submit DBS Application</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>}

          <form onSubmit={applicationForm.handleSubmit(handleApplicationSubmit)}>
            <FormSection title="Application Details">
              <FormField
                label="Application Reference"
                error={applicationForm.formState.errors.applicationReference?.message}
              >
                <Input
                  placeholder="e.g., DBS/2024/001234"
                  {...applicationForm.register('applicationReference')}
                />
              </FormField>
            </FormSection>

            <FormActions>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    );
  }

  // application_submitted: Show "Verify ID" button
  if (status === 'application_submitted') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Step: Verify ID</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>}
          <p className="mb-4 text-sm text-gray-600">
            Once the candidate's ID has been verified, proceed to the next step.
          </p>
          <Button onClick={handleVerifyId} disabled={isPending}>
            {isPending ? 'Verifying...' : 'Verify ID'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // id_verified: Show "Mark Sent to DBS" button
  if (status === 'id_verified') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Next Step: Send to DBS</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>}
          <p className="mb-4 text-sm text-gray-600">
            ID has been verified. Mark this check as sent to the DBS service.
          </p>
          <Button onClick={handleMarkSentToDbs} disabled={isPending}>
            {isPending ? 'Marking...' : 'Mark Sent to DBS'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // sent_to_dbs: Show certificate received form
  if (status === 'sent_to_dbs') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Record Certificate Received</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>}

          <form onSubmit={certificateForm.handleSubmit(handleCertificateSubmit)}>
            <FormSection title="Certificate Details">
              <FormField
                label="Certificate Number"
                error={certificateForm.formState.errors.certificateNumber?.message}
              >
                <Input
                  placeholder="e.g., 000000/12345678"
                  {...certificateForm.register('certificateNumber')}
                />
              </FormField>

              <FormField
                label="Certificate Date"
                error={certificateForm.formState.errors.certificateDate?.message}
              >
                <Input type="date" {...certificateForm.register('certificateDate')} />
              </FormField>

              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    {...certificateForm.register('hasAdverse')}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Adverse information found
                  </span>
                </label>
              </div>

              {hasAdverse && (
                <FormField
                  label="Adverse Details"
                  error={certificateForm.formState.errors.adverseDetails?.message}
                >
                  <Textarea
                    placeholder="Describe the adverse information..."
                    rows={4}
                    {...certificateForm.register('adverseDetails')}
                  />
                </FormField>
              )}
            </FormSection>

            <FormActions>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Recording...' : 'Record Certificate'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    );
  }

  // received: Show review form
  if (status === 'received') {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Complete DBS Review</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>}

          <form onSubmit={reviewForm.handleSubmit(handleReviewSubmit)}>
            <FormSection title="Review Decision">
              <div className="mb-4">
                <p className="mb-3 text-sm font-medium text-gray-700">Decision</p>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="true"
                      checked={reviewForm.watch('clear') === true}
                      onChange={() => reviewForm.setValue('clear', true)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Clear</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      value="false"
                      checked={reviewForm.watch('clear') === false}
                      onChange={() => reviewForm.setValue('clear', false)}
                      className="h-4 w-4"
                    />
                    <span className="text-sm text-gray-700">Adverse</span>
                  </label>
                </div>
                {reviewForm.formState.errors.clear && (
                  <p className="mt-1 text-sm text-red-600">
                    {reviewForm.formState.errors.clear.message}
                  </p>
                )}
              </div>

              <FormField
                label="Review Notes"
                error={reviewForm.formState.errors.reviewNotes?.message}
              >
                <Textarea
                  placeholder="Add any notes about this review..."
                  rows={4}
                  {...reviewForm.register('reviewNotes')}
                />
              </FormField>
            </FormSection>

            <FormActions>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Submitting...' : 'Complete Review'}
              </Button>
            </FormActions>
          </form>
        </CardContent>
      </Card>
    );
  }

  // clear: Show success message
  if (status === 'clear') {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="text-green-900">DBS Check Cleared</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-800">
            This DBS check has been successfully cleared. No further action required.
          </p>
        </CardContent>
      </Card>
    );
  }

  // adverse: Show dispute button
  if (status === 'adverse') {
    if (!showDisputeForm) {
      return (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Adverse Result</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-red-800">
              This DBS check has identified adverse information. You can dispute this result if needed.
            </p>
            {error && <div className="mb-4 rounded-md bg-red-100 p-3 text-red-800">{error}</div>}
            <Button
              variant="outline"
              onClick={() => setShowDisputeForm(true)}
              disabled={isPending}
            >
              Dispute Result
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>Dispute DBS Result</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-red-800">{error}</div>}

          <FormSection title="Dispute Information">
            <FormField label="Dispute Notes">
              <Textarea
                placeholder="Explain why you are disputing this result..."
                rows={4}
                value={disputeNotes}
                onChange={(e) => setDisputeNotes(e.target.value)}
              />
            </FormField>
          </FormSection>

          <FormActions>
            <Button
              variant="outline"
              onClick={() => setShowDisputeForm(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button onClick={handleDispute} disabled={isPending || !disputeNotes.trim()}>
              {isPending ? 'Submitting...' : 'Submit Dispute'}
            </Button>
          </FormActions>
        </CardContent>
      </Card>
    );
  }

  // disputed: Show status message
  if (status === 'disputed') {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardHeader>
          <CardTitle className="text-amber-900">Dispute Submitted</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-800">
            The dispute has been submitted. No further action required at this time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return null;
}
