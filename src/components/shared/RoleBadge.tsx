'use client';

import { cn } from '@/lib/utils';

interface RoleBadgeProps {
  role: string;
  className?: string;
}

const roleColorMap: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  compliance_manager: 'bg-blue-100 text-blue-800',
  qa_reviewer: 'bg-amber-100 text-amber-800',
  case_handler: 'bg-green-100 text-green-800',
  client_user: 'bg-gray-100 text-gray-800',
  candidate: 'bg-cyan-100 text-cyan-800',
};

function formatRole(role: string): string {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const colorClass = roleColorMap[role] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
        colorClass,
        className
      )}
    >
      {formatRole(role)}
    </span>
  );
}
