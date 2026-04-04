import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireInternalUser } from '@/lib/auth/server';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/shared/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';
import { UsersTable } from './UsersTable';
import { InternalRole } from '@/types/enums';

export const metadata = { title: 'User Management — Instant Check' };

// Skeleton loader for the table
function UsersTableSkeleton() {
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

async function UsersTableContainer() {
  const user = await requireInternalUser();

  // Check authorization — only super_admin and compliance_manager
  if (
    user.role !== InternalRole.SuperAdmin &&
    user.role !== InternalRole.ComplianceManager
  ) {
    redirect('/');
  }

  const supabase = await createClient();

  // Fetch all user profiles for the organisation
  const { data: usersData, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('organisation_id', user.organisationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users:', error);
    throw new Error('Failed to load users');
  }

  // Transform data to match expected shape
  const users = (usersData || []).map((profile: any) => ({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    user_type: profile.user_type,
    role: profile.role,
    is_active: profile.is_active,
    last_sign_in_at: profile.last_sign_in_at,
    created_at: profile.created_at,
  }));

  return <UsersTable users={users} />;
}

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage internal users and their roles"
        backHref="/settings"
      />

      <Suspense fallback={<UsersTableSkeleton />}>
        <UsersTableContainer />
      </Suspense>
    </div>
  );
}
