import Link from 'next/link';
import { requireInternalUser } from '@/lib/auth/server';
import { getCaseDashboardStats, listCases } from '@/lib/services/cases';
import { createClient } from '@/lib/supabase/server';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { AuditEntry } from '@/components/shared/AuditEntry';
import { SLAWidget } from './SLAWidget';
import {
  Briefcase,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Users,
  FileText,
} from 'lucide-react';
import type { AuditLogEntry } from '@/types/domain';

export const metadata = { title: 'Dashboard — Instant Check' };

// Helper function to format relative time
function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
  });
}

export default async function DashboardPage() {
  // Require internal user authentication
  await requireInternalUser();

  // Fetch dashboard statistics
  const stats = await getCaseDashboardStats();

  // Fetch 5 most recent cases
  const casesResult = await listCases({
    page: 1,
    pageSize: 5,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Query Supabase for additional metrics
  const supabase = await createClient();

  // Fetch recent audit log entries (5 most recent)
  const { data: auditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  const auditEntries: AuditLogEntry[] = (auditLogs ?? []).map((log: any) => ({
    id: log.id,
    actor_id: log.actor_id,
    actor_email: log.actor_email,
    action: log.action,
    entity_type: log.entity_type,
    entity_id: log.entity_id,
    organisation_id: log.organisation_id,
    metadata: log.metadata ?? {},
    created_at: log.created_at,
  }));

  // Count overdue tasks (due_date < now and status not 'completed'/'cancelled')
  const now = new Date().toISOString();
  const { count: overdueCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .lt('due_date', now)
    .not('status', 'in', '(completed,cancelled)');

  // Count pending reference requests (status = 'sent' or 'reminder_sent')
  const { count: pendingRefCount } = await supabase
    .from('reference_requests')
    .select('id', { count: 'exact', head: true })
    .in('status', ['sent', 'reminder_sent']);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Overview of ongoing cases and recent activity
        </p>
      </div>

      {/* Statistics Grid - 6 stat cards in 2x3 on desktop, 1 col on mobile */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Active Cases */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCases}</div>
            <p className="text-xs text-gray-600">Excluding completed and cancelled</p>
          </CardContent>
        </Card>

        {/* Awaiting Candidate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Awaiting Candidate
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {stats.awaitingCandidate}
            </div>
            <p className="text-xs text-gray-600">Waiting for candidate action</p>
          </CardContent>
        </Card>

        {/* Under Review */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Under Review</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.underReview}
            </div>
            <p className="text-xs text-gray-600">In review stage</p>
          </CardContent>
        </Card>

        {/* Completed This Month */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Completed This Month
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.completedThisMonth}
            </div>
            <p className="text-xs text-gray-600">Completed in current month</p>
          </CardContent>
        </Card>

        {/* Overdue Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue Tasks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {overdueCount ?? 0}
            </div>
            <p className="text-xs text-gray-600">Tasks past due date</p>
          </CardContent>
        </Card>

        {/* Pending References */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending References
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {pendingRefCount ?? 0}
            </div>
            <p className="text-xs text-gray-600">Awaiting referee responses</p>
          </CardContent>
        </Card>
      </div>

      {/* SLA Widget Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">SLA Performance</h2>
        <SLAWidget />
      </div>

      {/* Main Content Area - 2 column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Cases Table - Left column (2/3) */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left font-medium text-gray-600 py-3 px-4">
                      Case Reference
                    </th>
                    <th className="text-left font-medium text-gray-600 py-3 px-4">
                      Candidate
                    </th>
                    <th className="text-left font-medium text-gray-600 py-3 px-4">
                      Client
                    </th>
                    <th className="text-left font-medium text-gray-600 py-3 px-4">
                      Status
                    </th>
                    <th className="text-left font-medium text-gray-600 py-3 px-4">
                      Priority
                    </th>
                    <th className="text-left font-medium text-gray-600 py-3 px-4">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {casesResult.data.length > 0 ? (
                    casesResult.data.map((caseItem) => (
                      <tr key={caseItem.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">
                          <Link
                            href={`/cases/${caseItem.id}`}
                            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                          >
                            {caseItem.case_reference}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {caseItem.candidate_name}
                        </td>
                        <td className="py-3 px-4 text-gray-700">
                          {caseItem.client_name}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={caseItem.status} />
                        </td>
                        <td className="py-3 px-4">
                          <PriorityBadge priority={caseItem.priority} />
                        </td>
                        <td className="py-3 px-4 text-gray-600">
                          {formatRelativeTime(caseItem.created_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 px-4 text-center text-gray-500">
                        No cases found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Activity Feed - Right column (1/3) */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {auditEntries.length > 0 ? (
                auditEntries.map((entry) => (
                  <AuditEntry
                    key={entry.id}
                    action={entry.action}
                    entityType={entry.entity_type}
                    entityId={entry.entity_id}
                    actorEmail={entry.actor_email ?? undefined}
                    metadata={entry.metadata}
                    createdAt={entry.created_at}
                    className="border-l-2 border-blue-200 pl-3 py-2"
                  />
                ))
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
