import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { UserType } from '@/types/enums';
import { getDefaultRedirect } from '@/lib/permissions';

/**
 * Auth callback handler.
 * Supabase redirects here after email confirmation / magic link click.
 * Exchanges the code for a session, then redirects to the correct portal.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirectTo');

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      const userType =
        (data.user.app_metadata?.user_type as UserType) ?? UserType.Internal;

      // If a specific redirect was requested, honour it
      if (redirectTo) {
        return NextResponse.redirect(`${origin}${redirectTo}`);
      }

      // Otherwise, send to the user's default portal
      return NextResponse.redirect(`${origin}${getDefaultRedirect(userType)}`);
    }
  }

  // Something went wrong — send back to login
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
