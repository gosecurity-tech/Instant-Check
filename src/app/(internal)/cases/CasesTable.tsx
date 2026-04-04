'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import type { CaseSummary } from '@/types/domain';
import { CaseStatus } from '@/types/enums';

interface CasesTableProps {
  data: CaseSummary[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string;
}

export function CasesTable({
  data,
  page,
  pageSize,
  totalPages,
  totalCount,
  search = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
  status = '',
}: CasesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const columns: ColumnDef<CaseSummary>[] = useMemo(
    () => [
      {
        accessorKey: 'case_reference',
        header: 'Case Reference',
        cell: ({ row }) => (
          <Link
            href={`/cases/${row.original.id}`}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            {row.original.case_reference}
          </Link>
        ),
      },
      {
        accessorKey: 'candidate_name',
        header: 'Candidate Name',
        cell: ({ row }) => <span>{row.original.candidate_name}</span>,
      },
      {
        accessorKey: 'client_name',
        header: 'Client Name',
        cell: ({ row }) => <span>{row.original.client_name}</span>,
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
        header: 'Checks',
        cell: ({ row }) => (
          <span>
            {row.original.completed_check_count}/{row.original.check_count}
          </span>
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => {
          const dateFormatter = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
          return <span>{dateFormatter.format(new Date(row.original.created_at))}</span>;
        },
      },
    ],
    []
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', String(newPage));
      router.push(`/cases?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('search', value);
      } else {
        params.delete('search');
      }
      params.set('page', '1');
      router.push(`/cases?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSortChange = useCallback(
    (columnId: string, order: 'asc' | 'desc') => {
      const params = new URLSearchParams(searchParams);
      params.set('sortBy', columnId);
      params.set('sortOrder', order);
      params.set('page', '1');
      router.push(`/cases?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleStatusChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set('status', value);
      } else {
        params.delete('status');
      }
      params.set('page', '1');
      router.push(`/cases?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleRowClick = useCallback(
    (row: CaseSummary) => {
      router.push(`/cases/${row.id}`);
    },
    [router]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <Select value={status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48" id="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All statuses</SelectItem>
              <SelectItem value={CaseStatus.New}>New</SelectItem>
              <SelectItem value={CaseStatus.AwaitingCandidate}>
                Awaiting Candidate
              </SelectItem>
              <SelectItem value={CaseStatus.InProgress}>In Progress</SelectItem>
              <SelectItem value={CaseStatus.AwaitingThirdParty}>
                Awaiting Third Party
              </SelectItem>
              <SelectItem value={CaseStatus.UnderReview}>Under Review</SelectItem>
              <SelectItem value={CaseStatus.Complete}>Complete</SelectItem>
              <SelectItem value={CaseStatus.OnHold}>On Hold</SelectItem>
              <SelectItem value={CaseStatus.Cancelled}>Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
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
        searchPlaceholder="Search cases by reference..."
        onPageChange={handlePageChange}
        onSearchChange={handleSearchChange}
        onSortChange={handleSortChange}
        onRowClick={handleRowClick}
        emptyMessage="No cases found."
      />
    </div>
  );
}
