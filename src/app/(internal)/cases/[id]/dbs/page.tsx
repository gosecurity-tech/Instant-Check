import { requireInternalUser } from '@/lib/auth/server';
import { getDbsCheckForCase } from '@/lib/services/dbs';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DbsActions } from './DbsActions';

function formatDbsType(type: string): string {
  const labels: Record<string, string> = {
    dbs_basic: 'DBS Basic',
    dbs_standard: 'DBS Standard',
    dbs_enhanced: 'DBS Enhanced',
  };
  return labels[type] ?? type;
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

export default async function CaseDbsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;
  const user = await requireInternalUser();
  const dbsCheck = await getDbsCheckForCase(caseId);

  if (!dbsCheck) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 md:p-8">
        <PageHeader
          title="DBS Check"
          backHref={`/dashboard/cases/${caseId}`}

        />
        <div className="mt-8">
          <EmptyState title="No DBS check found for this case." />
        </div>
      </div>
    );
  }

  const isReceived = ['received', 'clear', 'adverse', 'disputed'].includes(dbsCheck.status);
  const isReviewed = ['clear', 'adverse', 'disputed'].includes(dbsCheck.status);
  const isClear = dbsCheck.status === 'clear';
  const isAdverse = dbsCheck.status === 'adverse';
  const isDisputed = dbsCheck.status === 'disputed';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <PageHeader
        title="DBS Check"
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
                <StatusBadge status={dbsCheck.status} />
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-600">DBS Type</p>
                <Badge variant="outline">{formatDbsType(dbsCheck.dbs_type)}</Badge>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-gray-600">Result</p>
                {isClear ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-700">
                    Clear
                  </Badge>
                ) : isAdverse ? (
                  <Badge variant="default" className="bg-red-600 hover:bg-red-700">
                    Adverse
                  </Badge>
                ) : isDisputed ? (
                  <Badge variant="default" className="bg-amber-600 hover:bg-amber-700">
                    Disputed
                  </Badge>
                ) : (
                  <Badge variant="secondary">Pending</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Application Details Card */}
        {(dbsCheck.application_reference || isReceived) && (
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {dbsCheck.application_reference && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-600">Application Reference</p>
                    <p className="font-mono text-sm text-gray-900">{dbsCheck.application_reference}</p>
                  </div>
                )}

                {isReceived && dbsCheck.certificate_number && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-600">Certificate Number</p>
                    <p className="font-mono text-sm text-gray-900">{dbsCheck.certificate_number}</p>
                  </div>
                )}

                {isReceived && dbsCheck.certificate_date && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-gray-600">Certificate Date</p>
                    <p className="text-gray-900">{formatDate(dbsCheck.certificate_date)}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Review Section */}
        {isReviewed && (
          <Card>
            <CardHeader>
              <CardTitle>Review Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Reviewed By</p>
                  <p className="text-gray-900">{dbsCheck.reviewed_by ?? 'N/A'}</p>
                </div>
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-600">Reviewed At</p>
                  <p className="text-gray-900">
                    {dbsCheck.reviewed_at ? formatDate(dbsCheck.reviewed_at) : 'N/A'}
                  </p>
                </div>
              </div>
              {dbsCheck.review_notes && (
                <div className="mt-4">
                  <p className="mb-2 text-sm font-medium text-gray-600">Review Notes</p>
                  <p className="whitespace-pre-wrap rounded-md bg-gray-50 p-3 text-sm text-gray-900">
                    {dbsCheck.review_notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Adverse Information Section */}
        {dbsCheck.has_adverse && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-900">Adverse Information Found</CardTitle>
            </CardHeader>
            <CardContent>
              {dbsCheck.adverse_details && (
                <div>
                  <p className="mb-2 text-sm font-medium text-red-900">Details</p>
                  <p className="whitespace-pre-wrap rounded-md bg-white p-3 text-sm text-red-900">
                    {dbsCheck.adverse_details}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions Section */}
        <DbsActions
          dbsCheckId={dbsCheck.id}
          status={dbsCheck.status}
          organisationId={dbsCheck.organisation_id}
          caseId={caseId}
        />
      </div>
    </div>
  );
}
