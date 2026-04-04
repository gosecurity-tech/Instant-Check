'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { extractAuthUser } from '@/lib/auth-helpers';
import type { AuthUser } from '@/types/auth';

/**
 * Client-side hook to get the current authenticated user.
 * Subscribes to auth state changes for real-time updates.
 */
export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    // Get initial user
    supabase.auth.getUser().then(({ data: { user: rawUser } }) => {
      setUser(rawUser ? extractAuthUser(rawUser) : null);
      setLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? extractAuthUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, loading };
}
