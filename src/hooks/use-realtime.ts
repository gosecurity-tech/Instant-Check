'use client';

import { useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';

// ============================================================
// Types
// ============================================================

type PostgresChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions<T extends Record<string, unknown>> {
  /** Table to subscribe to */
  table: string;
  /** Schema (default: 'public') */
  schema?: string;
  /** Event type to listen for */
  event?: PostgresChangeEvent;
  /** Optional filter (e.g. 'client_id=eq.abc-123') */
  filter?: string;
  /** Callback when a matching event occurs */
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void;
  /** Whether the subscription is active (default: true) */
  enabled?: boolean;
}

// ============================================================
// Hook: Subscribe to Postgres changes via Supabase Realtime
// ============================================================

/**
 * Subscribe to real-time Postgres changes on a table.
 * Automatically cleans up the subscription on unmount.
 *
 * Usage:
 * ```tsx
 * useRealtime({
 *   table: 'cases',
 *   event: 'UPDATE',
 *   filter: `client_id=eq.${clientId}`,
 *   onEvent: (payload) => {
 *     // Refresh data or update local state
 *     router.refresh();
 *   },
 * });
 * ```
 */
export function useRealtime<T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseRealtimeOptions<T>,
): void {
  const {
    table,
    schema = 'public',
    event = '*',
    filter,
    onEvent,
    enabled = true,
  } = options;

  const channelRef = useRef<RealtimeChannel | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled) return;

    const supabase = createClient();
    const channelName = `realtime:${schema}:${table}:${event}:${filter ?? 'all'}`;

    const channelConfig: Record<string, unknown> = {
      event,
      schema,
      table,
    };

    if (filter) {
      channelConfig.filter = filter;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as never,
        channelConfig as never,
        (payload: RealtimePostgresChangesPayload<T>) => {
          onEventRef.current(payload);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [table, schema, event, filter, enabled]);
}

// ============================================================
// Hook: Subscribe to case status changes
// ============================================================

export function useCaseStatusChanges(
  clientId: string | undefined,
  onStatusChange: (caseId: string, newStatus: string) => void,
): void {
  useRealtime({
    table: 'cases',
    event: 'UPDATE',
    filter: clientId ? `client_id=eq.${clientId}` : undefined,
    enabled: !!clientId,
    onEvent: (payload) => {
      if (payload.new && 'id' in payload.new && 'status' in payload.new) {
        onStatusChange(
          (payload.new as Record<string, unknown>).id as string,
          (payload.new as Record<string, unknown>).status as string,
        );
      }
    },
  });
}

// ============================================================
// Hook: Subscribe to task assignments
// ============================================================

export function useTaskAssignments(
  userId: string | undefined,
  onNewTask: () => void,
): void {
  useRealtime({
    table: 'tasks',
    event: 'INSERT',
    filter: userId ? `assigned_to=eq.${userId}` : undefined,
    enabled: !!userId,
    onEvent: () => {
      onNewTask();
    },
  });
}

// ============================================================
// Hook: Subscribe to notification channel
// ============================================================

export function useNotifications(
  userId: string | undefined,
  onNotification: (notification: Record<string, unknown>) => void,
): void {
  useRealtime({
    table: 'notifications',
    event: 'INSERT',
    filter: userId ? `user_id=eq.${userId}` : undefined,
    enabled: !!userId,
    onEvent: (payload) => {
      if (payload.new) {
        onNotification(payload.new as Record<string, unknown>);
      }
    },
  });
}
