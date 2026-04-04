'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useCallback } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import type { AuditLogEntry } from '@/lib/services/audit';

interface AuditTableProps {
  data: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function AuditTable({
  data,
  page,
  pageSize,
  totalPages,
  totalCount,
  search = '',
  action = '',
  entityType = '',
  dateFrom = '',
  dateTo = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
}: AuditTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const columns: ColumnDef<AuditLogEntry>[] = useMemo(
    () => [
      {
        accessorKey: 'created_at',
        header: 'Timestamp',
        cell: ({ row }) => {
          const dateFormatter = new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          return <span>{dateFormatter.format(new Date(row.original.created_at))}</span>;
        },
      },
      {
        accessorKey: 'actor_email',
        header: 'Actor',
        cell: ({ row }) => <span className="font-medium">{row.original.actor_email}</span>,
      },
      {
        accessorKey: 'action',
        header: 'Action',
        cell: ({ row }) => <StatusBadge status={row.original.action} />,
      },
      {
        accessorKey: 'entity_type',
        header: 'Entity Type',
        cell: ({ row }) => (
          <span className="text-sm text-gray-600">{row.original.entity_type}</span>
        ),
      },
      {
        accessorKey: 'entity_id',
        header: 'Entity ID',
        cell: ({ row }) => {
          const id = row.original.entity_id;
          const truncated = id.length > 8 ? `${id.substring(0, 8)}...` : id;
          return (
            <span className="font-mono text-xs text-gray-500" title={id}>
              {truncated}
            </span>
          );
        },
      },
      {
        accessorKey: 'ip_address',
        header: 'IP Address',
        cell: ({ row }) => (
          <span className="text-sm text-gray-500">
            {row.original.ip_address || '—'}
          </span>
        ),
      },
    ],
    []
  );

  const updateSearchParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams);

      Object.entries(updates).forEach(([key, value]) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      });

      params.set('page', '1');
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', String(newPage));
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      updateSearchParams({ search: value || undefined });
    },
    [updateSearchParams]
  );

  const handleSortChange = useCallback(
    (columnId: string, order: 'asc' | 'desc') => {
      const params = new URLSearchParams(searchParams);
      params.set('sortBy', columnId);
      params.set('sortOrder', order);
      params.set('page', '1');
      router.push(`/audit?${params.toString()}`);
    },
    [searchParams, router]
  );

  const handleRowClick = useCallback(
    (row: AuditLogEntry) => {
      router.push(`/audit/${row.id}`);
    },
    [router]
  );

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
      searchPlaceholder="Search by actor, entity ID, or action..."
      onPageChange={handlePageChange}
      onSearchChange={handleSearchChange}
      onSortChange={handleSortChange}
      onRowClick={handleRowClick}
      emptyMessage="No audit logs found."
    />
  );
}
