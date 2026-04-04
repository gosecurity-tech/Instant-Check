/**
 * Decisioning Service
 *
 * Provides the business logic layer for case adjudication and decisioning.
 * Handles case readiness validation, status transitions, adjudication workflows,
 * and comprehensive audit trail management.
 */

import { createClient } from '@/lib/supabase/server';
import type { CaseCheckDetail } from '@/types/domain';
import { CaseOutcome, CheckStatus, CheckOutcome } from '@/types/enums';

/**
 * Case readiness assessment for QA review
 */
export interface CaseReadiness {
  isReady: boolean;
  totalChecks: number;
  completedChecks: number;
  incompleteChecks: { id: string; check_type: string; status: string }[];
  hasFailedChecks: boolean;
  hasAdverseFindings: boolean;
  checkSummary: CheckSummaryItem[];
  suggestedOutcome: CaseOutcome | null;
}

/**
 * Individual check summary for readiness assessment
 */
export interface CheckSummaryItem {
  check_type: string;
  status: string;
  outcome: string | null;
  is_required: boolean;
}

/**
 * Audit log entry for case decisions
 */
export interface AdjudicationEntry {
  id: string;
  action: string;
  actor_id: string;
  actor_email: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Internal case note
 */
export interface CaseNote {
  id: string;
  case_id: string;
  content: string;
  created_by: string;
  created_by_name: string | null;
  is_internal: boolean;
  created_at: string;
}

/**
 * Terminal check statuses that indicate a check is complete
 */
const TERMINAL_STATUSES = [
  CheckStatus.Complete,
  CheckStatus.Passed,
  CheckStatus.Failed,
  CheckStatus.InsufficientEvidence,
  CheckStatus.NotApplicable,
];

/**
 * Determine case readiness for QA review
 *
 * Assesses whether all checks are in terminal states and produces
 * a suggested outcome based on check results.
 *
 * @param caseId - The case ID to assess
 * @returns Case readiness information
 */
export async function getCaseReadinessForReview(
  caseId: string
): Promise<CaseReadiness> {
  const supabase = await createClient();

  const { data: checks, error: checksError } = await supabase
    .from('case_checks')
    .select('id, check_type, status, outcome, is_required')
    .eq('case_id', caseId)
    .order('created_at', { ascending: true });

  if (checksError) {
    throw new Error(
      `Failed to fetch case checks: ${checksError.message}`
    );
  }

  const caseChecks = (checks || []) as CaseCheckDetail[];
  const totalChecks = caseChecks.length;

  // Identify incomplete checks
  const incompleteChecks = caseChecks
    .filter((check) => !TERMINAL_STATUSES.includes(check.status as CheckStatus))
    .map((check) => ({
      id: check.id,
      check_type: check.check_type,
      status: check.status,
    }));

  const completedChecks = totalChecks - incompleteChecks.length;
  const isReady = incompleteChecks.length === 0;

  // Identify adverse findings and failed checks
  const hasFailedChecks = caseChecks.some(
    (check) => check.status === CheckStatus.Failed
  );
  const hasAdverseFindings = caseChecks.some(
    (check) => check.outcome === CheckOutcome.Adverse
  );

  // Build check summary
  const checkSummary: CheckSummaryItem[] = caseChecks.map((check) => ({
    check_type: check.check_type,
    status: check.status,
    outcome: check.outcome || null,
    is_required: check.is_required,
  }));

  // Suggest outcome based on check results
  let suggestedOutcome: CaseOutcome | null = null;

  if (isReady) {
    // Priority: Failed checks take precedence
    if (hasFailedChecks) {
      suggestedOutcome = CaseOutcome.Failed;
    }
    // Then: Insufficient evidence
    else if (
      caseChecks.some(
        (check) => check.status === CheckStatus.InsufficientEvidence
      )
    ) {
      suggestedOutcome = CaseOutcome.InsufficientEvidence;
    }
    // Then: Adverse findings but no failed checks
    else if (hasAdverseFindings) {
      suggestedOutcome = CaseOutcome.ClearWithAdvisory;
    }
    // Finally: All clear/passed/not applicable
    else if (
      caseChecks.every(
        (check) =>
          check.status === CheckStatus.Passed ||
          check.status === CheckStatus.Complete ||
          check.status === CheckStatus.NotApplicable ||
          check.outcome === CheckOutcome.Clear ||
          check.outcome === CheckOutcome.NotApplicable
      )
    ) {
      suggestedOutcome = CaseOutcome.Clear;
    }
  }

  return {
    isReady,
    totalChecks,
    completedChecks,
    incompleteChecks,
    hasFailedChecks,
    hasAdverseFindings,
    checkSummary,
    suggestedOutcome,
  };
}

/**
 * Move a case to under_review status
 *
 * Transitions case from in_progress to under_review for QA adjudication.
 *
 * @param caseId - The case ID to move to review
 * @param actorId - The user ID performing the action
 * @throws Error if transition fails
 */
export async function moveCaseToReview(
  caseId: string,
  actorId: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('transition_case_status', {
    p_case_id: caseId,
    p_new_status: 'under_review',
    p_actor_id: actorId,
    p_notes: null,
  });

  if (error) {
    throw new Error(
      `Failed to move case to review: ${error.message}`
    );
  }
}

/**
 * Adjudicate a case with a final outcome
 *
 * Records the final case outcome after QA review. Case must be in
 * under_review status and all checks must be in terminal states.
 *
 * @param caseId - The case ID to adjudicate
 * @param outcome - The final outcome decision
 * @param reviewerId - The reviewer's user ID
 * @param notes - Optional adjudication notes
 * @throws Error if case is not ready for adjudication
 */
export async function adjudicateCase(
  caseId: string,
  outcome: CaseOutcome,
  reviewerId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('adjudicate_case', {
    p_case_id: caseId,
    p_outcome: outcome,
    p_reviewer_id: reviewerId,
    p_notes: notes ?? null,
  });

  if (error) {
    throw new Error(
      `Failed to adjudicate case: ${error.message}`
    );
  }
}

/**
 * Reopen a case for further investigation
 *
 * Transitions case from under_review back to in_progress when the
 * reviewer identifies issues that need additional work.
 *
 * @param caseId - The case ID to reopen
 * @param actorId - The user ID performing the action
 * @param notes - Optional reason for reopening
 * @throws Error if reopening fails
 */
export async function reopenCase(
  caseId: string,
  actorId: string,
  notes?: string
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc('transition_case_status', {
    p_case_id: caseId,
    p_new_status: 'in_progress',
    p_actor_id: actorId,
    p_notes: notes ?? null,
  });

  if (error) {
    throw new Error(
      `Failed to reopen case: ${error.message}`
    );
  }
}

/**
 * Fetch the adjudication history for a case
 *
 * Retrieves all adjudication-related actions from the audit log,
 * including status changes, adjudications, and reopenings.
 *
 * @param caseId - The case ID
 * @returns Ordered list of adjudication entries (most recent first)
 */
export async function getAdjudicationHistory(
  caseId: string
): Promise<AdjudicationEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      'id, action, actor_id, actor_email, metadata, created_at'
    )
    .eq('entity_id', caseId)
    .in('action', [
      'case.adjudicated',
      'case.status_changed',
      'case.reopened',
    ])
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch adjudication history: ${error.message}`
    );
  }

  return (data || []) as AdjudicationEntry[];
}

/**
 * Fetch all notes for a case
 *
 * Retrieves internal and external notes in chronological order.
 *
 * @param caseId - The case ID
 * @returns List of case notes (most recent first)
 */
export async function getCaseNotes(
  caseId: string
): Promise<CaseNote[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notes')
    .select(
      'id, case_id, content, created_by, created_by_name, is_internal, created_at'
    )
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Failed to fetch case notes: ${error.message}`
    );
  }

  return (data || []) as CaseNote[];
}

/**
 * Add a note to a case
 *
 * Creates a new internal or external note attached to a case.
 *
 * @param caseId - The case ID
 * @param content - The note content
 * @param createdBy - The user ID creating the note
 * @param isInternal - Whether this is an internal-only note
 * @returns The ID of the created note
 * @throws Error if note creation fails
 */
export async function addCaseNote(
  caseId: string,
  content: string,
  createdBy: string,
  isInternal: boolean
): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('notes')
    .insert({
      case_id: caseId,
      content,
      created_by: createdBy,
      is_internal: isInternal,
    })
    .select('id');

  if (error) {
    throw new Error(
      `Failed to create case note: ${error.message}`
    );
  }

  if (!data || data.length === 0) {
    throw new Error('Failed to create case note: no data returned');
  }

  return data[0].id as string;
}
