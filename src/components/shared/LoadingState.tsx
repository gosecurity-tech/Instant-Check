'use client';

import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  fullPage?: boolean;
}

export function LoadingState({
  message = 'Loading...',
  className,
  fullPage = false,
}: LoadingStateProps) {
  const containerClass = fullPage
    ? 'fixed inset-0 flex items-center justify-center bg-white/80 z-50'
    : 'flex items-center justify-center py-12';

  return (
    <div className={cn(containerClass, className)}>
      <div className="flex flex-col items-center space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        {message && <p className="text-sm text-gray-600">{message}</p>}
      </div>
    </div>
  );
}
