'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import type { CaseSummary } from '@/types/domain';
import { CaseStatus } from '@/types/enums';

interface ClientCasesTableProps {
  data: CaseSummary[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
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

export function ClientCasesTable({
  data,
  page,
  pageSize,
  totalPages,
  totalCount,
  search = '',
  status = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
}: ClientCasesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const columns: ColumnDef<CaseSummary>[] = useMemo(
    () => [
      {
        accessorKey: 'case_reference',
        header: 'Case Reference',
        cell: ({ row }) => {
          const caseItem = row.original;
          return (
            <Link
              href={`/client/cases/${caseItem.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              {caseItem.case_reference}
            </Link>
          );
        },
      },
      {
        accessorKey: 'candidate_name',
        header: 'Candidate',
        cell: ({ row }) => row.original.candidate_name || '—',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'priority',
        header: 'Priority',
        cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
      },
      {
        accessorKey: 'check_count',
        header: 'Progress',
        cell: ({ row }) => {
          const total = row.original.check_count;
          const completed = row.original.completed_check_count;
          return (
            <span className="text-sm text-gray-600">
              {completed}/{total}
            </span>
          );
        },
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    []
  );

  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    router.push(`/client/cases?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`/client/cases?${params.toString()}`);
  };

  const handleSortChange = (columnId: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', columnId);
    params.set('sortOrder', order);
    params.set('page', '1');
    router.push(`/client/cases?${params.toString()}`);
  };

  const handleStatusChange = (newStatus: string) => {
    const params = new URLSearchParams(searchParams);
    if (newStatus && newStatus !== 'all') {
      params.set('status', newStatus);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    router.push(`/client/cases?${params.toString()}`);
  };

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex gap-2">
        <select
          value={status || ''}
          onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-700"
        >
          <option value="">All Statuses</option>
          {Object.values(CaseStatus).map((s) => (
            <option key={s} value={s}>
              {formatEnumValue(s)}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={columns}
        data={data}
        page={page}
        pageSize={pageSize}
        totalPages={totalPages}
        totalCount={totalCount}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchPlaceholder="Search by case reference..."
        onSearchChange={handleSearchChange}
        onPageChange={handlePageChange}
        onSortChange={handleSortChange}
        emptyMessage="No cases found."
      />
    </div>
  );
}
