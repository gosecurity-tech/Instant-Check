'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PriorityBadge } from '@/components/shared/PriorityBadge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import type { TaskEntry } from '@/types/domain';
import { TaskStatus, TaskPriority } from '@/types/enums';

interface TasksListProps {
  tasks: TaskEntry[];
  currentUserId: string;
  canViewAll: boolean;
}

// Helper to format dates
function formatDate(dateString: string | null): string {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// Helper to check if task is overdue
function isOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate || status === TaskStatus.Completed || status === TaskStatus.Cancelled) {
    return false;
  }
  const due = new Date(dueDate);
  return due < new Date();
}

export function TasksList({ tasks, currentUserId, canViewAll }: TasksListProps) {
  const [activeTab, setActiveTab] = useState<'my' | 'all'>('my');

  // Filter tasks based on active tab
  const filteredTasks = useMemo(() => {
    if (activeTab === 'my') {
      return tasks.filter((task) => task.assigned_to === currentUserId);
    }
    return tasks;
  }, [tasks, activeTab, currentUserId]);

  // Define columns
  const columns: ColumnDef<TaskEntry>[] = [
    {
      accessorKey: 'title',
      header: 'Title',
      cell: ({ row }) => (
        <Link
          href={`/cases/${row.original.case_id}`}
          className="font-semibold text-blue-600 hover:text-blue-800 hover:underline"
        >
          {row.original.title}
        </Link>
      ),
    },
    {
      accessorKey: 'case_reference',
      header: 'Case Reference',
      cell: ({ row }) => (
        <Link
          href={`/cases/${row.original.case_id}`}
          className="text-gray-600 hover:text-gray-900 hover:underline"
        >
          {row.original.case_reference}
        </Link>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        // Map task priority to case priority labels for consistency
        const priorityMap: Record<string, string> = {
          [TaskPriority.Low]: 'standard',
          [TaskPriority.Medium]: 'standard',
          [TaskPriority.High]: 'urgent',
          [TaskPriority.Urgent]: 'critical',
        };
        return (
          <PriorityBadge
            priority={priorityMap[row.original.priority] || 'standard'}
          />
        );
      },
    },
    {
      accessorKey: 'due_date',
      header: 'Due Date',
      cell: ({ row }) => {
        const overdue = isOverdue(row.original.due_date, row.original.status);
        const dateStr = formatDate(row.original.due_date);
        return (
          <span className={overdue ? 'text-red-600 font-medium' : ''}>
            {dateStr}
          </span>
        );
      },
    },
    {
      accessorKey: 'assigned_to_name',
      header: 'Assigned To',
      cell: ({ row }) => <span>{row.original.assigned_to_name || '-'}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      {canViewAll && (
        <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'my' | 'all')}>
          <TabsList>
            <TabsTrigger value="my">My Tasks</TabsTrigger>
            <TabsTrigger value="all">All Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="space-y-4">
            <DataTable
              columns={columns}
              data={filteredTasks}
              emptyMessage="No tasks assigned to you."
            />
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <DataTable
              columns={columns}
              data={filteredTasks}
              emptyMessage="No tasks available."
            />
          </TabsContent>
        </Tabs>
      )}

      {!canViewAll && (
        <DataTable
          columns={columns}
          data={filteredTasks}
          emptyMessage="No tasks assigned to you."
        />
      )}
    </div>
  );
}
