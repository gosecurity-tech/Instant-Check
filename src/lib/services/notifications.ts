import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface NotificationEntry {
  id: string;
  user_id: string;
  organisation_id: string | null;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface PendingReminder {
  id: string;
  case_id: string;
  referee_name: string;
  referee_email: string;
  reminder_count: number;
  last_reminder_at: string | null;
  token_expires_at: string;
}

interface CreateNotificationParams {
  organisationId?: string;
  title: string;
  body?: string;
  link?: string;
}

interface ListNotificationsParams {
  page?: number;
  pageSize?: number;
  unreadOnly?: boolean;
}

interface ListNotificationsResult {
  data: NotificationEntry[];
  unreadCount: number;
  totalCount: number;
}

/**
 * Creates a notification record for a user
 */
export async function createNotification(
  userId: string,
  params: CreateNotificationParams
): Promise<string | null> {
  const adminClient = createAdminClient();

  const { data, error } = await adminClient
    .from('notifications')
    .insert({
      user_id: userId,
      organisation_id: params.organisationId || null,
      title: params.title,
      body: params.body || null,
      link: params.link || null,
      is_read: false,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating notification:', error);
    return null;
  }

  return data?.id || null;
}

/**
 * Lists paginated notifications for a user
 */
export async function listNotifications(
  userId: string,
  params?: ListNotificationsParams
): Promise<ListNotificationsResult> {
  const supabase = await createClient();
  const page = params?.page || 0;
  const pageSize = params?.pageSize || 20;
  const unreadOnly = params?.unreadOnly || false;

  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('notifications')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  const { data, error, count } = await query.range(from, to);

  if (error) {
    console.error('Error listing notifications:', error);
    return {
      data: [],
      unreadCount: 0,
      totalCount: 0,
    };
  }

  // Get unread count
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  return {
    data: (data || []) as NotificationEntry[],
    unreadCount: unreadCount || 0,
    totalCount: count || 0,
  };
}

/**
 * Marks a single notification as read
 */
export async function markNotificationRead(
  notificationId: string,
  userId: string
): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: now,
    })
    .eq('id', notificationId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }

  return true;
}

/**
 * Marks all unread notifications as read for a user
 */
export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('notifications')
    .update({
      is_read: true,
      read_at: now,
    })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }

  return true;
}

/**
 * Returns the count of unread notifications for a user
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_read', false);

  if (error) {
    console.error('Error getting unread count:', error);
    return 0;
  }

  return count || 0;
}

/**
 * Sends the same notification to multiple users
 */
export async function sendBulkNotifications(
  userIds: string[],
  params: CreateNotificationParams
): Promise<number> {
  const adminClient = createAdminClient();

  const notificationRows = userIds.map((userId) => ({
    user_id: userId,
    organisation_id: params.organisationId || null,
    title: params.title,
    body: params.body || null,
    link: params.link || null,
    is_read: false,
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await adminClient
    .from('notifications')
    .insert(notificationRows)
    .select('id');

  if (error) {
    console.error('Error sending bulk notifications:', error);
    return 0;
  }

  return (data || []).length;
}

/**
 * Finds reference requests that need reminders to be sent
 */
export async function getPendingReferenceReminders(
  maxReminderCount: number = 3,
  daysSinceLastReminder: number = 7
): Promise<PendingReminder[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();

  // Calculate date for last_reminder_at threshold
  const thresholdDate = new Date();
  thresholdDate.setDate(thresholdDate.getDate() - daysSinceLastReminder);
  const thresholdDateStr = thresholdDate.toISOString();

  const { data, error } = await supabase
    .from('reference_requests')
    .select('id, case_id, referee_name, referee_email, reminder_count, last_reminder_at, token_expires_at')
    .eq('status', 'sent')
    .lt('reminder_count', maxReminderCount)
    .gt('token_expires_at', now)
    .or(
      `last_reminder_at.is.null,last_reminder_at.lt.${thresholdDateStr}`
    );

  if (error) {
    console.error('Error fetching pending reference reminders:', error);
    return [];
  }

  return (data || []) as PendingReminder[];
}

/**
 * Records that a reminder was sent by incrementing reminder_count and updating last_reminder_at
 */
export async function recordReminderSent(requestId: string): Promise<boolean> {
  const adminClient = createAdminClient();
  const now = new Date().toISOString();

  // First get current reminder_count
  const { data: currentData } = await adminClient
    .from('reference_requests')
    .select('reminder_count')
    .eq('id', requestId)
    .single();

  if (!currentData) {
    console.error('Reference request not found:', requestId);
    return false;
  }

  const newReminderCount = (currentData.reminder_count || 0) + 1;

  const { error } = await adminClient
    .from('reference_requests')
    .update({
      reminder_count: newReminderCount,
      last_reminder_at: now,
    })
    .eq('id', requestId);

  if (error) {
    console.error('Error recording reminder sent:', error);
    return false;
  }

  return true;
}
