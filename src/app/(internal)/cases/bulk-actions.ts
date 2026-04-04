'use server';

import { requireInternalUser } from '@/lib/auth/server';
import {
  bulkAssignCases,
  bulkTransitionCaseStatus,
  bulkUpdatePriority,
  bulkExportCases,
} from '@/lib/services/bulk';
import { recordAuditLog } from '@/lib/audit';
import { CaseStatus, CasePriority } from '@/types/enums';

// ============================================================
// Bulk Assign Action
// ============================================================

export async function bulkAssignAction(data: {
  caseIds: string[];
  assigneeId: string;
}): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const user = await requireInternalUser();

  const result = await bulkAssignCases(data.caseIds, data.assigneeId, user.id);

  // Log audit entries for each successful assignment
  for (const caseId of result.succeeded) {
    await recordAuditLog(user, {
      action: 'case.assigned',
      entityType: 'case',
      entityId: caseId,
      organisationId: user.organisationId,
      metadata: {
        assigned_to: data.assigneeId,
      },
    });
  }

  return {
    succeeded: result.succeeded.length,
    failed: result.failed.length,
    errors: result.failed,
  };
}

// ============================================================
// Bulk Status Change Action
// ============================================================

export async function bulkStatusAction(data: {
  caseIds: string[];
  status: string;
  notes?: string;
}): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const user = await requireInternalUser();

  // Validate the status
  if (!Object.values(CaseStatus).includes(data.status as CaseStatus)) {
    return {
      succeeded: 0,
      failed: data.caseIds.length,
      errors: data.caseIds.map((id) => ({
        id,
        error: `Invalid status: ${data.status}`,
      })),
    };
  }

  const result = await bulkTransitionCaseStatus(
    data.caseIds,
    data.status as CaseStatus,
    user.id,
    data.notes,
  );

  // Log audit entries for each successful transition
  for (const caseId of result.succeeded) {
    await recordAuditLog(user, {
      action: 'case.status_changed',
      entityType: 'case',
      entityId: caseId,
      organisationId: user.organisationId,
      metadata: {
        new_status: data.status,
        notes: data.notes,
      },
    });
  }

  return {
    succeeded: result.succeeded.length,
    failed: result.failed.length,
    errors: result.failed,
  };
}

// ============================================================
// Bulk Priority Change Action
// ============================================================

export async function bulkPriorityAction(data: {
  caseIds: string[];
  priority: string;
}): Promise<{
  succeeded: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const user = await requireInternalUser();

  // Validate the priority
  if (!Object.values(CasePriority).includes(data.priority as CasePriority)) {
    return {
      succeeded: 0,
      failed: data.caseIds.length,
      errors: data.caseIds.map((id) => ({
        id,
        error: `Invalid priority: ${data.priority}`,
      })),
    };
  }

  const result = await bulkUpdatePriority(
    data.caseIds,
    data.priority as CasePriority,
    user.id,
  );

  // Log audit entries for each successful update
  for (const caseId of result.succeeded) {
    await recordAuditLog(user, {
      action: 'case.status_changed',
      entityType: 'case',
      entityId: caseId,
      organisationId: user.organisationId,
      metadata: {
        field: 'priority',
        new_priority: data.priority,
      },
    });
  }

  return {
    succeeded: result.succeeded.length,
    failed: result.failed.length,
    errors: result.failed,
  };
}

// ============================================================
// Bulk Export Action
// ============================================================

export async function bulkExportAction(caseIds: string[]): Promise<{
  csv: string;
  filename: string;
}> {
  await requireInternalUser();

  const exportData = await bulkExportCases(caseIds);

  if (!exportData.length) {
    return {
      csv: '',
      filename: 'cases-export.csv',
    };
  }

  // Build CSV headers
  const headers = [
    'Case Reference',
    'Status',
    'Outcome',
    'Priority',
    'Candidate Name',
    'Candidate Email',
    'Client Name',
    'Assigned To',
    'Created At',
    'Completed At',
    'SLA Due Date',
  ];

  // Escape CSV value (handle quotes and commas)
  const escapeCsvValue = (value: string | null | undefined): string => {
    if (value === null || value === undefined) return '';
    const stringVal = String(value);
    if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
      return `"${stringVal.replace(/"/g, '""')}"`;
    }
    return stringVal;
  };

  // Build CSV rows
  const rows = exportData.map((row) => [
    escapeCsvValue(row.case_reference),
    escapeCsvValue(row.status),
    escapeCsvValue(row.outcome),
    escapeCsvValue(row.priority),
    escapeCsvValue(row.candidate_name),
    escapeCsvValue(row.candidate_email),
    escapeCsvValue(row.client_name),
    escapeCsvValue(row.assigned_to_name),
    escapeCsvValue(row.created_at),
    escapeCsvValue(row.completed_at),
    escapeCsvValue(row.sla_due_date),
  ]);

  // Combine headers and rows
  const csv = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Generate filename with timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `cases-export-${timestamp}.csv`;

  return {
    csv,
    filename,
  };
}
