'use client';

import Link from 'next/link';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface AuditEntryProps {
  action: string;
  entityType: string;
  entityId: string;
  actorEmail?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  className?: string;
}

export function AuditEntry({
  action,
  entityType,
  entityId,
  actorEmail,
  metadata,
  createdAt,
  className,
}: AuditEntryProps) {
  const timestamp = formatDistanceToNow(parseISO(createdAt), {
    addSuffix: true,
  });

  const actionLabel = action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  const entityTypeLabel = entityType
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return (
    <div
      className={cn(
        'flex items-start space-x-4 border-l-2 border-gray-200 pl-4 py-4',
        className
      )}
    >
      <div className="flex flex-col space-y-2 flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-gray-900">{actionLabel}</span>
          <span className="text-xs text-gray-500">{timestamp}</span>
        </div>

        <div className="text-sm text-gray-700">
          {actorEmail && (
            <>
              <span className="font-medium">{actorEmail}</span>
              {' '}
            </>
          )}
          <span>{actionLabel.toLowerCase()} </span>
          <Link
            href={`/${entityType.toLowerCase()}s/${entityId}`}
            className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            {entityTypeLabel} {entityId}
          </Link>
        </div>

        {metadata && Object.keys(metadata).length > 0 && (
          <div className="mt-2 space-y-1 bg-gray-50 rounded p-2 text-xs text-gray-600">
            {Object.entries(metadata).map(([key, value]) => (
              <div key={key}>
                <span className="font-medium">{key}:</span>{' '}
                {typeof value === 'object'
                  ? JSON.stringify(value)
                  : String(value)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
