import { Briefcase, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { requireClientUser } from '@/lib/auth/server';
import { getClientDashboardStats } from '@/lib/services/clients';
import { listCases } from '@/lib/services/cases';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

export const metadata = {
  title: 'Dashboard — Instant Check Client Portal',
};

function formatDate(dateString: string): string {
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

export default async function DashboardPage() {
  const user = await requireClientUser();

  const [stats, casesResult] = await Promise.all([
    getClientDashboardStats(user.clientId!),
    listCases({
      page: 1,
      pageSize: 5,
      sortBy: 'created_at',
      sortOrder: 'desc',
      clientId: user.clientId!,
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome back, {user.fullName || user.email}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Total Cases */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cases</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.totalCases}
                </p>
              </div>
              <div className="rounded-lg bg-blue-100 p-3">
                <Briefcase className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* In Progress */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">In Progress</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.inProgress}
                </p>
              </div>
              <div className="rounded-lg bg-amber-100 p-3">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Completed */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">
                  {stats.completed}
                </p>
              </div>
              <div className="rounded-lg bg-green-100 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Cases */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Cases</CardTitle>
        </CardHeader>
        <CardContent>
          {casesResult.data.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No cases yet.{' '}
                <Link href="/client/new-case" className="text-blue-600 hover:underline">
                  Request a new case
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Case Reference
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Candidate
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {casesResult.data.map((caseItem) => (
                    <tr
                      key={caseItem.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/client/cases/${caseItem.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {caseItem.case_reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {caseItem.candidate_name}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={caseItem.status} />
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={caseItem.priority} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(caseItem.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
