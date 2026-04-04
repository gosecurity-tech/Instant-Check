import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Supabase Auth Webhook Handler
 *
 * Triggered on auth events (user.created, user.updated, user.deleted).
 * Used to sync auth.users with our domain tables (internal_users, client_users, candidates).
 *
 * Configure in Supabase Dashboard → Authentication → Hooks → Webhook
 * URL: https://your-domain.com/api/auth/webhook
 * Secret: SUPABASE_WEBHOOK_SECRET
 */

interface WebhookPayload {
  type: string;
  table: string;
  record: {
    id: string;
    email: string;
    raw_app_meta_data?: {
      user_type?: string;
      role?: string;
      organisation_id?: string;
      candidate_id?: string;
      client_id?: string;
    };
    raw_user_meta_data?: {
      full_name?: string;
    };
    created_at?: string;
    updated_at?: string;
  };
  old_record?: {
    id: string;
    raw_app_meta_data?: {
      role?: string;
      user_type?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  // Verify webhook secret
  const secret = request.headers.get('x-webhook-secret');
  if (secret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { type, record, old_record } = payload;

  try {
    switch (type) {
      case 'INSERT': {
        // New auth user created — profile rows are created by the invite actions,
        // but this is a safety net for users created directly in the Supabase dashboard.
        const appMeta = record.raw_app_meta_data;
        if (!appMeta?.user_type) break;

        const userType = appMeta.user_type;
        const fullName = record.raw_user_meta_data?.full_name ?? record.email;

        if (userType === 'internal') {
          // Check if profile already exists
          const { data: existing } = await admin
            .from('internal_users')
            .select('id')
            .eq('id', record.id)
            .single();

          if (!existing) {
            await admin.from('internal_users').insert({
              id: record.id,
              organisation_id: appMeta.organisation_id,
              email: record.email,
              full_name: fullName,
              role: appMeta.role ?? 'case_handler',
              is_active: true,
            });
          }
        } else if (userType === 'client') {
          const { data: existing } = await admin
            .from('client_users')
            .select('id')
            .eq('id', record.id)
            .single();

          if (!existing) {
            await admin.from('client_users').insert({
              id: record.id,
              client_id: appMeta.client_id,
              organisation_id: appMeta.organisation_id,
              email: record.email,
              full_name: fullName,
              is_active: true,
            });
          }
        }
        // Candidates are linked via candidates.auth_user_id, no separate profile row needed

        break;
      }

      case 'UPDATE': {
        // Role change — sync to profile table
        const newMeta = record.raw_app_meta_data;
        const oldMeta = old_record?.raw_app_meta_data;

        if (
          newMeta?.user_type === 'internal' &&
          newMeta?.role &&
          newMeta.role !== oldMeta?.role
        ) {
          await admin
            .from('internal_users')
            .update({ role: newMeta.role })
            .eq('id', record.id);

          // Audit log for role change
          await admin.from('audit_logs').insert({
            actor_id: record.id, // Self-referential for system events
            action: 'role_changed',
            entity_type: 'internal_user',
            entity_id: record.id,
            organisation_id: newMeta.organisation_id,
            metadata: {
              old_role: oldMeta?.role,
              new_role: newMeta.role,
              source: 'auth_webhook',
            },
          });
        }

        break;
      }

      case 'DELETE': {
        // Auth user deleted — deactivate profile (don't delete for audit trail)
        const userType = record.raw_app_meta_data?.user_type;

        if (userType === 'internal') {
          await admin
            .from('internal_users')
            .update({ is_active: false })
            .eq('id', record.id);
        } else if (userType === 'client') {
          await admin
            .from('client_users')
            .update({ is_active: false })
            .eq('id', record.id);
        }

        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Auth webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
