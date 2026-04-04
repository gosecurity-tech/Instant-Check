import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CaseStatus, CasePriority } from '@/types/enums';

// ============================================================
// Type Definitions
// ============================================================

export interface BulkResult {
  succeeded: string[];
  failed: Array<{
    id: string;
    error: string;
  }>;
}

export interface CaseExportRow {
  case_reference: string;
  status: string;
  outcome: string | null;
  priority: string;
  candidate_name: string;
  candidate_email: string;
  client_name: string;
  assigned_to_name: string | null;
  created_at: string;
  completed_at: string | null;
  sla_due_date: string | null;
}

interface BulkCreateTasksParams {
  caseIds: string[];
  title: string;
  description?: string;
  priority: string;
  assignedTo: string;
  dueDate?: string;
  organisationId: string;
  createdBy: string;
}

// ============================================================
// Bulk Assign Cases
// ============================================================

export async function bulkAssignCases(
  caseIds: string[],
  assigneeId: string,
  actorId: string,
): Promise<BulkResult> {
  const supabase = await createClient();
  const result: BulkResult = {
    succeeded: [],
    failed: [],
  };

  if (!caseIds.length) return result;

  try {
    const { error } = await supabase
      .from('cases')
      .update({
        assigned_to: assigneeId,
        updated_at: new Date().toISOString(),
      })
      .in('id', caseIds);

    if (error) {
      result.failed = caseIds.map((id) => ({
        id,
        error: error.message,
      }));
    } else {
      result.succeeded = caseIds;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.failed = caseIds.map((id) => ({
      id,
      error: message,
    }));
  }

  return result;
}

// ============================================================
// Bulk Transition Case Status
// ============================================================

export async function bulkTransitionCaseStatus(
  caseIds: string[],
  newStatus: CaseStatus,
  actorId: string,
  notes?: string,
): Promise<BulkResult> {
  const supabase = await createClient();
  const result: BulkResult = {
    succeeded: [],
    failed: [],
  };

  if (!caseIds.length) return result;

  if (!Object.values(CaseStatus).includes(newStatus)) {
    return {
      succeeded: [],
      failed: caseIds.map((id) => ({
        id,
        error: `Invalid status: ${newStatus}`,
      })),
    };
  }

  for (const caseId of caseIds) {
    try {
      const { error } = await supabase.rpc('transition_case_status', {
        p_case_id: caseId,
        p_new_status: newStatus,
        p_changed_by: actorId,
        p_notes: notes ?? null,
      });

      if (error) {
        result.failed.push({
          id: caseId,
          error: error.message,
        });
      } else {
        result.succeeded.push(caseId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      result.failed.push({
        id: caseId,
        error: message,
      });
    }
  }

  return result;
}

// ============================================================
// Bulk Update Priority
// ============================================================

export async function bulkUpdatePriority(
  caseIds: string[],
  priority: CasePriority,
  actorId: string,
): Promise<BulkResult> {
  const supabase = await createClient();
  const result: BulkResult = {
    succeeded: [],
    failed: [],
  };

  if (!caseIds.length) return result;

  if (!Object.values(CasePriority).includes(priority)) {
    return {
      succeeded: [],
      failed: caseIds.map((id) => ({
        id,
        error: `Invalid priority: ${priority}`,
      })),
    };
  }

  try {
    const { error } = await supabase
      .from('cases')
      .update({
        priority,
        updated_at: new Date().toISOString(),
      })
      .in('id', caseIds);

    if (error) {
      result.failed = caseIds.map((id) => ({
        id,
        error: error.message,
      }));
    } else {
      result.succeeded = caseIds;
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    result.failed = caseIds.map((id) => ({
      id,
      error: message,
    }));
  }

  return result;
}

// ============================================================
// Bulk Create Tasks
// ============================================================

export async function bulkCreateTasks(params: BulkCreateTasksParams): Promise<{
  created: number;
  failed: number;
}> {
  const supabase = await createClient();
  const { caseIds, title, description, priority, assignedTo, dueDate, organisationId, createdBy } =
    params;

  if (!caseIds.length) {
    return { created: 0, failed: 0 };
  }

  const rows = caseIds.map((caseId) => ({
    case_id: caseId,
    title,
    description: description ?? null,
    priority,
    assigned_to: assignedTo,
    due_date: dueDate ?? null,
    organisation_id: organisationId,
    created_by: createdBy,
    status: 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));

  try {
    const { error, data } = await supabase.from('tasks').insert(rows).select();

    if (error) {
      return {
        created: 0,
        failed: caseIds.length,
      };
    }

    const created = data?.length ?? 0;
    return {
      created,
      failed: caseIds.length - created,
    };
  } catch (err) {
    return {
      created: 0,
      failed: caseIds.length,
    };
  }
}

// ============================================================
// Bulk Export Cases to CSV
// ============================================================

export async function bulkExportCases(caseIds: string[]): Promise<CaseExportRow[]> {
  const supabase = await createClient();

  if (!caseIds.length) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('cases')
      .select(
        `
        id,
        case_reference,
        status,
        outcome,
        priority,
        created_at,
        completed_at,
        sla_deadline,
        candidates(first_name, last_name, email),
        clients(company_name),
        assigned_to:internal_users(first_name, last_name)
      `,
      )
      .in('id', caseIds);

    if (error) {
      console.error('Failed to export cases:', error.message);
      return [];
    }

    if (!data) {
      return [];
    }

    const exportRows: CaseExportRow[] = data.map((row: Record<string, unknown>) => {
      const candidate = Array.isArray(row.candidates) ? row.candidates[0] : row.candidates;
      const client = Array.isArray(row.clients) ? row.clients[0] : row.clients;
      const assignedUser = Array.isArray(row.assigned_to) ? row.assigned_to[0] : row.assigned_to;

      const candidateName =
        candidate && typeof candidate === 'object'
          ? `${(candidate as Record<string, unknown>).first_name} ${(candidate as Record<string, unknown>).last_name}`
          : '';

      const candidateEmail =
        candidate && typeof candidate === 'object' ? (candidate as Record<string, unknown>).email : '';

      const clientName =
        client && typeof client === 'object' ? (client as Record<string, unknown>).company_name : '';

      const assignedToName =
        assignedUser && typeof assignedUser === 'object'
          ? `${(assignedUser as Record<string, unknown>).first_name} ${(assignedUser as Record<string, unknown>).last_name}`
          : null;

      return {
        case_reference: String(row.case_reference || ''),
        status: String(row.status || ''),
        outcome: row.outcome ? String(row.outcome) : null,
        priority: String(row.priority || ''),
        candidate_name: String(candidateName || ''),
        candidate_email: String(candidateEmail || ''),
        client_name: String(clientName || ''),
        assigned_to_name: assignedToName,
        created_at: String(row.created_at || ''),
        completed_at: row.completed_at ? String(row.completed_at) : null,
        sla_due_date: row.sla_deadline ? String(row.sla_deadline) : null,
      };
    });

    return exportRows;
  } catch (err) {
    console.error('Error exporting cases:', err);
    return [];
  }
}
