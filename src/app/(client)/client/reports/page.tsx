import { requireClientUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';

export const metadata = {
  title: 'Reports — Instant Check Client Portal',
};

function formatDate(dateString: string | null): string {
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

export default async function ReportsPage() {
  const user = await requireClientUser();
  const supabase = await createClient();

  const { data: reports, error } = await supabase
    .from('reports')
    .select('id, case_id, report_type, status, file_path, generated_by, generated_by_name, created_at, cases(case_reference)')
    .eq('cases.client_id', user.clientId!)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching reports:', error);
  }

  const formattedReports = (reports ?? []).map((report: any) => ({
    id: report.id,
    case_id: report.case_id,
    case_reference: report.cases?.case_reference || '—',
    report_type: report.report_type,
    status: report.status,
    file_path: report.file_path,
    generated_by: report.generated_by,
    generated_by_name: report.generated_by_name,
    created_at: report.created_at,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="View all generated reports" />

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
        </CardHeader>
        <CardContent>
          {formattedReports.length === 0 ? (
            <EmptyState
              title="No Reports"
              description="Reports will appear here once they're generated for your cases."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Case Reference
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Report Type
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-gray-700">
                      Generated
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {formattedReports.map((report) => (
                    <tr
                      key={report.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {report.case_reference}
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatEnumValue(report.report_type)}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={report.status} />
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(report.created_at)}
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
