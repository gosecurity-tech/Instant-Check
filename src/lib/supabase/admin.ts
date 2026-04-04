import { createClient } from '@supabase/supabase-js';

/**
 * Creates a Supabase admin client using the service_role key.
 * This BYPASSES all RLS policies — use only in trusted server-side
 * contexts (webhooks, cron jobs, admin operations).
 *
 * NEVER import this in client components or expose to the browser.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
