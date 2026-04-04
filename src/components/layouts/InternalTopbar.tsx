'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { NotificationBell } from '@/components/shared/NotificationBell';

export function InternalTopbar() {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6">
      {/* Breadcrumbs slot — will be populated per-page via context */}
      <div id="breadcrumbs" className="text-sm text-gray-500" />

      {/* Actions */}
      <div className="flex items-center gap-4">
        <NotificationBell />
        <button
          onClick={handleSignOut}
          className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
