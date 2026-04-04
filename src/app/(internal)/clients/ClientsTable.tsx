'use client';

import { useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import type { ClientSummary } from '@/types/domain';

interface ClientsTableProps {
  data: ClientSummary[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ClientsTable({
  data,
  page,
  pageSize,
  totalPages,
  totalCount,
  search = '',
  sortBy = 'created_at',
  sortOrder = 'desc',
}: ClientsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = useCallback(
    (newPage: number) => {
      const params = new URLSearchParams(searchParams);
      params.set('page', newPage.toString());
      router.push(`/clients?${params.toString()}`);
    },
    [router, searchParams]
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
      router.push(`/clients?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleSortChange = useCallback(
    (columnId: string, order: 'asc' | 'desc') => {
      const params = new URLSearchParams(searchParams);
      params.set('sortBy', columnId);
      params.set('sortOrder', order);
      params.set('page', '1');
      router.push(`/clients?${params.toString()}`);
    },
    [router, searchParams]
  );

  const handleRowClick = useCallback(
    (row: ClientSummary) => {
      router.push(`/clients/${row.id}`);
    },
    [router]
  );

  const columns: ColumnDef<ClientSummary, unknown>[] = [
    {
      accessorKey: 'company_name',
      header: 'Company Name',
      cell: ({ row }) => (
        <Link
          href={`/clients/${row.original.id}`}
          className="font-semibold text-blue-600 hover:underline"
        >
          {row.getValue('company_name')}
        </Link>
      ),
    },
    {
      accessorKey: 'contact_name',
      header: 'Contact Name',
      cell: ({ row }) => row.getValue('contact_name'),
    },
    {
      accessorKey: 'contact_email',
      header: 'Contact Email',
      cell: ({ row }) => row.getValue('contact_email'),
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.getValue('is_active') as boolean;
        return (
          <Badge variant={isActive ? 'default' : 'destructive'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'total_cases',
      header: 'Total Cases',
      cell: ({ row }) => row.getValue('total_cases'),
    },
    {
      accessorKey: 'active_cases',
      header: 'Active Cases',
      cell: ({ row }) => row.getValue('active_cases'),
    },
    {
      accessorKey: 'user_count',
      header: 'Users',
      cell: ({ row }) => row.getValue('user_count'),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => formatDate(row.getValue('created_at') as string),
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={data}
      page={page}
      pageSize={pageSize}
      totalPages={totalPages}
      totalCount={totalCount}
      onPageChange={handlePageChange}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={handleSortChange}
      searchPlaceholder="Search by company, contact name, or email..."
      onSearchChange={handleSearchChange}
      onRowClick={handleRowClick}
      emptyMessage="No clients found."
    />
  );
}
