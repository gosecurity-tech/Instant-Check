import { createAdminClient } from '@/lib/supabase/admin';
import type { AuthUser } from '@/types/auth';

// ============================================================
// Audit Log Utility
// Provides a typed, ergonomic wrapper around audit_logs INSERT.
// For critical paths, use the Postgres functions (which log atomically).
// This utility is for non-critical, application-level audit entries.
// ============================================================

export type AuditAction =
  // Cases
  | 'case.created'
  | 'case.status_changed'
  | 'case.assigned'
  | 'case.reassigned'
  | 'case.adjudicated'
  | 'case.reopened'
  | 'case.cancelled'
  // Checks
  | 'check.status_changed'
  | 'check.evidence_uploaded'
  | 'check.reviewed'
  | 'check.decision_recorded'
  // Candidates
  | 'candidate.invited'
  | 'candidate.submitted'
  | 'candidate.data_updated'
  | 'candidate.locked'
  // Documents
  | 'document.uploaded'
  | 'document.viewed'
  | 'document.reviewed'
  | 'document.deleted'
  // References
  | 'reference.requested'
  | 'reference.reminder_sent'
  | 'reference.response_received'
  | 'reference.discrepancy_flagged'
  // Right to Work
  | 'rtw.created'
  | 'rtw.document_submitted'
  | 'rtw.reviewed'
  | 'rtw.verified'
  | 'rtw.failed'
  | 'rtw.expired'
  // DBS
  | 'dbs.created'
  | 'dbs.application_submitted'
  | 'dbs.id_verified'
  | 'dbs.sent_to_dbs'
  | 'dbs.received'
  | 'dbs.reviewed'
  // Users
  | 'user_created'
  | 'user.role_changed'
  | 'user_deactivated'
  | 'user_reactivated'
  | 'user.login'
  | 'user.failed_login'
  // Clients
  | 'client.created'
  | 'client.updated'
  | 'client.package_changed'
  | 'client.user_added'
  | 'client.user_removed'
  // Reports
  | 'report.generated'
  | 'report.downloaded'
  | 'report.shared'
  // System
  | 'system.settings_changed'
  | 'system.sla_threshold_changed';

export type AuditEntityType =
  | 'case'
  | 'case_check'
  | 'candidate'
  | 'document'
  | 'reference_request'
  | 'reference_response'
  | 'internal_user'
  | 'client_user'
  | 'client'
  | 'report'
  | 'screening_package'
  | 'organisation'
  | 'right_to_work_check'
  | 'dbs_check'
  | 'system';

export interface AuditEntry {
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  organisationId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Record an audit log entry using the admin client (bypasses RLS).
 * The audit_logs table is INSERT-only — no one can UPDATE or DELETE entries.
 *
 * For critical paths (status transitions, adjudication), use the Postgres
 * functions instead — they log atomically in the same transaction.
 *
 * This function is for non-critical audit entries where atomicity with
 * the main operation is not required.
 */
export async function recordAuditLog(
  actor: AuthUser | { id: string; organisationId?: string },
  entry: AuditEntry,
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin.from('audit_logs').insert({
    actor_id: actor.id,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    organisation_id: entry.organisationId ?? ('organisationId' in actor ? actor.organisationId : undefined),
    metadata: entry.metadata ?? {},
  });

  if (error) {
    // Audit log failures should never crash the application,
    // but they MUST be logged for investigation.
    console.error('[AUDIT LOG FAILURE]', {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      error: error.message,
    });
  }
}

/**
 * Record audit via the server Supabase client (uses RLS — respects INSERT policy).
 * Use when the actor's JWT is available (Server Components, Server Actions).
 */
export async function recordAuditLogWithClient(
  supabase: { from: (table: string) => { insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }> } },
  actorId: string,
  entry: AuditEntry & { organisationId: string },
): Promise<void> {
  const { error } = await supabase.from('audit_logs').insert({
    actor_id: actorId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    organisation_id: entry.organisationId,
    metadata: entry.metadata ?? {},
  });

  if (error) {
    console.error('[AUDIT LOG FAILURE]', {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      error: error.message,
    });
  }
}
