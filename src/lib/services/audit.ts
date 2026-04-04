import { createClient } from '@/lib/supabase/server';

/**
 * Audit Log Entry interface representing a single audit log record
 */
export interface AuditLogEntry {
  id: string;
  organisation_id: string | null;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

/**
 * Audit Statistics interface for dashboard analytics
 */
export interface AuditStats {
  totalEvents: number;
  eventsByAction: { action: string; count: number }[];
  eventsByEntityType: { entity_type: string; count: number }[];
  eventsByDay: { date: string; count: number }[];
  topActors: { actor_email: string; count: number }[];
}

/**
 * Parameters for listing audit logs with pagination and filtering
 */
export interface ListAuditLogsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  action?: string;
  entityType?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
  organisationId?: string;
  sortBy?: 'created_at' | 'action' | 'actor_email' | 'entity_type';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Response from listAuditLogs with pagination metadata
 */
export interface ListAuditLogsResponse {
  data: AuditLogEntry[];
  page: number;
  pageSize: number;
  totalPages: number;
  totalCount: number;
}

/**
 * List audit logs with pagination, filtering, and search capabilities
 *
 * @param params - Filter and pagination parameters
 * @returns Paginated list of audit log entries
 */
export async function listAuditLogs(
  params: ListAuditLogsParams
): Promise<ListAuditLogsResponse> {
  const client = await createClient();

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  const sortBy = params.sortBy || 'created_at';
  const sortOrder = (params.sortOrder || 'desc').toUpperCase();

  const offset = (page - 1) * pageSize;

  let query = client
    .from('audit_logs')
    .select('*', { count: 'exact' });

  // Apply filters
  if (params.organisationId) {
    query = query.eq('organisation_id', params.organisationId);
  }

  if (params.action) {
    query = query.eq('action', params.action);
  }

  if (params.entityType) {
    query = query.eq('entity_type', params.entityType);
  }

  if (params.actorId) {
    query = query.eq('actor_id', params.actorId);
  }

  // Date range filters
  if (params.dateFrom) {
    query = query.gte('created_at', params.dateFrom);
  }

  if (params.dateTo) {
    query = query.lte('created_at', params.dateTo);
  }

  // Text search across actor_email, entity_id, and action
  if (params.search) {
    const searchTerm = `%${params.search}%`;
    query = query.or(
      `actor_email.ilike.${searchTerm},entity_id.cast(text).ilike.${searchTerm},action.ilike.${searchTerm}`
    );
  }

  // Apply sorting and pagination
  const { data, count, error } = await query
    .order(sortBy, { ascending: sortOrder === 'ASC' })
    .range(offset, offset + pageSize - 1);

  if (error) {
    throw new Error(`Failed to list audit logs: ${error.message}`);
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: data as AuditLogEntry[],
    page,
    pageSize,
    totalPages,
    totalCount,
  };
}

/**
 * Get a single audit log entry by ID
 *
 * @param id - The UUID of the audit log entry
 * @returns The audit log entry or null if not found
 */
export async function getAuditLogById(id: string): Promise<AuditLogEntry | null> {
  const client = await createClient();

  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null;
    }
    throw new Error(`Failed to fetch audit log: ${error.message}`);
  }

  return data as AuditLogEntry;
}

/**
 * Get all audit logs for a specific entity
 *
 * @param entityType - The type of entity (e.g., 'candidate', 'check', 'report')
 * @param entityId - The UUID of the entity
 * @returns Array of audit log entries ordered by created_at DESC
 */
export async function getAuditLogsForEntity(
  entityType: string,
  entityId: string
): Promise<AuditLogEntry[]> {
  const client = await createClient();

  const { data, error } = await client
    .from('audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch audit logs for entity: ${error.message}`);
  }

  return (data || []) as AuditLogEntry[];
}

/**
 * Get audit statistics for dashboard analytics
 *
 * @param organisationId - Optional: filter stats by organisation
 * @param dateFrom - Optional: start date for the stats range
 * @param dateTo - Optional: end date for the stats range
 * @returns Audit statistics including event counts by action, entity type, day, and top actors
 */
export async function getAuditStats(
  organisationId?: string,
  dateFrom?: string,
  dateTo?: string
): Promise<AuditStats> {
  const client = await createClient();

  // Fetch all logs that match the criteria (we'll aggregate in memory)
  let query = client
    .from('audit_logs')
    .select('action, entity_type, created_at, actor_email');

  if (organisationId) {
    query = query.eq('organisation_id', organisationId);
  }

  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }

  if (dateTo) {
    query = query.lte('created_at', dateTo);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit stats: ${error.message}`);
  }

  const logs = (data || []) as Array<{
    action: string;
    entity_type: string;
    created_at: string;
    actor_email: string;
  }>;

  // Aggregate event counts by action (top 10)
  const actionMap = new Map<string, number>();
  const entityTypeMap = new Map<string, number>();
  const dayMap = new Map<string, number>();
  const actorMap = new Map<string, number>();

  logs.forEach((log) => {
    // Count by action
    actionMap.set(log.action, (actionMap.get(log.action) || 0) + 1);

    // Count by entity type
    entityTypeMap.set(
      log.entity_type,
      (entityTypeMap.get(log.entity_type) || 0) + 1
    );

    // Count by day (extract date from created_at ISO string)
    const date = log.created_at.split('T')[0];
    dayMap.set(date, (dayMap.get(date) || 0) + 1);

    // Count by actor
    actorMap.set(log.actor_email, (actorMap.get(log.actor_email) || 0) + 1);
  });

  // Convert maps to sorted arrays
  const eventsByAction = Array.from(actionMap.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const eventsByEntityType = Array.from(entityTypeMap.entries())
    .map(([entity_type, count]) => ({ entity_type, count }))
    .sort((a, b) => b.count - a.count);

  // Get last 30 days of data
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString().split('T')[0];

  const eventsByDay = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .filter(({ date }) => date >= thirtyDaysAgoISO)
    .sort((a, b) => a.date.localeCompare(b.date));

  const topActors = Array.from(actorMap.entries())
    .map(([actor_email, count]) => ({ actor_email, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalEvents: logs.length,
    eventsByAction,
    eventsByEntityType,
    eventsByDay,
    topActors,
  };
}