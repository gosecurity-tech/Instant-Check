import { createClient } from '@/lib/supabase/server';
import type { CaseCheckDetail, StatusHistoryEntry } from '@/types/domain';
import { CheckStatus, CheckOutcome } from '@/types/enums';

/**
 * List all checks for a given case
 */
export async function listChecksForCase(
  caseId: string,
): Promise<CaseCheckDetail[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('case_checks')
    .select('*')
    .eq('case_id', caseId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(
      `Failed to list checks for case ${caseId}: ${error.message}`,
    );
  }

  return (data as CaseCheckDetail[]) || [];
}

/**
 * Get a single check by ID with full details
 */
export async function getCheckById(
  checkId: string,
): Promise<CaseCheckDetail | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('case_checks')
    .select('*')
    .eq('id', checkId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch check ${checkId}: ${error.message}`);
  }

  return data as CaseCheckDetail;
}

/**
 * Transition a check to a new status using the RPC function
 */
export async function transitionCheckStatus(
  checkId: string,
  newStatus: CheckStatus,
  notes?: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Failed to get current user');
  }

  const { error } = await supabase.rpc('transition_check_status', {
    p_check_id: checkId,
    p_new_status: newStatus,
    p_actor_id: userData.user.id,
    p_notes: notes || null,
  });

  if (error) {
    throw new Error(
      `Failed to transition check ${checkId} to ${newStatus}: ${error.message}`,
    );
  }
}

/**
 * Set the outcome for a check
 */
export async function setCheckOutcome(
  checkId: string,
  outcome: CheckOutcome,
  notes?: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('case_checks')
    .update({
      outcome,
      notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checkId);

  if (error) {
    throw new Error(
      `Failed to set outcome for check ${checkId}: ${error.message}`,
    );
  }
}

/**
 * Get the complete status history for a check
 */
export async function getCheckStatusHistory(
  checkId: string,
): Promise<StatusHistoryEntry[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('check_status_history')
    .select('*')
    .eq('case_check_id', checkId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(
      `Failed to fetch status history for check ${checkId}: ${error.message}`,
    );
  }

  return (data as StatusHistoryEntry[]) || [];
}

/**
 * Assign a check to a specific user
 */
export async function assignCheck(
  checkId: string,
  assignedTo: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('case_checks')
    .update({
      assigned_to: assignedTo,
      updated_at: new Date().toISOString(),
    })
    .eq('id', checkId);

  if (error) {
    throw new Error(
      `Failed to assign check ${checkId} to ${assignedTo}: ${error.message}`,
    );
  }
}

/**
 * Bulk transition multiple checks from one status to another for a case
 */
export async function bulkTransitionChecks(
  caseId: string,
  fromStatus: CheckStatus,
  toStatus: CheckStatus,
): Promise<number> {
  const supabase = await createClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new Error('Failed to get current user');
  }

  // First, get all checks matching the criteria
  const { data: checks, error: fetchError } = await supabase
    .from('case_checks')
    .select('id')
    .eq('case_id', caseId)
    .eq('status', fromStatus);

  if (fetchError) {
    throw new Error(
      `Failed to fetch checks for bulk transition: ${fetchError.message}`,
    );
  }

  if (!checks || checks.length === 0) {
    return 0;
  }

  // Transition each check
  let successCount = 0;
  const errors: string[] = [];

  for (const check of checks) {
    const { error: transitionError } = await supabase.rpc(
      'transition_check_status',
      {
        p_check_id: check.id,
        p_new_status: toStatus,
        p_actor_id: userData.user.id,
        p_notes: null,
      },
    );

    if (transitionError) {
      errors.push(
        `Check ${check.id}: ${transitionError.message}`,
      );
    } else {
      successCount++;
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Bulk transition completed with ${successCount} successes and ${errors.length} failures: ${errors.join('; ')}`,
    );
  }

  return successCount;
}
