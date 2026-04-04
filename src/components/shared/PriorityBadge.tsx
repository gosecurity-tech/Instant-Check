'use client';

import { cn } from '@/lib/utils';

interface PriorityBadgeProps {
  priority: string;
  className?: string;
}

const priorityColorMap: Record<string, string> = {
  standard: 'bg-gray-100 text-gray-800',
  urgent: 'bg-amber-100 text-amber-800',
  critical: 'bg-red-100 text-red-800',
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const colorClass = priorityColorMap[priority] || 'bg-gray-100 text-gray-800';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-sm font-medium',
        colorClass,
        className
      )}
    >
      {priority.charAt(0).toUpperCase() + priority.slice(1)}
    </span>
  );
}
