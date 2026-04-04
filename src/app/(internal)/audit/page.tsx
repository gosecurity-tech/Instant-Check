import { Suspense } from 'react';
import { requireInternalUser } from '@/lib/auth/server';
import { listAuditLogs } from '@/lib/services/audit';
import { PageHeader } from '@/components/shared/PageHeader';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { AuditTable } from './AuditTable';

export const metadata = { title: 'Audit Log — Instant Check' };

interface AuditPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    search?: string;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

const ACTION_OPTIONS = [
  'case.created',
  'case.status_changed',
  'case.assigned',
  'case.adjudicated',
  'case.reopened',
  'check.status_changed',
  'check.reviewed',
  'candidate.invited',
  'candidate.submitted',
  'reference.requested',
  'reference.response_received',
  'rtw.created',
  'rtw.reviewed',
  'dbs.created',
  'dbs.reviewed',
  'user_created',
  'user.login',
  'document.uploaded',
  'report.generated',
];

const ENTITY_TYPE_OPTIONS = [
  'case',
  'case_check',
  'candidate',
  'document',
  'reference_request',
  'reference_response',
  'internal_user',
  'client_user',
  'client',
  'report',
  'right_to_work_check',
  'dbs_check',
  'system',
];

export default async function AuditPage({ searchParams }: AuditPageProps) {
  await requireInternalUser();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const pageSize = parseInt(params.pageSize || '25', 10);
  const search = params.search || undefined;
  const action = params.action || undefined;
  const entityType = params.entityType || undefined;
  const dateFrom = params.dateFrom || undefined;
  const dateTo = params.dateTo || undefined;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = (params.sortOrder || 'desc') as 'asc' | 'desc';

  const result = await listAuditLogs({
    page,
    pageSize,
    search,
    action,
    entityType,
    dateFrom,
    dateTo,
    sortBy: sortBy as any,
    sortOrder,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Log"
        description="Immutable record of all system actions for BS7858 compliance"
      />

      <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="action-filter" className="text-sm font-medium text-gray-700">
              Action
            </label>
            <Select value={action || ''}>
              <SelectTrigger id="action-filter">
                <SelectValue placeholder="All actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All actions</SelectItem>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="entity-filter" className="text-sm font-medium text-gray-700">
              Entity Type
            </label>
            <Select value={entityType || ''}>
              <SelectTrigger id="entity-filter">
                <SelectValue placeholder="All entity types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All entity types</SelectItem>
                {ENTITY_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt} value={opt}>
                    {opt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="date-from" className="text-sm font-medium text-gray-700">
              From Date
            </label>
            <input
              id="date-from"
              type="date"
              defaultValue={dateFrom || ''}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="date-to" className="text-sm font-medium text-gray-700">
              To Date
            </label>
            <input
              id="date-to"
              type="date"
              defaultValue={dateTo || ''}
              className="rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="text-gray-500">Loading audit logs...</div>}>
        <AuditTable
          data={result.data}
          page={result.page}
          pageSize={result.pageSize}
          totalPages={result.totalPages}
          totalCount={result.totalCount}
          search={search}
          action={action}
          entityType={entityType}
          dateFrom={dateFrom}
          dateTo={dateTo}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      </Suspense>
    </div>
  );
}
