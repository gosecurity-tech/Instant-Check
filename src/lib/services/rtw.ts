import { createClient } from '@/lib/supabase/server';
import type { RtwCheckSummary, RtwCheckDetail } from '@/types/domain';
import type { RtwCheckMethod, RtwStatus } from '@/types/enums';

// ============================================================
// Get RTW check for a case
// ============================================================

export async function getRtwCheckForCase(
  caseId: string,
): Promise<RtwCheckSummary | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('right_to_work_checks')
    .select('*')
    .eq('case_id', caseId)
    .maybeSingle();

  if (error) {
    throw new Error(
      `Failed to fetch RTW check for case ${caseId}: ${error.message}`,
    );
  }

  return data as RtwCheckSummary | null;
}

// ============================================================
// Get RTW check by ID with candidate and reviewer details
// ============================================================

export async function getRtwCheckById(
  id: string,
): Promise<RtwCheckDetail | null> {
  const supabase = await createClient();

  // Fetch RTW check record
  const { data: rtwCheck, error: rtwError } = await supabase
    .from('right_to_work_checks')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (rtwError) {
    throw new Error(`Failed to fetch RTW check ${id}: ${rtwError.message}`);
  }

  if (!rtwCheck) {
    return null;
  }

  // Fetch candidate name
  let candidateName = '';
  if (rtwCheck.candidate_id) {
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('first_name, last_name')
      .eq('id', rtwCheck.candidate_id)
      .maybeSingle();

    if (!candidateError && candidate) {
      candidateName = `${candidate.first_name || ''} ${candidate.last_name || ''}`.trim();
    }
  }

  // Fetch reviewer name
  let reviewerName: string | null = null;
  if (rtwCheck.reviewed_by) {
    const { data: reviewer, error: reviewerError } = await supabase
      .from('internal_users')
      .select('first_name, last_name')
      .eq('id', rtwCheck.reviewed_by)
      .maybeSingle();

    if (!reviewerError && reviewer) {
      reviewerName = `${reviewer.first_name || ''} ${reviewer.last_name || ''}`.trim() || null;
    }
  }

  return {
    ...(rtwCheck as RtwCheckSummary),
    candidate_name: candidateName,
    reviewer_name: reviewerName,
  };
}

// ============================================================
// Create a new RTW check
// ============================================================

export async function createRtwCheck(data: {
  caseId: string;
  checkId: string;
  candidateId: string;
  organisationId: string;
  checkMethod: RtwCheckMethod;
}): Promise<string> {
  const supabase = await createClient();

  const { data: result, error } = await supabase
    .from('right_to_work_checks')
    .insert({
      case_id: data.caseId,
      check_id: data.checkId,
      candidate_id: data.candidateId,
      organisation_id: data.organisationId,
      check_method: data.checkMethod,
      status: 'not_started',
      verified: false,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create RTW check: ${error.message}`);
  }

  return (result as { id: string }).id;
}

// ============================================================
// Update RTW check fields (partial update)
// ============================================================

export async function updateRtwCheck(
  id: string,
  data: Partial<{
    checkMethod: RtwCheckMethod;
    documentType: string;
    documentReference: string;
    shareCode: string;
    expiryDate: string;
    hasTimeLimit: boolean;
    timeLimitEnd: string;
  }>,
): Promise<void> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  // Map camelCase to snake_case
  if (data.checkMethod !== undefined) {
    updatePayload.check_method = data.checkMethod;
  }
  if (data.documentType !== undefined) {
    updatePayload.document_type = data.documentType;
  }
  if (data.documentReference !== undefined) {
    updatePayload.document_reference = data.documentReference;
  }
  if (data.shareCode !== undefined) {
    updatePayload.share_code = data.shareCode;
  }
  if (data.expiryDate !== undefined) {
    updatePayload.expiry_date = data.expiryDate;
  }
  if (data.hasTimeLimit !== undefined) {
    updatePayload.has_time_limit = data.hasTimeLimit;
  }
  if (data.timeLimitEnd !== undefined) {
    updatePayload.time_limit_end = data.timeLimitEnd;
  }

  const { error } = await supabase
    .from('right_to_work_checks')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to update RTW check ${id}: ${error.message}`);
  }
}

// ============================================================
// Submit RTW document
// ============================================================

export async function submitRtwDocument(
  id: string,
  data: {
    documentType: string;
    documentReference: string;
    expiryDate?: string;
  },
): Promise<void> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    document_type: data.documentType,
    document_reference: data.documentReference,
    status: 'document_submitted',
    updated_at: new Date().toISOString(),
  };

  if (data.expiryDate) {
    updatePayload.expiry_date = data.expiryDate;
  }

  const { error } = await supabase
    .from('right_to_work_checks')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to submit RTW document for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Submit share code for RTW check
// ============================================================

export async function submitShareCode(
  id: string,
  shareCode: string,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      share_code: shareCode,
      status: 'document_submitted',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to submit share code for RTW check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Start RTW review
// ============================================================

export async function startRtwReview(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      status: 'under_review',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to start RTW review for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Complete RTW review
// ============================================================

export async function completeRtwReview(
  id: string,
  data: {
    reviewedBy: string;
    reviewNotes?: string;
    verified: boolean;
    hasTimeLimit?: boolean;
    timeLimitEnd?: string;
  },
): Promise<void> {
  const supabase = await createClient();

  const updatePayload: Record<string, unknown> = {
    reviewed_by: data.reviewedBy,
    reviewed_at: new Date().toISOString(),
    verified: data.verified,
    status: data.verified ? 'verified' : 'failed',
    updated_at: new Date().toISOString(),
  };

  if (data.reviewNotes !== undefined) {
    updatePayload.review_notes = data.reviewNotes;
  }

  if (data.hasTimeLimit !== undefined) {
    updatePayload.has_time_limit = data.hasTimeLimit;
  }

  if (data.timeLimitEnd !== undefined) {
    updatePayload.time_limit_end = data.timeLimitEnd;
  }

  const { error } = await supabase
    .from('right_to_work_checks')
    .update(updatePayload)
    .eq('id', id);

  if (error) {
    throw new Error(
      `Failed to complete RTW review for check ${id}: ${error.message}`,
    );
  }
}

// ============================================================
// Mark RTW check as expired
// ============================================================

export async function markRtwExpired(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('right_to_work_checks')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) {
    throw new Error(`Failed to mark RTW check ${id} as expired: ${error.message}`);
  }
}

// ============================================================
// List RTW checks for an organisation
// ============================================================

export async function listRtwChecksForOrg(
  organisationId: string,
  filters?: { status?: RtwStatus },
): Promise<RtwCheckSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from('right_to_work_checks')
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
      `Failed to list RTW checks for organisation ${organisationId}: ${error.message}`,
    );
  }

  return (data as RtwCheckSummary[]) || [];
}

// ============================================================
// Get RTW statistics for a case
// ============================================================

export async function getRtwStats(
  caseId: string,
): Promise<{
  total: number;
  verified: number;
  failed: number;
  pending: number;
  expired: number;
}> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('right_to_work_checks')
    .select('status')
    .eq('case_id', caseId);

  if (error) {
    throw new Error(
      `Failed to fetch RTW stats for case ${caseId}: ${error.message}`,
    );
  }

  const checks = (data as Array<{ status: RtwStatus }>) || [];
  const stats = {
    total: checks.length,
    verified: 0,
    failed: 0,
    pending: 0,
    expired: 0,
  };

  for (const check of checks) {
    if (check.status === 'verified') {
      stats.verified++;
    } else if (check.status === 'failed') {
      stats.failed++;
    } else if (check.status === 'expired') {
      stats.expired++;
    } else {
      stats.pending++;
    }
  }

  return stats;
}
