import { cn } from '@/lib/utils';
import type { CaseStatus, CheckStatus, CaseOutcome, CheckOutcome } from '@/types/enums';

type BadgeStatus = CaseStatus | CheckStatus | CaseOutcome | CheckOutcome | string;

/**
 * Colour map keyed by raw enum string values.
 * Using plain strings avoids duplicate computed-property errors
 * when CaseStatus and CheckStatus share values like 'in_progress'.
 */
const STATUS_COLORS: Record<string, string> = {
  // Case statuses
  new: 'bg-blue-100 text-blue-700',
  awaiting_candidate: 'bg-amber-100 text-amber-700',
  in_progress: 'bg-indigo-100 text-indigo-700',
  awaiting_third_party: 'bg-purple-100 text-purple-700',
  under_review: 'bg-orange-100 text-orange-700',
  complete: 'bg-green-200 text-green-800',
  on_hold: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-700',

  // Case outcomes
  clear: 'bg-green-100 text-green-700',
  clear_with_advisory: 'bg-yellow-100 text-yellow-700',
  insufficient_evidence: 'bg-yellow-100 text-yellow-700',
  adverse_information: 'bg-red-100 text-red-700',
  failed: 'bg-red-200 text-red-800',

  // Check statuses (overlapping keys like in_progress already covered above)
  not_started: 'bg-gray-100 text-gray-600',
  needs_review: 'bg-orange-100 text-orange-700',
  passed: 'bg-green-100 text-green-700',
  not_applicable: 'bg-gray-100 text-gray-500',

  // Check outcomes
  adverse: 'bg-red-100 text-red-700',
  advisory: 'bg-yellow-100 text-yellow-700',
  insufficient: 'bg-yellow-100 text-yellow-700',
};

function formatLabel(status: string): string {
  return status
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

interface StatusBadgeProps {
  status: BadgeStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colors = STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colors,
        className,
      )}
    >
      {formatLabel(status)}
    </span>
  );
}
