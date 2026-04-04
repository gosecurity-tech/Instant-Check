import Link from 'next/link';
import { Download, FileText } from 'lucide-react';
import { requireInternalUser } from '@/lib/auth/server';
import { listReports } from '@/lib/services/reports';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

export const metadata = { title: 'Reports — Instant Check' };

interface ReportsPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    status?: string;
    reportType?: string;
  }>;
}

const STATUS_OPTIONS = ['generating', 'ready', 'failed', 'archived'];

const REPORT_TYPE_OPTIONS = [
  { value: 'final_screening', label: 'Final Screening' },
  { value: 'interim', label: 'Interim Report' },
  { value: 'compliance_summary', label: 'Compliance Summary' },
];

/**
 * Format file size to human-readable format (KB, MB)
 */
function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Format date to UK format: "4 Apr 2026"
 */
function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  await requireInternalUser();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '25', 10);
  const search = params.search || undefined;
  const status = params.status || undefined;
  const reportType = params.reportType || undefined;

  const result = await listReports({
    page,
    pageSize,
    search,
    status,
    reportType,
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Reports"
        description="Generated vetting reports and compliance summaries"
      />

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 uppercase">
            Status
          </label>
          <Select defaultValue={status || ''}>
            <SelectTrigger className="mt-2 w-full sm:w-48">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Statuses</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-600 uppercase">
            Report Type
          </label>
          <Select defaultValue={reportType || ''}>
            <SelectTrigger className="mt-2 w-full sm:w-48">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              {REPORT_TYPE_OPTIONS.map((rt) => (
                <SelectItem key={rt.value} value={rt.value}>
                  {rt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Reports Table */}
      {result.data.length === 0 ? (
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title="No reports found"
          description="Reports are generated from case review pages when cases are ready for final screening."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Case Reference
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Report Type
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Status
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Generated
                </th>
                <th className="px-6 py-3 text-left font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {result.data.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-900">
                    <Link
                      href={`/reports/${report.id}`}
                      className="font-medium text-blue-600 hover:text-blue-900"
                    >
                      {report.case_reference}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {report.candidate_name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {REPORT_TYPE_OPTIONS.find((rt) => rt.value === report.report_type)
                      ?.label || report.report_type}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={report.status} />
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {formatDate(report.generated_at)}
                  </td>
                  <td className="px-6 py-4">
                    {report.status === 'ready' && (
                      <Link href={`/api/reports/${report.id}/download`}>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      </Link>
                    )}
                    {report.status !== 'ready' && (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-4">
          <div className="text-sm text-gray-600">
            Page {result.page} of {result.totalPages} (
            {result.totalCount} total)
          </div>
          <div className="flex gap-2">
            {result.page > 1 && (
              <Link
                href={`/reports?page=${result.page - 1}&pageSize=${result.pageSize}${
                  status ? `&status=${status}` : ''
                }${reportType ? `&reportType=${reportType}` : ''}`}
              >
                <Button variant="outline" size="sm">
                  Previous
                </Button>
              </Link>
            )}
            {result.page < result.totalPages && (
              <Link
                href={`/reports?page=${result.page + 1}&pageSize=${result.pageSize}${
                  status ? `&status=${status}` : ''
                }${reportType ? `&reportType=${reportType}` : ''}`}
              >
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
