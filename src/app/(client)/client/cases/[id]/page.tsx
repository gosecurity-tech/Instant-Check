import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { requireClientUser } from '@/lib/auth/server';
import { getCaseById } from '@/lib/services/cases';

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function formatEnumValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const caseData = await getCaseById(resolvedParams.id);

  if (!caseData) {
    return { title: 'Case Not Found' };
  }

  return {
    title: `${caseData.case_reference} — Instant Check Client Portal`,
  };
}

interface CaseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function CaseDetailPage({ params }: CaseDetailPageProps) {
  const user = await requireClientUser();
  const resolvedParams = await params;

  const caseData = await getCaseById(resolvedParams.id);

  if (!caseData) {
    notFound();
  }

  // RLS: Ensure user's client owns this case
  if (caseData.client_id !== user.clientId) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={caseData.case_reference}
        description={caseData.candidate_name}
        backHref="/client/cases"
      />

      {/* Case Status */}
      <Card>
        <CardHeader>
          <CardTitle>Case Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div>
              <p className="text-sm font-medium text-gray-600">Status</p>
              <div className="mt-2">
                <StatusBadge status={caseData.status} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Priority</p>
              <div className="mt-2">
                <PriorityBadge priority={caseData.priority} />
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">Outcome</p>
              <p className="mt-2 text-gray-900">
                {caseData.outcome ? formatEnumValue(caseData.outcome) : '—'}
              </p>
            </div>
          </div>
          {caseData.sla_deadline && (
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-600">SLA Deadline</p>
              <p className="mt-1 text-gray-900">
                {formatDate(caseData.sla_deadline)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Candidate */}
      <Card>
        <CardHeader>
          <CardTitle>Candidate</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium text-gray-600">Name</p>
            <p className="mt-1 text-gray-900">{caseData.candidate_name}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Email</p>
            <p className="mt-1 text-gray-900">{caseData.candidate_email}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-600">Submission Status</p>
            <div className="mt-1">
              {caseData.candidate.has_submitted ? (
                <>
                  <Badge className="bg-green-100 text-green-800">Submitted</Badge>
                  <p className="mt-1 text-sm text-gray-600">
                    {formatDate(caseData.candidate.submitted_at)}
                  </p>
                </>
              ) : (
                <Badge className="bg-amber-100 text-amber-800">Pending</Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Checks Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Checks Overview</CardTitle>
        </CardHeader>
        <CardContent>
          {caseData.checks.length === 0 ? (
            <p className="text-gray-500">No checks assigned.</p>
          ) : (
            <div className="space-y-3">
              {caseData.checks.map((check) => (
                <div
                  key={check.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 p-3"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {formatEnumValue(check.check_type)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Required: {check.is_required ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={check.status} />
                    {check.outcome && (
                      <Badge variant="outline">
                        {formatEnumValue(check.outcome)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Timeline */}
      {caseData.status_history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {caseData.status_history.map((entry) => (
                <div
                  key={entry.id}
                  className="flex gap-3 border-l-2 border-gray-300 pl-4 pb-3"
                >
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">
                      {formatEnumValue(entry.old_status)} → {formatEnumValue(entry.new_status)}
                    </p>
                    {entry.notes && (
                      <p className="mt-1 text-sm text-gray-600">{entry.notes}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      {formatDate(entry.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
