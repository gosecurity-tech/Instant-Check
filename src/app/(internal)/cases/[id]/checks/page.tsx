import { notFound } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { getCaseById } from '@/lib/services/cases';
import { listChecksForCase } from '@/lib/services/checks';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface CaseChecksPageProps {
  params: Promise<{ id: string }>;
}

function formatCheckType(checkType: string): string {
  return checkType
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set';
  try {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

export const metadata = { title: 'Case Checks — Instant Check' };

export default async function CaseChecksPage({
  params,
}: CaseChecksPageProps) {
  await requireInternalUser();

  const { id } = await params;

  // Fetch case details
  const caseDetail = await getCaseById(id);
  if (!caseDetail) {
    notFound();
  }

  // Fetch checks for this case
  const checks = await listChecksForCase(id);

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Checks — ${caseDetail.case_reference}`}
        description={`${caseDetail.candidate_name} • ${caseDetail.client_name}`}
        backHref={`/cases/${id}`}
      />

      {checks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-gray-500">
              No checks have been created for this case yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {checks.map((check) => (
            <Card key={check.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base">
                    {formatCheckType(check.check_type)}
                  </CardTitle>
                  {check.is_required && (
                    <Badge variant="outline" className="whitespace-nowrap">
                      Required
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {/* Status and Outcome */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-gray-700">
                      Status
                    </span>
                    <StatusBadge status={check.status} />
                  </div>

                  {check.outcome && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-gray-700">
                        Outcome
                      </span>
                      <StatusBadge status={check.outcome} />
                    </div>
                  )}
                </div>

                {/* Assignment */}
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    Assigned To
                  </p>
                  <p className="mt-1 text-sm text-gray-900">
                    {check.assigned_to_name || 'Unassigned'}
                  </p>
                </div>

                {/* Dates */}
                <div className="space-y-2 border-t border-gray-200 pt-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Started
                    </p>
                    <p className="mt-0.5 text-sm text-gray-900">
                      {formatDate(check.started_at)}
                    </p>
                  </div>

                  {check.completed_at && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Completed
                      </p>
                      <p className="mt-0.5 text-sm text-gray-900">
                        {formatDate(check.completed_at)}
                      </p>
                    </div>
                  )}

                  {check.reviewed_at && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Reviewed
                      </p>
                      <p className="mt-0.5 text-sm text-gray-900">
                        {formatDate(check.reviewed_at)}
                        {check.reviewed_by_name &&
                          ` by ${check.reviewed_by_name}`}
                      </p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {check.notes && (
                  <div className="border-t border-gray-200 pt-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Notes
                    </p>
                    <p className="mt-1 text-sm text-gray-700">
                      {check.notes}
                    </p>
                  </div>
                )}

                {/* Metadata */}
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-500">
                    ID: {check.id}
                  </p>
                  <p className="text-xs text-gray-500">
                    Created {formatDate(check.created_at)}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
