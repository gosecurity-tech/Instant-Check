import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const unreadOnly = searchParams.get('unreadOnly') === 'true';
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data: notifications, error: notificationsError } = await query;

  if (notificationsError) {
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  }

  const { count: unreadCount, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('is_read', false);

  if (countError) {
    return NextResponse.json(
      { error: 'Failed to fetch unread count' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    notifications: notifications || [],
    unreadCount: unreadCount || 0,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { notificationId, markAllRead } = body;

  if (!notificationId && !markAllRead) {
    return NextResponse.json(
      { error: 'Either notificationId or markAllRead is required' },
      { status: 400 }
    );
  }

  let updateQuery = supabase
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (markAllRead) {
    updateQuery = updateQuery.eq('is_read', false);
  } else if (notificationId) {
    updateQuery = updateQuery.eq('id', notificationId);
  }

  const { error } = await updateQuery;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to update notifications' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
