import { requireInternalUser } from '@/lib/auth/server';
import { getRtwCheckForCase } from '@/lib/services/rtw';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { RtwActions } from './RtwActions';

function formatCheckMethod(method: string): string {
  const labels: Record<string, string> = {
    manual_document: 'Manual Document Check',
    idvt: 'IDVT (Digital Verification)',
    employer_checking_service: 'Employer Checking Service',
    share_code: 'Share Code Verification',
  };
  return labels[method] ?? method;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function maskShareCode(code: string | null): string {
  if (!code) return 'N/A';
  if (code.length <= 4) return code;
  return `****${code.slice(-4)}`;
}

export default async function CaseRtwPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;
  const user = await requireInternalUser();
  const rtwCheck = await getRtwCheckForCase(caseId);

  if (!rtwCheck) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <PageHeader
          title="Right to Work Check"
          backHref={`/dashboard/cases/${caseId}`}

        />
        <div className="mt-8">
          <EmptyState title="No Right to Work check found for this case." />
        </div>
      </div>
    );
  }

  const isVerified = rtwCheck.verified;
  const isUnderReview = rtwCheck.status === 'under_review';
  const isNotStarted = rtwCheck.status === 'not_started';
  const isDocumentSubmitted = rtwCheck.status === 'document_submitted';
  const isFailed = rtwCheck.status === 'failed';
  const isExpired = rtwCheck.status === 'expired';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <PageHeader
        title="Right to Work Check"
        backHref={`/dashboard/cases/${caseId}`}
      />

      <div className="mt-8 max-w-4xl space-y-6">
        {/* Status Overview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div>
                <p className="mb-2 text-sm font-medium text-gray-600">Current Status</p>
                <StatusBadge status={rtwCheck.status} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-600">Check Method</p>
                <Badge variant="outline">{formatCheckMethod(rtwCheck.check_method)}</Badge>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-600">Verification Status</p>
                {isVerified ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="secondary">Not Verified</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Check Details Card */}
        <Card>
          <CardHeader>
            <CardTitle>Check Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Check Method</p>
                <p className="text-gray-900">{formatCheckMethod(rtwCheck.check_method)}</p>
              </div>

              {rtwCheck.document_type && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Document Type</p>
                  <p className="text-gray-900">{rtwCheck.document_type}</p>
                </div>
              )}

              {rtwCheck.document_reference && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Document Reference</p>
                  <p className="font-mono text-sm text-gray-900">{rtwCheck.document_reference}</p>
                </div>
              )}

              {rtwCheck.share_code && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Share Code</p>
                  <p className="font-mono text-sm text-gray-900">{maskShareCode(rtwCheck.share_code)}</p>
                </div>
              )}

              {rtwCheck.expiry_date && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Expiry Date</p>
                  <p className="text-gray-900">{formatDate(rtwCheck.expiry_date)}</p>
                </div>
              )}

              {rtwCheck.has_time_limit && rtwCheck.time_limit_end && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Time Limit End</p>
                  <p className="text-gray-900">{formatDate(rtwCheck.time_limit_end)}</p>
                </div>
              )}

              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Created</p>
                <p className="text-gray-900">{formatDate(rtwCheck.created_at)}</p>
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-600">Last Updated</p>
                <p className="text-gray-900">{formatDate(rtwCheck.updated_at)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Review Section (if reviewed) */}
        {rtwCheck.reviewed_at && (
          <Card>
            <CardHeader>
              <CardTitle>Review Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-600">Reviewed By</p>
                    <p className="text-gray-900">{rtwCheck.reviewed_by || 'System'}</p>
                  </div>
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-600">Reviewed At</p>
                    <p className="text-gray-900">{formatDate(rtwCheck.reviewed_at)}</p>
                  </div>
                </div>

                {rtwCheck.review_notes && (
                  <div>
                    <p className="mb-2 text-sm font-medium text-gray-600">Review Notes</p>
                    <div className="rounded-md bg-gray-50 p-3 text-gray-900">
                      {rtwCheck.review_notes}
                    </div>
                  </div>
                )}

                <div>
                  <p className="mb-2 text-sm font-medium text-gray-600">Decision</p>
                  {isVerified ? (
                    <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                      Verified
                    </Badge>
                  ) : isFailed ? (
                    <Badge variant="destructive">Failed</Badge>
                  ) : null}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions Section */}
        {(isNotStarted || isDocumentSubmitted || isUnderReview || isVerified) && (
          <RtwActions
            rtwCheckId={rtwCheck.id}
            status={rtwCheck.status}
            organisationId={user.organisationId}
            caseId={caseId}
            checkMethod={rtwCheck.check_method}
          />
        )}
      </div>
    </div>
  );
}
