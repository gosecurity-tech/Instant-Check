import { createClient } from '@/lib/supabase/server';
import type { DbsCheckSummary, DbsCheckDetail } from '@/types/domain';
import type { DbsStatus } from '@/types/enums';

// ============================================================
// Get DBS check for a case
// ============================================================

export async function getDbsCheckForCase(
  caseId: string,
): Promise<DbsCheckSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dbs_checks')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch DBS check for case ${caseId}: ${error.message}`,
    );
  }

  return data as DbsCheckSummary | null;
}

// ============================================================
// Get DBS check by ID with candidate and reviewer details
// ============================================================

export async function getDbsCheckById(
  id: string,
): Promise<DbsCheckDetail | null> {
  const supabase = await createClient();

  // Fetch DBS check record
  const { data: dbsCheck, error: dbsError } = await supabase
    .from('dbs_checks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (dbsError) {
    throw new Error(`Failed to fetch DBS check ${id}: ${dbsError.message}`);
  }

  if (!dbsCheck) {
    return null;
  }

  // Fetch candidate name
  let candidateName = '';
  if (dbsCheck.candidate_id) {
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('first_name, last_name')
      .eq('id', dbsCheck.candidate_id)
      .maybeSingle();

    if (!candidateError && candidate) {
      candidateName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
    }
  }

  // Fetch reviewer name
  let reviewerName: string | null = null;
  if (dbsCheck.reviewed_by) {
    const { data: reviewer, error: reviewerError } = await supabase
      .from('internal_users')
      .select('first_name, last_name')
      .eq('id', dbsCheck.reviewed_by)
      .maybeSingle();

    if (!reviewerError && reviewer) {
      reviewerName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || null;
    }
  }

  return {
    ...(dbsCheck as DbsCheckSummary),
    candidate_name: candidateName,
    reviewer_name: reviewerName,
  };
}

// ============================================================
// Create a new DBS check
// ============================================================

export async function createDbsCheck(data: {
  caseId: string;
  checkId: string;
  candidateId: string;
  organisationId: string;
  dbsType: string;
}): Promise<string> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('dbs_checks')
    .insert({
      case_id: data.caseId,
      check_id: data.checkId,
      candidate_id: data.candidateId,
      organisation_id: data.organisationId,
      dbs_type: data.dbsType,
      status: 'not_started',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create DBS check: ${error.message}`);
  }

  return (result as { id: string }).id;
}

// ============================================================
// Submit DBS application
// ============================================================

export async function submitDbsApplication(
  id: string,
  applicationReference: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dbs_checks')
    .update({
      application_reference: applicationReference,
      status: 'application_submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to submit DBS application for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Verify DBS ID
// ============================================================

export async function verifyDbsId(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dbs_checks')
    .update({
      status: 'id_verified',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to verify DBS ID for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Mark DBS as sent to DBS service
// ============================================================

export async function markSentToDbs(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dbs_checks')
    .update({
      status: 'sent_to_dbs',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to mark DBS check ${id} as sent: ${error.message}`,
    );
  }
}

// ============================================================
// Record DBS received from service
// ============================================================

export async function recordDbsReceived(
  id: string,
  data: {
    certificateNumber: string;
    certificateDate: string;
    hasAdverse: boolean;
    adverseDetails?: string;
  },
): Promise<void> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    certificate_number: data.certificateNumber,
    certificate_date: data.certificateDate,
    has_adverse: data.hasAdverse,
    status: 'received',
    updated_at: new Date().toISOString(),
  };

  if (data.adverseDetails !== undefined) {
    updatePayload.adverse_details = data.adverseDetails;
  }

  const { error } = await supabase
    .from('dbs_checks')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to record DBS received for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Complete DBS review
// ============================================================

export async function completeDbsReview(
  id: string,
  data: {
    reviewedBy: string;
    reviewNotes?: string;
    clear: boolean;
  },
): Promise<void> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    reviewed_by: data.reviewedBy,
    reviewed_at: new Date().toISOString(),
    status: data.clear ? 'clear' : 'adverse',
    updated_at: new Date().toISOString(),
  };

  if (data.reviewNotes !== undefined) {
    updatePayload.review_notes = data.reviewNotes;
  }

  const { error } = await supabase
    .from('dbs_checks')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to complete DBS review for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Dispute DBS result
// ============================================================

export async function disputeDbsResult(id: string, notes: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('dbs_checks')
    .update({
      status: 'disputed',
      review_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to dispute DBS result for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// List DBS checks for an organisation
// ============================================================

export async function listDbsChecksForOrg(
  organisationId: string,
  filters?: { status?: DbsStatus },
): Promise<DbsCheckSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('dbs_checks')
    .select('*')
    .eq('organisation_id', organisationId);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query.order('created_at', {
    ascending: false,
  });

  if (error) {
    throw new Error(
      `Failed to list DBS checks for organisation ${organisationId}: ${error.message}`,
    );
  }

  return (data as DbsCheckSummary[]) || [];
}

// ============================================================
// Get DBS statistics for a case
// ============================================================

export async function getDbsStats(
  caseId: string,
): Promise<{
  total: number;
  clear: number;
  adverse: number;
  pending: number;
  disputed: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('dbs_checks')
    .select('status')
    .eq('case_id', caseId);

  if (error) {
    throw new Error(
      `Failed to fetch DBS stats for case ${caseId}: ${error.message}`,
    );
  }

  const checks = (data as Array<{ status: DbsStatus }>) || [];
  const stats = {
    total: checks.length,
    clear: 0,
    adverse: 0,
    pending: 0,
    disputed: 0,
  };

  for (const check of checks) {
    if (check.status === 'clear') {
      stats.clear++;
    } else if (check.status === 'adverse') {
      stats.adverse++;
    } else if (check.status === 'disputed') {
      stats.disputed++;
    } else {
      stats.pending++;
    }
  }

  return stats;
}
