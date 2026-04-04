import { requireInternalUser } from '@/lib/auth/server';
import { getAuditStats } from '@/lib/services/audit';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/PageHeader';

/**
 * Format action name for display
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

/**
 * Find the maximum count in an array for scaling bar widths
 */
function getMaxCount(
  items: Array<{ count: number }>
): number {
  return Math.max(0, ...items.map((item) => item.count));
}

/**
 * Calculate bar width percentage based on max count
 */
function getBarWidth(count: number, max: number): number {
  if (max === 0) return 0;
  return (count / max) * 100;
}

/**
 * Format date: "2026-04-04" -> "4 Apr"
 */
function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

export const metadata = {
  title: 'Audit Dashboard — Instant Check',
};

export default async function AuditDashboardPage() {
  // Ensure user is authenticated as internal
  await requireInternalUser();

  // Fetch audit statistics
  const stats = await getAuditStats();

  const maxActionCount = getMaxCount(stats.eventsByAction);
  const maxEntityCount = getMaxCount(stats.eventsByEntityType);
  const maxDayCount = getMaxCount(stats.eventsByDay);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Audit Dashboard"
        description="System activity analytics"
        backHref="/audit"
      />

      {/* Stats Cards Row */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Events</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.totalEvents.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Actions Today
              </p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.eventsByDay[stats.eventsByDay.length - 1]?.count || 0}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Unique Actors</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {stats.topActors.length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events by Action Card */}
      <Card>
        <CardHeader>
          <CardTitle>Events by Action</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.eventsByAction.map((item) => (
              <div key={item.action}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {formatActionName(item.action)}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{
                      width: `${getBarWidth(item.count, maxActionCount)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Events by Entity Type Card */}
      <Card>
        <CardHeader>
          <CardTitle>Events by Entity Type</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.eventsByEntityType.map((item) => (
              <div key={item.entity_type}>
                <div className="flex items-center justify-between gap-4 mb-1">
                  <span className="text-sm font-medium text-gray-700 flex-1 truncate">
                    {item.entity_type
                      .split('_')
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(' ')}
                  </span>
                  <span className="text-sm font-semibold text-gray-900 whitespace-nowrap">
                    {item.count}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                  <div
                    className="h-full bg-indigo-500 transition-all"
                    style={{
                      width: `${getBarWidth(item.count, maxEntityCount)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Activity Over Time Card */}
      {stats.eventsByDay.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Activity Over Time (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.eventsByDay.map((item) => (
                <div key={item.date}>
                  <div className="flex items-center justify-between gap-4 mb-1">
                    <span className="text-sm font-medium text-gray-700">
                      {formatDateShort(item.date)}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">
                      {item.count}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                    <div
                      className="h-full bg-green-500 transition-all"
                      style={{
                        width: `${getBarWidth(item.count, maxDayCount)}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Actors Card */}
      {stats.topActors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Actors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-medium text-gray-700">
                      Email
                    </th>
                    <th className="text-right py-2 px-4 font-medium text-gray-700">
                      Events
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topActors.map((item) => (
                    <tr
                      key={item.actor_email}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-4 text-gray-700">
                        {item.actor_email}
                      </td>
                      <td className="py-2 px-4 text-right font-semibold text-gray-900">
                        {item.count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
