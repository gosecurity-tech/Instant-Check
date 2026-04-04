import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Supabase Webhook handler.
 * Receives database change events (e.g., new user created, case status changed).
 * Uses the admin client (service_role) for any follow-up operations.
 *
 * Step 21: Implement webhook verification and event handlers.
 */
export async function POST(request: Request) {
  const headersList = await headers();
  const webhookSecret = headersList.get('x-supabase-webhook-secret');

  // Verify webhook secret
  if (webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const { type, table, record } = payload;

    // Route to appropriate handler based on event type
    switch (table) {
      case 'cases':
        // Handle case status changes — trigger notifications, etc.
        break;
      case 'candidates':
        // Handle candidate submission — transition case status
        break;
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 },
    );
  }
}
