'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/tables/DataTable';
import { Badge } from '@/components/ui/badge';
import { RoleBadge } from '@/components/shared/RoleBadge';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  user_type: string;
  role?: string;
  is_active: boolean;
  last_sign_in_at: string | null;
  created_at: string;
}

interface UsersTableProps {
  users: UserProfile[];
}

// Helper to format dates
function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// User type color map
const userTypeColorMap: Record<string, { bg: string; text: string }> = {
  internal: { bg: 'bg-blue-100', text: 'text-blue-800' },
  client: { bg: 'bg-green-100', text: 'text-green-800' },
  candidate: { bg: 'bg-amber-100', text: 'text-amber-800' },
};

export function UsersTable({ users }: UsersTableProps) {
  const columns: ColumnDef<UserProfile>[] = [
    {
      accessorKey: 'full_name',
      header: 'Full Name',
      cell: ({ row }) => (
        <span className="font-semibold">{row.original.full_name || '-'}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span>{row.original.email}</span>,
    },
    {
      accessorKey: 'user_type',
      header: 'User Type',
      cell: ({ row }) => {
        const userType = row.original.user_type;
        const colors = userTypeColorMap[userType] || { bg: 'bg-gray-100', text: 'text-gray-800' };
        const label = userType.charAt(0).toUpperCase() + userType.slice(1);

        return (
          <Badge className={`${colors.bg} ${colors.text}`} variant="outline">
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.role;
        return role ? <RoleBadge role={role} /> : <span className="text-gray-500">-</span>;
      },
    },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => {
        const isActive = row.original.is_active;
        return isActive ? (
          <Badge className="bg-green-100 text-green-800" variant="outline">
            Active
          </Badge>
        ) : (
          <Badge className="bg-red-100 text-red-800" variant="outline">
            Inactive
          </Badge>
        );
      },
    },
    {
      accessorKey: 'last_sign_in_at',
      header: 'Last Sign In',
      cell: ({ row }) => <span>{formatDate(row.original.last_sign_in_at)}</span>,
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => <span>{formatDate(row.original.created_at)}</span>,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      emptyMessage="No users found."
    />
  );
}
