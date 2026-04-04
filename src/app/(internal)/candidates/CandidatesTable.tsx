'use client';

import { useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { CandidateSummary } from '@/types/domain';

interface CandidatesTableProps {
  data: CandidateSummary[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Format a date in en-GB locale
 */
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

/**
 * Format enum values: replace underscore with space and title case
 */
function formatEnumValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function CandidatesTable({
  data,
  page,
  pageSize,
  totalPages,
  totalCount,
  search = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
}: CandidatesTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Define columns
  const columns: ColumnDef<CandidateSummary>[] = useMemo(
    () => [
      {
        accessorKey: 'first_name',
        header: 'Name',
        cell: ({ row }) => {
          const candidate = row.original;
          const fullName = `${candidate.first_name} ${candidate.last_name}`;
          return (
            <Link
              href={`/candidates/${candidate.id}`}
              className="text-blue-600 hover:underline font-medium"
            >
              {fullName}
            </Link>
          );
        },
      },
      {
        accessorKey: 'email',
        header: 'Email',
        cell: ({ row }) => row.original.email,
      },
      {
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => row.original.phone || '—',
      },
      {
        accessorKey: 'has_submitted',
        header: 'Status',
        cell: ({ row }) => {
          const status = row.original.has_submitted ? 'Submitted' : 'Pending';
          const variant = row.original.has_submitted ? 'complete' : 'awaiting_candidate';
          return <StatusBadge status={variant} />;
        },
      },
      {
        accessorKey: 'submitted_at',
        header: 'Submitted',
        cell: ({ row }) => formatDate(row.original.submitted_at),
      },
      {
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
    ],
    []
  );

  // Handle search change
  const handleSearchChange = (value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page on search
    router.push(`?${params.toString()}`);
  };

  // Handle page change
  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    router.push(`?${params.toString()}`);
  };

  // Handle sort change
  const handleSortChange = (columnId: string, order: 'asc' | 'desc') => {
    const params = new URLSearchParams(searchParams);
    params.set('sortBy', columnId);
    params.set('sortOrder', order);
    params.set('page', '1');
    router.push(`?${params.toString()}`);
  };

  return (
    <DataTable
      columns={columns}
      data={data}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      totalCount={totalCount}
      sortBy={sortBy}
      sortOrder={sortOrder}
      searchPlaceholder="Search by name, email..."
      onSearchChange={handleSearchChange}
      onPageChange={handlePageChange}
      onSortChange={handleSortChange}
      onRowClick={(candidate) => {
        router.push(`/candidates/${candidate.id}`);
      }}
      emptyMessage="No candidates found."
    />
  );
}
