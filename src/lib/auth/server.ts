import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { extractAuthUser } from '@/lib/auth-helpers';
import { getLoginPath, type PortalType } from '@/lib/permissions';
import type { AuthUser } from '@/types/auth';
import { UserType } from '@/types/enums';

/**
 * Get the authenticated user in a Server Component / Server Action.
 * Returns null if not authenticated (does NOT redirect).
 * Use this when you want to conditionally show content.
 */
export async function getOptionalUser(): Promise<AuthUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;
  return extractAuthUser(user);
}

/**
 * Get the authenticated user, or redirect to login.
 * Use this at the top of any protected Server Component page.
 *
 * @param expectedPortal - Optional portal type check. If the user
 *   doesn't belong to this portal, they'll be redirected home.
 */
export async function getAuthUser(
  expectedPortal?: PortalType,
): Promise<AuthUser> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const authUser = extractAuthUser(user);

  // Portal type check
  if (expectedPortal) {
    const portalTypeMap: Record<string, UserType> = {
      internal: UserType.Internal,
      client: UserType.Client,
      candidate: UserType.Candidate,
    };

    const expectedType = portalTypeMap[expectedPortal];
    if (expectedType && authUser.userType !== expectedType) {
      // User is on the wrong portal — send to their login
      redirect(getLoginPath(authUser.userType));
    }
  }

  return authUser;
}

/**
 * Require that the authenticated user is internal with at least
 * the given role. If not, redirect.
 */
export async function requireInternalUser(): Promise<AuthUser> {
  const user = await getAuthUser('internal');
  return user;
}

/**
 * Require that the authenticated user is a client user.
 */
export async function requireClientUser(): Promise<AuthUser> {
  const user = await getAuthUser('client');
  return user;
}

/**
 * Require that the authenticated user is a candidate.
 */
export async function requireCandidateUser(): Promise<AuthUser> {
  const user = await getAuthUser('candidate');
  return user;
}
