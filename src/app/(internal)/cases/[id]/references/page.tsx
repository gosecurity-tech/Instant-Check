import { requireInternalUser } from '@/lib/auth/server';
import { listReferencesForCase, getReferenceStats } from '@/lib/services/references';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ReferenceActions } from './ReferenceActions';

export default async function CaseReferencesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: caseId } = await params;
  const user = await requireInternalUser();

  const [references, stats] = await Promise.all([
    listReferencesForCase(caseId),
    getReferenceStats(caseId),
  ]);

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back link */}
        <div className="mb-6">
          <Link
            href={`/dashboard/cases/${caseId}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2"
          >
            <span>←</span>
            <span>Back to case</span>
          </Link>
        </div>

        {/* Page header */}
        <PageHeader
          title="Reference Requests"
          description="Manage and track all reference requests for this case"
        />

        {/* Stats bar */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
          <StatCard label="Total References" value={stats.total} />
          <StatCard label="Sent" value={stats.sent} />
          <StatCard label="Received" value={stats.received} />
          <StatCard label="Verified" value={stats.verified} />
          <StatCard label="Flagged" value={stats.flagged} />
          <StatCard label="Pending" value={stats.pending} />
        </div>

        {/* References list */}
        {references.length === 0 ? (
          <EmptyState
            title="No references yet"
            description="Create reference requests to begin the verification process"
            action={
              <Link href={`/dashboard/cases/${caseId}/references/new`}>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Create Reference
                </button>
              </Link>
            }
          />
        ) : (
          <div className="space-y-4">
            {references.map((reference) => (
              <Card key={reference.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Referee info */}
                    <div className="lg:col-span-1">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Referee</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {reference.referee_name}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Email</p>
                          <p className="text-sm text-gray-700 break-all">
                            {reference.referee_email}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Organisation</p>
                          <p className="text-sm text-gray-700">
                            {reference.organisation_name || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Type</p>
                          <Badge variant="outline" className="mt-1">
                            {reference.reference_type}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Middle: Status and dates */}
                    <div className="lg:col-span-1">
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Status</p>
                          <div className="mt-1">
                            <StatusBadge status={reference.status} />
                          </div>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Sent</p>
                          <p className="text-sm text-gray-700">
                            {formatDate(reference.sent_at)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 font-medium">Received</p>
                          <p className="text-sm text-gray-700">
                            {formatDate(reference.received_at)}
                          </p>
                        </div>
                        {reference.reminder_count > 0 && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium">Reminders</p>
                            <p className="text-sm text-gray-700">{reference.reminder_count}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="lg:col-span-1 flex flex-col justify-between">
                      <div>
                        {reference.status === 'discrepancy_flagged' && (
                          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800 font-medium">
                              Discrepancy flagged
                            </p>
                          </div>
                        )}
                      </div>
                      <div className="space-y-2">
                        <ReferenceActions
                          requestId={reference.id}
                          status={reference.status}
                          organisationId={user.organisationId}
                          caseId={caseId}
                        />
                        <Link href={`./references/${reference.id}`} className="block">
                          <button className="w-full px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                            View Details
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <Card className="bg-white">
      <CardContent className="p-4">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
      </CardContent>
    </Card>
  );
}
