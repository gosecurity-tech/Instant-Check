import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/middleware';
import { UserType } from '@/types/enums';
import {
  getPortalFromPath,
  canAccessPortal,
  getDefaultRedirect,
  getLoginPath,
} from '@/lib/permissions';

// ============================================================
// Public paths that never require authentication
// ============================================================
const PUBLIC_PATHS = [
  '/login',
  '/client-login',
  '/candidate-login',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/webhooks',
  '/api/references',
  '/api/auth/webhook',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

// ============================================================
// Middleware
// ============================================================
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Create Supabase client and refresh session
  const { supabase, response, user } = await createClient(request);

  // 2. Public paths — allow through (but still refresh session cookies)
  if (isPublicPath(pathname)) {
    // If user IS authenticated and hits a login page, redirect to their portal
    if (user) {
      const userType = (user.app_metadata?.user_type as UserType) ?? UserType.Internal;
      const redirectTo = getDefaultRedirect(userType);
      const url = request.nextUrl.clone();
      url.pathname = redirectTo;
      return NextResponse.redirect(url);
    }
    return response;
  }

  // 3. No user — redirect to appropriate login page
  if (!user) {
    const portal = getPortalFromPath(pathname);
    let loginPath = '/login';
    if (portal === 'client') loginPath = '/client-login';
    if (portal === 'candidate') loginPath = '/candidate-login';

    const url = request.nextUrl.clone();
    url.pathname = loginPath;
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // 4. User authenticated — check portal access
  const userType = (user.app_metadata?.user_type as UserType) ?? UserType.Internal;
  const portal = getPortalFromPath(pathname);

  if (!canAccessPortal(userType, portal)) {
    // User is trying to access a portal they don't belong to.
    // Redirect them to their own portal's dashboard.
    const url = request.nextUrl.clone();
    url.pathname = getDefaultRedirect(userType);
    return NextResponse.redirect(url);
  }

  // 5. All checks passed — allow through
  return response;
}

// ============================================================
// Matcher — run middleware on all routes except static assets
// ============================================================
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico (browser favicon)
     * - public folder assets (images, svgs, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
