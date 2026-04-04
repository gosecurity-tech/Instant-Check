'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/client/dashboard' },
  { label: 'Cases', href: '/client/cases' },
  { label: 'New Case', href: '/client/new-case' },
  { label: 'Reports', href: '/client/reports' },
  { label: 'Settings', href: '/client/settings' },
];

export function ClientNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/client-login');
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-gray-200 bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <Link
          href="/client/dashboard"
          className="text-lg font-bold text-gray-900"
        >
          Instant<span className="text-blue-600">Check</span>
          <span className="ml-2 text-xs font-normal text-gray-400">
            Client Portal
          </span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Sign out */}
        <div className="flex items-center gap-4">
          <span className="hidden text-sm text-gray-600 lg:inline">
            {user?.fullName ?? user?.email}
          </span>
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
