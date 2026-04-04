'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import {
  canViewAuditLog,
  canManageSettings,
  canManageClients,
} from '@/lib/permissions';

interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name — replaced with SVG in production
  show?: boolean;
}

export function InternalSidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: 'layout-dashboard' },
    { label: 'Cases', href: '/cases', icon: 'briefcase' },
    {
      label: 'Clients',
      href: '/clients',
      icon: 'building-2',
      show: user ? canManageClients(user) : false,
    },
    { label: 'Candidates', href: '/candidates', icon: 'users' },
    { label: 'Tasks', href: '/tasks', icon: 'check-square' },
    { label: 'Reports', href: '/reports', icon: 'file-text' },
    {
      label: 'Audit Log',
      href: '/audit',
      icon: 'shield-check',
      show: user ? canViewAuditLog(user) : false,
    },
    {
      label: 'Settings',
      href: '/settings',
      icon: 'settings',
      show: user ? canManageSettings(user) : false,
    },
  ];

  const visibleItems = navItems.filter((item) => item.show !== false);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-gray-200 bg-white">
      {/* Brand */}
      <div className="flex h-16 items-center border-b border-gray-200 px-6">
        <Link href="/dashboard" className="text-lg font-bold text-gray-900">
          Instant<span className="text-blue-600">Check</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              )}
            >
              {/* Icon placeholder — will be replaced with lucide-react icons */}
              <span className="flex h-5 w-5 items-center justify-center text-xs">
                {item.label.charAt(0)}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info footer */}
      <div className="border-t border-gray-200 p-4">
        <div className="text-sm font-medium text-gray-900 truncate">
          {user?.fullName ?? user?.email ?? 'Loading…'}
        </div>
        <div className="text-xs text-gray-500 truncate">
          {user?.role?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? ''}
        </div>
      </div>
    </aside>
  );
}
