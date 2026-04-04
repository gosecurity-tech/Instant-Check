'use client';

import React, { useMemo, useCallback, useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
} from 'lucide-react';

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  // Pagination
  page?: number;
  pageSize?: number;
  totalPages?: number;
  totalCount?: number;
  onPageChange?: (page: number) => void;
  // Sorting
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (columnId: string, order: 'asc' | 'desc') => void;
  // Search
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  // Row interaction
  onRowClick?: (row: TData) => void;
  // State
  loading?: boolean;
  emptyMessage?: string;
}

export function DataTable<TData>({
  columns,
  data,
  page = 1,
  pageSize = 10,
  totalPages = 1,
  totalCount = 0,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  searchPlaceholder = 'Search...',
  onSearchChange,
  onRowClick,
  loading = false,
  emptyMessage = 'No data available.',
}: DataTableProps<TData>) {
  const [searchValue, setSearchValue] = useState('');

  const debouncedSearch = useCallback(
    (() => {
      let timeout: NodeJS.Timeout;
      return (value: string) => {
        setSearchValue(value);
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          onSearchChange?.(value);
        }, 300);
      };
    })(),
    [onSearchChange]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
  });

  const rows = table.getRowModel().rows;

  // Generate skeleton rows while loading
  const displayRows = useMemo(() => {
    if (loading) {
      return Array.from({ length: Math.min(5, pageSize) });
    }
    return rows;
  }, [loading, rows, pageSize]);

  // Handle column header click for sorting
  const handleColumnHeaderClick = useCallback(
    (columnId: string) => {
      if (!onSortChange) return;

      let newOrder: 'asc' | 'desc' = 'asc';
      if (sortBy === columnId) {
        newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
      }
      onSortChange(columnId, newOrder);
    },
    [sortBy, sortOrder, onSortChange]
  );

  // Determine sort icon for a column
  const getSortIcon = (columnId: string) => {
    if (!onSortChange) return null;
    if (sortBy !== columnId) {
      return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="w-4 h-4 text-gray-700" />
    ) : (
      <ArrowDown className="w-4 h-4 text-gray-700" />
    );
  };

  // Pagination helpers
  const canGoToPrevious = page > 1;
  const canGoToNext = page < (totalPages || 1);
  const displayStart = (page - 1) * pageSize + 1;
  const displayEnd = Math.min(page * pageSize, totalCount || 0);

  return (
    <div className="w-full space-y-4">
      {/* Search Bar */}
      {onSearchChange && (
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => debouncedSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      )}

      {/* Table */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const isSortable =
                    onSortChange && header.column.getCanSort();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-6 py-3 text-left text-sm font-medium text-gray-500',
                        isSortable && 'cursor-pointer hover:bg-gray-100'
                      )}
                      onClick={() => {
                        if (isSortable) {
                          handleColumnHeaderClick(header.column.id);
                        }
                      }}
                    >
                      <div className="flex items-center gap-2">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {isSortable && getSortIcon(header.column.id)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              // Skeleton Rows
              displayRows.map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {columns.map((_, colIndex) => (
                    <td key={colIndex} className="px-6 py-4">
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))
            ) : rows.length === 0 ? (
              // Empty State
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-12 text-center text-sm text-gray-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              // Data Rows
              rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'hover:bg-gray-50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={() => {
                    if (onRowClick) {
                      onRowClick(row.original);
                    }
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-6 py-4 text-sm text-gray-900"
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {onPageChange && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-gray-600">
            {totalCount > 0 ? (
              <>
                Showing <span className="font-medium">{displayStart}</span> to{' '}
                <span className="font-medium">{displayEnd}</span> of{' '}
                <span className="font-medium">{totalCount}</span> results
              </>
            ) : (
              'No results'
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(1)}
              disabled={!canGoToPrevious}
              aria-label="Go to first page"
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page - 1)}
              disabled={!canGoToPrevious}
              aria-label="Go to previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="text-sm text-gray-600 px-2">
              Page <span className="font-medium">{page}</span> of{' '}
              <span className="font-medium">{totalPages || 1}</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(page + 1)}
              disabled={!canGoToNext}
              aria-label="Go to next page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onPageChange(totalPages || 1)}
              disabled={!canGoToNext}
              aria-label="Go to last page"
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
