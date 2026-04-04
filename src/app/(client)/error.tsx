'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="max-w-md w-full">
        <h1 className="text-4xl font-bold text-foreground mb-4">An error occurred</h1>
        <div className="bg-muted rounded-lg p-4 mb-6 overflow-auto max-h-32">
          <code className="text-xs text-muted-foreground break-words">
            {error.message || 'An unexpected error occurred'}
          </code>
        </div>
        <div className="flex flex-col gap-4">
          <Button onClick={reset} className="w-full">
            Try again
          </Button>
          <Link href="/client/dashboard" className="text-sm text-primary hover:underline text-center">
            Return to Client Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
