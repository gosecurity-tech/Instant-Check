import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { TasksList } from './TasksList';
import type { TaskEntry } from '@/types/domain';
import { InternalRole } from '@/types/enums';

export const metadata = { title: 'Tasks — Instant Check' };

// Skeleton loader for the table
function TasksListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 bg-gray-200 rounded" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}

async function TasksListContainer() {
  const user = await requireInternalUser();

  // Check if user has permission to view all tasks
  const canViewAllTasks =
    user.role === InternalRole.SuperAdmin ||
    user.role === InternalRole.ComplianceManager;

  const supabase = await createClient();

  let query = supabase
    .from('tasks')
    .select('*, cases(case_reference)', { count: 'exact' });

  // Only get user's tasks if not a manager/admin
  if (!canViewAllTasks) {
    query = query.eq('assigned_to', user.id);
  } else {
    // Get all tasks for the organisation
    query = query.eq('organisation_id', user.organisationId);
  }

  // Exclude completed and cancelled tasks
  query = query.not('status', 'in', '(completed,cancelled)');

  // Order by due date, nulls last
  query = query.order('due_date', { ascending: true, nullsFirst: false });

  const { data: tasksData, error } = await query;

  if (error) {
    console.error('Error fetching tasks:', error);
    throw new Error('Failed to load tasks');
  }

  // Transform the data to match TaskEntry type
  const tasks: TaskEntry[] = (tasksData || []).map((task: any) => ({
    id: task.id,
    case_id: task.case_id,
    case_reference: task.cases?.case_reference || '',
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assigned_to: task.assigned_to,
    assigned_to_name: task.assigned_to_name || '',
    due_date: task.due_date,
    completed_at: task.completed_at,
    created_at: task.created_at,
  }));

  return (
    <TasksList tasks={tasks} currentUserId={user.id} canViewAll={canViewAllTasks} />
  );
}

export default function TasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="View and manage your assigned tasks across all cases"
      />

      <Suspense fallback={<TasksListSkeleton />}>
        <TasksListContainer />
      </Suspense>
    </div>
  );
}
