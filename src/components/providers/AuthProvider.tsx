'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { extractAuthUser } from '@/lib/auth-helpers';
import { getDefaultRedirect, getLoginPath } from '@/lib/permissions';
import type { AuthUser } from '@/types/auth';

// ============================================================
// Context types
// ============================================================

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
  refreshUser: async () => {},
});

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  // Fetch user on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: rawUser } }) => {
      setUser(rawUser ? extractAuthUser(rawUser) : null);
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const newUser = session?.user ? extractAuthUser(session.user) : null;
      setUser(newUser);

      if (_event === 'SIGNED_OUT') {
        router.push('/login');
        router.refresh();
      }
    });

    return () => subscription.unsubscribe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push('/login');
    router.refresh();
  }, [supabase, router]);

  const refreshUser = useCallback(async () => {
    const { data: { user: rawUser } } = await supabase.auth.getUser();
    setUser(rawUser ? extractAuthUser(rawUser) : null);
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signOut: handleSignOut,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
