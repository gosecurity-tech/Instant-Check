import { Suspense } from 'react';
import { ClientLoginForm } from './ClientLoginForm';

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <ClientLoginForm />
    </Suspense>
  );
}

function LoginSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-6 w-40 rounded bg-gray-200" />
      <div className="h-4 w-64 rounded bg-gray-200" />
      <div className="space-y-3">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="h-10 w-full rounded-lg bg-gray-200" />
      </div>
      <div className="space-y-3">
        <div className="h-4 w-20 rounded bg-gray-200" />
        <div className="h-10 w-full rounded-lg bg-gray-200" />
      </div>
      <div className="h-10 w-full rounded-lg bg-gray-200" />
    </div>
  );
}
