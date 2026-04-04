'use server';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireInternalUser } from '@/lib/auth/server';
import {
  getAuditLogById,
  getAuditLogsForEntity,
} from '@/lib/services/audit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';

interface AuditDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Format date to UK format: "4 Apr 2026 14:30"
 */
function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format action name: "case.created" -> "Case Created"
 */
function formatActionName(action: string): string {
  return action
    .split('.')
    .map((part) =>
      part
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
    )
    .join(' ');
}

export async function generateMetadata({ params }: AuditDetailPageProps) {
  const { id } = await params;
  return {
    title: `Audit Log ${id.slice(0, 8)} — Instant Check`,
  };
}

export default async function AuditDetailPage({
  params,
}: AuditDetailPageProps) {
  // Ensure user is authenticated as internal
  await requireInternalUser();

  // Get the audit log ID from params
  const { id } = await params;

  // Fetch audit log entry
  const entry = await getAuditLogById(id);
  if (!entry) {
    notFound();
  }

  // Fetch related events for this entity
  const relatedEvents = await getAuditLogsForEntity(
    entry.entity_type,
    entry.entity_id
  );
  const relatedEventsList = relatedEvents.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title={formatActionName(entry.action)}
        backHref="/audit"
      />

      {/* Event Details Card */}
      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Action</h3>
              <p className="mt-1 flex items-center gap-2">
                <StatusBadge status={entry.action} />
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">
                Entity Type
              </h3>
              <p className="mt-1">
                <Badge variant="outline">{entry.entity_type}</Badge>
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Entity ID</h3>
              <p className="mt-1 font-mono text-sm text-gray-700">
                {entry.entity_type === 'case' ? (
                  <Link
                    href={`/cases/${entry.entity_id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {entry.entity_id}
                  </Link>
                ) : entry.entity_type === 'case_check' ? (
                  <Link
                    href={`/cases?checkId=${entry.entity_id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {entry.entity_id}
                  </Link>
                ) : entry.entity_type === 'candidate' ? (
                  <Link
                    href={`/candidates/${entry.entity_id}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {entry.entity_id}
                  </Link>
                ) : (
                  <span>{entry.entity_id}</span>
                )}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Timestamp</h3>
              <p className="mt-1 text-sm text-gray-700">
                {formatDateTime(entry.created_at)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actor Information Card */}
      <Card>
        <CardHeader>
          <CardTitle>Actor Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Email</h3>
              <p className="mt-1 text-sm text-gray-700">{entry.actor_email}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Role</h3>
              <p className="mt-1 text-sm text-gray-700">{entry.actor_role}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">IP Address</h3>
              <p className="mt-1 font-mono text-sm text-gray-700">
                {entry.ip_address || '—'}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">User Agent</h3>
              <p className="mt-1 max-w-md break-words text-xs text-gray-600">
                {entry.user_agent || '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metadata Card */}
      {Object.keys(entry.metadata).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-x-auto rounded-lg bg-gray-50 p-4 text-xs text-gray-700">
              {JSON.stringify(entry.metadata, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Related Events Card */}
      {relatedEventsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Related Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {relatedEventsList.map((event) => (
                <Link
                  key={event.id}
                  href={`/audit/${event.id}`}
                  className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {formatActionName(event.action)}
                      </p>
                      <p className="text-xs text-gray-600">
                        by {event.actor_email}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDateTime(event.created_at)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
