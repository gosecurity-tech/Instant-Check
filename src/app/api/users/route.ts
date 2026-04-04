import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { UserType, InternalRole } from '@/types/enums';

/**
 * GET /api/users
 * List users visible to the authenticated internal user.
 * Super Admin sees all users; others see users in their org.
 *
 * Query params:
 * - type: 'internal' | 'client' | 'all' (default: 'all')
 * - page: number (default: 1)
 * - limit: number (default: 50)
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.app_metadata?.user_type !== UserType.Internal) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userTypeFilter = searchParams.get('type') ?? 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)));
  const offset = (page - 1) * limit;

  const results: Record<string, unknown> = {};

  // Internal users
  if (userTypeFilter === 'all' || userTypeFilter === 'internal') {
    let query = supabase
      .from('internal_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    results.internal_users = { data, count };
  }

  // Client users
  if (userTypeFilter === 'all' || userTypeFilter === 'client') {
    let query = supabase
      .from('client_users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    results.client_users = { data, count };
  }

  return NextResponse.json(results);
}

/**
 * PATCH /api/users
 * Update a user's role (Super Admin only).
 *
 * Body: { userId: string, role: InternalRole }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    !user ||
    user.app_metadata?.user_type !== UserType.Internal ||
    user.app_metadata?.role !== InternalRole.SuperAdmin
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId: string; role: InternalRole };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { userId, role } = body;

  if (!userId || !Object.values(InternalRole).includes(role)) {
    return NextResponse.json({ error: 'Invalid userId or role' }, { status: 400 });
  }

  if (userId === user.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role' },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Update app_metadata in auth.users
  const { error: authError } = await admin.auth.admin.updateUserById(userId, {
    app_metadata: { role },
  });

  if (authError) {
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }

  // Update internal_users profile
  const { error: profileError } = await admin
    .from('internal_users')
    .update({ role })
    .eq('id', userId);

  if (profileError) {
    return NextResponse.json({ error: 'Failed to sync role' }, { status: 500 });
  }

  // Audit log
  await admin.from('audit_logs').insert({
    actor_id: user.id,
    action: 'role_changed',
    entity_type: 'internal_user',
    entity_id: userId,
    organisation_id: user.app_metadata?.organisation_id,
    metadata: { new_role: role },
  });

  return NextResponse.json({ success: true });
}
