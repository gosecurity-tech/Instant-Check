import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireInternalUser } from '@/lib/auth/server';
import { getReferenceRequestById } from '@/lib/services/references';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ReferenceActions } from '../ReferenceActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReferenceStatus } from '@/types/enums';

interface PageProps {
  params: Promise<{ id: string; refId: string }>;
}

export default async function ReferenceDetailPage({ params }: PageProps) {
  await requireInternalUser();
  const { id: caseId, refId } = await params;

  const detail = await getReferenceRequestById(refId);

  if (!detail) {
    notFound();
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return 'Not set';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getBadgeVariant = (value: boolean | null | string) => {
    if (typeof value === 'boolean') {
      return value ? 'default' : 'destructive';
    }
    return 'secondary';
  };

  const getBadgeLabel = (value: boolean | null) => {
    if (value === null) return 'Not answered';
    return value ? 'Yes' : 'No';
  };

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Link
          href={`/cases/${caseId}/references`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Back
        </Link>
        <PageHeader
          title={`Reference Request: ${detail.referee_name}`}
          description="View and manage reference request details and responses"
        />
      </div>

      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column - Request Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Request Details Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Request Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Reference Type</p>
                  <div className="mt-1">
                    <Badge variant="secondary" className="capitalize">
                      {detail.reference_type.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={detail.status} />
                  </div>
                </div>
              </div>

              <hr className="my-4" />

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-sm font-medium">{formatDate(detail.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sent</p>
                  <p className="text-sm font-medium">{formatDateTime(detail.sent_at)}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-600">Received</p>
                  <p className="text-sm font-medium">{formatDateTime(detail.received_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reminders Sent</p>
                  <p className="text-sm font-medium">{detail.reminder_count}</p>
                </div>
              </div>

              {detail.reminder_sent_at && (
                <div>
                  <p className="text-sm text-gray-600">Last Reminder</p>
                  <p className="text-sm font-medium">{formatDateTime(detail.reminder_sent_at)}</p>
                </div>
              )}

              <hr className="my-4" />

              <div>
                <p className="text-sm text-gray-600">Token Expires</p>
                <p className="text-sm font-medium">{formatDateTime(detail.token_expires_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Referee Info Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Referee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">Full Name</p>
                <p className="text-sm font-medium">{detail.referee_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-sm font-medium break-all">{detail.referee_email}</p>
              </div>
              {detail.referee_phone && (
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="text-sm font-medium">{detail.referee_phone}</p>
                </div>
              )}
              {detail.referee_organisation && (
                <div>
                  <p className="text-sm text-gray-600">Organisation</p>
                  <p className="text-sm font-medium">{detail.referee_organisation}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions Section */}
          <ReferenceActions
            requestId={detail.id}
            status={detail.status as ReferenceStatus}
            organisationId={detail.organisation_id}
            caseId={caseId}
          />

          {/* Response Section */}
          {detail.response && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Reference Response</CardTitle>
                  <Badge variant="default">Submitted</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Respondent Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Respondent Details</h3>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <p className="text-sm font-medium">{detail.response.respondent_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Email</p>
                      <p className="text-sm font-medium break-all">{detail.response.respondent_email}</p>
                    </div>
                    {detail.response.respondent_job_title && (
                      <div>
                        <p className="text-sm text-gray-600">Job Title</p>
                        <p className="text-sm font-medium">{detail.response.respondent_job_title}</p>
                      </div>
                    )}
                  </div>
                </div>

                <hr className="my-4" />

                {/* Candidate & Employment Verification */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Candidate & Employment</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Candidate Known?</p>
                      <Badge variant={getBadgeVariant(detail.response.candidate_known)}>
                        {getBadgeLabel(detail.response.candidate_known)}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Dates Confirmed?</p>
                      <Badge variant={getBadgeVariant(detail.response.dates_confirmed)}>
                        {getBadgeLabel(detail.response.dates_confirmed)}
                      </Badge>
                    </div>
                  </div>

                  {detail.response.dates_confirmed && (
                    <div className="mt-4 pt-4 border-t">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div>
                          <p className="text-sm text-gray-600">From Date</p>
                          <p className="text-sm font-medium">
                            {formatDate(detail.response.date_from_confirmed)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600">To Date</p>
                          <p className="text-sm font-medium">
                            {formatDate(detail.response.date_to_confirmed)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {detail.response.job_title_confirmed && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-gray-600">Job Title Confirmed</p>
                      <p className="text-sm font-medium">{detail.response.job_title_confirmed}</p>
                    </div>
                  )}
                </div>

                <hr className="my-4" />

                {/* Employment History */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Employment History</h3>
                  <div className="space-y-4">
                    {detail.response.reason_for_leaving && (
                      <div>
                        <p className="text-sm text-gray-600">Reason for Leaving</p>
                        <p className="text-sm font-medium">{detail.response.reason_for_leaving}</p>
                      </div>
                    )}
                    {detail.response.performance_rating && (
                      <div>
                        <p className="text-sm text-gray-600">Performance Rating</p>
                        <p className="text-sm font-medium capitalize">
                          {detail.response.performance_rating.replace('_', ' ')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Would Re-employ?</p>
                      <Badge variant={getBadgeVariant(detail.response.would_reemploy)}>
                        {getBadgeLabel(detail.response.would_reemploy)}
                      </Badge>
                    </div>
                  </div>
                </div>

                <hr className="my-4" />

                {/* Conduct & Conduct Issues */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Conduct & Behavior</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-2">Any Conduct Issues?</p>
                    <Badge variant={detail.response.conduct_issues ? 'destructive' : 'default'}>
                      {detail.response.conduct_issues ? 'Yes' : 'No'}
                    </Badge>
                  </div>

                  {detail.response.conduct_issues && detail.response.conduct_details && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-sm text-gray-600">Issue Details</p>
                      <p className="text-sm font-medium whitespace-pre-wrap">
                        {detail.response.conduct_details}
                      </p>
                    </div>
                  )}
                </div>

                {detail.response.additional_comments && (
                  <>
                    <hr className="my-4" />
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Additional Comments</h3>
                      <p className="text-sm font-medium whitespace-pre-wrap">
                        {detail.response.additional_comments}
                      </p>
                    </div>
                  </>
                )}

                {/* Discrepancy Section */}
                {detail.response.has_discrepancies && (
                  <>
                    <hr className="my-4" />
                    <div className="rounded-lg bg-red-50 p-4 border border-red-200">
                      <div className="flex items-start gap-3">
                        <Badge variant="destructive">Discrepancies Found</Badge>
                      </div>

                      {detail.response.discrepancy_notes && (
                        <div className="mt-4">
                          <p className="text-sm text-gray-600">Discrepancy Notes</p>
                          <p className="text-sm font-medium whitespace-pre-wrap mt-2">
                            {detail.response.discrepancy_notes}
                          </p>
                        </div>
                      )}

                      {detail.response.flagged_by && (
                        <div className="mt-4 pt-4 border-t border-red-200 text-xs text-gray-600">
                          <p>Flagged by: {detail.response.flagged_by}</p>
                          <p>Flagged at: {formatDateTime(detail.response.flagged_at)}</p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* Submission Info */}
                <hr className="my-4" />
                <div className="text-xs text-gray-500">
                  <p>Submitted: {formatDateTime(detail.response.submitted_at)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Response Message */}
          {!detail.response && detail.status !== 'draft' && detail.status !== 'sent' && detail.status !== 'reminder_sent' && (
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <p className="text-sm text-yellow-900">
                  No response has been received for this reference request.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column - Summary */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Check ID</p>
                <p className="text-sm font-mono font-medium">{detail.check_id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Request ID</p>
                <p className="text-sm font-mono font-medium">{detail.id}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Case ID</p>
                <p className="text-sm font-mono font-medium">{caseId}</p>
              </div>
              <hr />
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide">Current Status</p>
                <div className="mt-2">
                  <StatusBadge status={detail.status} />
                </div>
              </div>
              {detail.response && (
                <>
                  <hr />
                  <div>
                    <p className="text-xs text-gray-600 uppercase tracking-wide mb-2">Response Status</p>
                    {detail.response.has_discrepancies ? (
                      <Badge variant="destructive">Has Discrepancies</Badge>
                    ) : (
                      <Badge variant="default">No Discrepancies</Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
